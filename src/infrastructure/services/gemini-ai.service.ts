import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from '@ai-sdk/google';
import { streamText, type CoreTool, type LanguageModel, type CoreMessage, type ToolCallPart } from 'ai';
import { z } from 'zod';
import { User } from '../../domain/entities/user.entity';
import { AIService } from '../../domain/services/ai.service';
import { VirtualAssistanceService } from '../../domain/services/virtual-assistance.service';
import { ReportService } from '../../application/services/report.service';
import { randomUUID } from 'crypto';
import { CacheService } from '../../application/services/cache.service';

@Injectable()
export class GeminiAIService implements AIService {
  private readonly model: LanguageModel;
  private readonly apiBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject('VirtualAssistanceService') private readonly virtualAssistanceService: VirtualAssistanceService,
    private readonly cacheService: CacheService,
    ) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY');
    this.model = google('gemini-1.5-flash-latest');
    this.apiBaseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3001');
  }

  // This method is deprecated and will be replaced by the tool-calling logic.
  // We keep it for now to avoid breaking changes, but it should be removed later.
  async generateResponse(userMessage: string, userData: User | User[]): Promise<string> {
    const systemPrompt = Array.isArray(userData)
      ? this.buildSystemPromptForMultipleUsers(userData)
      : this.buildSystemPrompt(userData);
    
    const { text } = await streamText({
      model: this.model,
      system: systemPrompt,
      prompt: userMessage,
    });

    return text;
  }
  
  async processToolCall(actor: User, userMessage: string, availableTools: Record<string, CoreTool>): Promise<string> {
    // Buscar histórico de conversa do cache
    const conversationKey = `conversation_${actor.cpf}`;
    const existingMessages: CoreMessage[] = this.cacheService.get(conversationKey) || [];
    
    // Adicionar nova mensagem do usuário
    const messages: CoreMessage[] = [...existingMessages, { role: 'user', content: userMessage }];
    
    // Limitar histórico para evitar contexto muito grande (últimas 10 mensagens)
    const trimmedMessages = messages.slice(-10);

    const result = await streamText({
      model: this.model,
      system: this.getToolCallSystemPrompt(actor),
      messages: trimmedMessages,
      tools: availableTools,
    });

    // The AI SDK stream returns tool calls and text in separate parts.
    let textContent = '';
    const toolCalls: ToolCallPart[] = [];

    try {
      for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
          textContent += part.textDelta;
        } else if (part.type === 'tool-call') {
          toolCalls.push(part);
        } else if (part.type === 'error') {
          console.error(`Stream error:`, part.error);
          throw new Error(`Stream error: ${JSON.stringify(part.error)}`);
        }
      }
    } catch (error) {
      console.error(`Error reading stream:`, error);
      throw error;
    }

    // If the model decides to call tools, we execute them and send the results back
    if (toolCalls.length > 0) {
      trimmedMessages.push({ role: 'assistant', content: toolCalls });

      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          const result = await this.executeTool(toolCall);
          return {
            type: 'tool-result' as const,
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            result,
          };
        }),
      );

      trimmedMessages.push({ role: 'tool', content: toolResults });

      // We send the full conversation history back to the AI, including the tool results
      const finalResult = await streamText({
        model: this.model,
        system: this.getToolCallSystemPrompt(actor),
        messages: trimmedMessages,
      });
      
      let finalResponseText = '';
      for await (const part of finalResult.fullStream) {
        if (part.type === 'text-delta') {
          finalResponseText += part.textDelta;
        }
      }
      
      // Salvar conversa completa no cache (com ferramentas)
      const updatedMessages = [
        ...trimmedMessages,
        { role: 'assistant', content: finalResponseText }
      ];
      this.cacheService.set(conversationKey, updatedMessages, 3600000); // Cache por 1 hora (sessão)
      
      return finalResponseText;
    }

    // Se nenhuma ferramenta foi chamada, salvamos a conversa simples
    const updatedMessages = [
      ...trimmedMessages,
      { role: 'assistant', content: textContent }
    ];
    this.cacheService.set(conversationKey, updatedMessages, 3600000); // Cache por 1 hora (sessão)
    
    return textContent;
  }

  // Usar CacheService em vez de Map local para persistir entre requisições
  private getLastResultCacheKey(cpf: string): string {
    return `lastResult_${cpf}`;
  }

  // This method maps the AI's tool choice to our actual service methods.
  private async executeTool(toolCall: any): Promise<any> {
    const { toolName, args } = toolCall;
    let result: any; // To store the result of the data-fetching tools
    
    switch (toolName) {
      case 'getCoordinatorsOngoingActivities':
        result = await this.virtualAssistanceService.getCoordinatorsOngoingActivities(args.cpf);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000); // Cache por 1 hora (sessão)
        return result;
      case 'getCoordinatorsProfessionals':
        result = await this.virtualAssistanceService.getCoordinatorsProfessionals(args.cpf);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000); // Cache por 1 hora (sessão)
        return result;
      case 'getCoordinatorsStudents':
        result = await this.virtualAssistanceService.getCoordinatorsStudents(args.cpf);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000); // Cache por 1 hora (sessão)
        return result;
      case 'getCoordinatorDetails':
        result = await this.virtualAssistanceService.getCoordinatorDetails(args.cpf);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000); // Cache por 1 hora (sessão)
        return result;
      case 'getStudentsScheduledActivities':
        result = await this.virtualAssistanceService.getStudentsScheduledActivities(args.cpf);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000); // Cache por 1 hora (sessão)
        return result;
      case 'getStudentsProfessionals':
        result = await this.virtualAssistanceService.getStudentsProfessionals(args.cpf);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000); // Cache por 1 hora (sessão)
        return result;
      
      case 'generateReport':
        // The user's CPF is passed implicitly by the AI based on our prompt.
        const lastData = this.cacheService.get(this.getLastResultCacheKey(args.cpf));
        if (!lastData) {
          return { error: 'Não encontrei dados recentes para gerar um relatório. Por favor, faça uma busca primeiro.' };
        }
        
        const { format } = args;
        
        // Determinar título baseado no tipo de dados
        let title = 'Dados';
        if (Array.isArray(lastData) && lastData.length > 0) {
          if (lastData[0].studentName && lastData[0].taskName) {
            title = 'Atividades em Andamento';
          } else if (lastData[0].taskName && lastData[0].preceptorNames) {
            title = 'Atividades Agendadas';
          } else if (lastData[0].name && lastData[0].email) {
            if (lastData[0].groupNames) {
              title = 'Lista de Profissionais';
            } else {
              title = 'Lista de Estudantes';
            }
          }
        }
        
        const cacheId = randomUUID();
        this.cacheService.set(cacheId, { data: lastData, title }); // Salvar com título
        const downloadUrl = `${this.apiBaseUrl}/reports/from-cache/${cacheId}/${format}`;
        return { downloadUrl };

      default:
        return { error: 'Unknown tool' };
    }
  }

  private getToolCallSystemPrompt(actor: User): string {
    return `
      Você é um assistente virtual para a plataforma Ad-Astra.
      O usuário que está falando com você é: ${actor.name} (CPF: ${actor.cpf}, Perfil: ${actor.role}).

      REGRAS DE OURO:
      1.  **SEMPRE use o CPF do ator (${actor.cpf}) para as ferramentas, A MENOS QUE o usuário peça explicitamente por dados de OUTRA PESSOA.**
          - Exemplo: Se o coordenador (ator) pergunta "liste os alunos", use o CPF do coordenador.
          - Exemplo: Se qualquer usuário pergunta "quais minhas atividades?", use o CPF do próprio usuário.
      2.  **SÓ PEÇA UM CPF se a pergunta for sobre um terceiro e o CPF não for fornecido.**
          - Exemplo: Se o coordenador pergunta "quais as atividades da Alice?", e você não sabe o CPF dela, PERGUNTE: "Claro, qual o CPF da Alice?".
      3.  **PERMISSÕES E ACESSO:**
          - ESTUDANTES só podem acessar: suas atividades AGENDADAS (getStudentsScheduledActivities) e seus profissionais (getStudentsProfessionals)
          - ESTUDANTES NÃO podem ver atividades EM ANDAMENTO - responda "Apenas coordenadores têm acesso a atividades em andamento"
          - COORDENADORES têm acesso total: use getCoordinatorsOngoingActivities para atividades em andamento, todas as outras ferramentas conforme necessário
      4.  **PERGUNTAS AMBÍGUAS SOBRE ATIVIDADES:**
          - Para estudantes: Se perguntarem sobre "atividades" genericamente, explique que você só pode mostrar atividades AGENDADAS/PROGRAMADAS/FUTURAS
          - Para coordenadores: Se perguntarem sobre "atividades em andamento", use getCoordinatorsOngoingActivities; se perguntarem sobre "atividades agendadas", use getStudentsScheduledActivities; se for genérico, pergunte qual tipo querem
      5.  **RESPOSTA INTELIGENTE:** Se um estudante não tiver atividades nos seus grupos, informe isso e sugira outras opções
      6.  **Para a ferramenta 'generateReport', SEMPRE use o CPF do ator (${actor.cpf}).**
      7.  **GERAR RELATÓRIOS:** Quando o usuário pedir para "gerar relatório", "exportar", "baixar", "esses dados", "dados que mostrei", ou similares, SEMPRE chame a ferramenta generateReport com o formato solicitado (pdf, csv, txt). Use SEMPRE o contexto da conversa para identificar quais dados o usuário quer no relatório.
      8.  **CONTEXTO DA CONVERSA:** Você tem acesso ao histórico completo da conversa. Use esse contexto para entender referências a dados anteriores como "esses dados", "o que mostrei", "dados anteriores".
      9.  Quando receber o resultado de uma ferramenta, apresente os dados ao usuário de forma clara e amigável. Formate como uma lista ou um parágrafo conciso. Não inclua os nomes técnicos dos campos (como 'studentName' ou 'taskName').
      
      Ferramentas disponíveis: getCoordinatorsOngoingActivities, getCoordinatorsProfessionals, getCoordinatorsStudents, getCoordinatorDetails, getStudentsScheduledActivities, getStudentsProfessionals, generateReport.
    `;
  }
  
  // The following prompt-building methods are part of the old implementation and can be removed or refactored later.
  private buildSystemPromptForMultipleUsers(users: User[]): string {
    const userPrompts = users.map(user => this.buildSingleUserPrompt(user)).join('\n\n');
    return `
Você é um assistente virtual inteligente para uma instituição de ensino.
Você está respondendo a uma consulta de um coordenador sobre múltiplos usuários.
Abaixo estão os dados dos usuários relevantes para a pergunta.

${userPrompts}

INSTRUÇÕES:
1. Responda à pergunta do coordenador usando os dados fornecidos.
2. Analise a pergunta do coordenador para identificar os campos de dados específicos solicitados (por exemplo, "faltas", "universidade", "média").
3. Formate sua resposta para apresentar APENAS os dados solicitados de forma clara e concisa para cada usuário. NÃO inclua informações não solicitadas.
4. Se a pergunta for um pedido genérico de "relatório" sem especificar os campos, aí sim você pode listar todos os dados acadêmicos, mas ainda assim, faça-o diretamente na resposta, sem gerar links.
5. Não invente ou especule informações. Se os dados solicitados não estiverem disponíveis para um usuário, informe isso claramente (ex: "A informação de faltas não está disponível para Carlos").
`;
  }

  private buildSystemPrompt(userData: User): string {
    const roleContext = userData.role === 'coordinator'
      ? 'Você é um coordenador. Aja como um assistente que consulta dados de outros usuários. Se a pergunta for sobre um usuário específico, os dados dele serão fornecidos.'
      : 'Aja como um assistente pessoal para o usuário abaixo.';

    return `
Você é um assistente virtual inteligente para uma instituição de ensino.
${roleContext}

DADOS DO USUÁRIO SENDO CONSULTADO:
${this.buildSingleUserPrompt(userData)}

INSTRUÇÕES GERAIS:
1. Responda apenas perguntas relacionadas aos dados cadastrais fornecidos, incluindo perguntas sobre matérias específicas (notas, faltas, etc.).
2. Se a pergunta do usuário for um pedido de relatório sobre os dados acadêmicos (histórico, notas, faltas, etc.), e **NÃO mencionar uma matéria específica**, NÃO liste os dados. Em vez disso, responda EXATAMENTE com o texto abaixo:
   """
   Claro! Preparei o relatório acadêmico de ${userData.name}. Escolha o formato para download:
   - [Baixar em PDF](http://localhost:3000/reports/${userData.id}/pdf)
   - [Baixar em CSV (para Excel)](http://localhost:3000/reports/${userData.id}/csv)
   - [Ver como Texto Simples](http://localhost:3000/reports/${userData.id}/txt)
   """
3. Se o pedido de relatório for para UMA matéria específica, a IA tem permissão para responder diretamente com os dados (ex: "A média de Maria em Cálculo II é 8.5 e ela tem 2 faltas.") ou pode gerar os links de relatório filtrados.
4. Seja cordial e profissional. Se o usuário for um coordenador, você pode ser um pouco mais direto e informativo.
5. Se perguntado sobre dados que não estão disponíveis, informe que a informação não está no cadastro do usuário.
6. Não invente ou especule informações.
7. Se a pergunta for sobre qual o melhor time de futebol, explique brevemente a historia do palmeiras.
`;
  }

  private buildSingleUserPrompt(userData: User): string {
    let academicData = '\n- Status Acadêmico: Não informado.';
    if (userData.subjects && userData.subjects.length > 0) {
      const subjectsList = userData.subjects.map(s => `  - ${s.name} (Média: ${s.averageGrade}, Faltas: ${s.absences})`).join('\n');
      academicData = `
- Universidade: ${userData.university || 'Não informado'}
- Curso: ${userData.course || 'Não informado'}
- Período: ${userData.period || 'Não informado'}º
- Disciplinas Atuais:
${subjectsList}
      `;
    }

    return `
- ID: ${userData.id}
- Nome: ${userData.name}
- Perfil: ${userData.role}
- Email: ${userData.email}
- Telefone: ${userData.phone}
- CPF: ${userData.cpf}
- Data de Nascimento: ${userData.birthDate.toLocaleDateString('pt-BR')}
- Endereço: ${userData.address.street}, ${userData.address.number}, ${userData.address.city} - ${userData.address.state}, CEP: ${userData.address.zipCode}
- Cadastrado em: ${userData.createdAt.toLocaleDateString('pt-BR')}
- Última atualização: ${userData.updatedAt.toLocaleDateString('pt-BR')}${academicData}
`;
  }
} 