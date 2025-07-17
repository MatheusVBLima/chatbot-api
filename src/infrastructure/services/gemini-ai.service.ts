import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { User } from '../../domain/entities/user.entity';
import { AIService } from '../../domain/services/ai.service';

@Injectable()
export class GeminiAIService implements AIService {
  private readonly model;

  constructor(private readonly configService: ConfigService) {
    // Set the API key as environment variable
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY');
    this.model = google('gemini-2.0-flash-exp');
  }

  async generateResponse(userMessage: string, userData: User | User[]): Promise<string> {
    try {
      const systemPrompt = Array.isArray(userData) 
        ? this.buildSystemPromptForMultipleUsers(userData)
        : this.buildSystemPrompt(userData);
      
      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: userMessage,
        temperature: 0.7,
        maxTokens: 500,
      });

      return text;
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error('Falha ao gerar resposta da IA');
    }
  }

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