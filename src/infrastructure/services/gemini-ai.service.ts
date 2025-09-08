import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from '@ai-sdk/google';
import { streamText, type CoreTool, type LanguageModel, type CoreMessage, type ToolCallPart } from 'ai';
import { z } from 'zod';
import { User } from '../../domain/entities/user.entity';
import { AIService } from '../../domain/services/ai.service';
import { VirtualAssistanceService } from '../../domain/services/virtual-assistance.service';
import { randomUUID } from 'crypto';
import { CacheService } from '../../application/services/cache.service';
import { PromptService } from './prompt.service';

@Injectable()
export class GeminiAIService implements AIService {
  private readonly model: LanguageModel;
  private readonly apiBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject('VirtualAssistanceService') private readonly virtualAssistanceService: VirtualAssistanceService,
    private readonly cacheService: CacheService,
    private readonly promptService: PromptService,
    ) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY');
    this.model = google('gemini-1.5-flash-latest');
    const configuredBaseUrl = this.configService.get<string>('API_BASE_URL');
    const renderExternalUrl = process.env.RENDER_EXTERNAL_URL;
    this.apiBaseUrl = configuredBaseUrl || renderExternalUrl || 'http://localhost:3001';
  }

  // Método mantido apenas para compatibilidade com process-api-chat-message.use-case.ts
  async generateResponse(userMessage: string, userData: User | User[]): Promise<string> {
    return "Este endpoint está descontinuado. Por favor, use o chat open (/chat/open) que possui todas as funcionalidades atualizadas.";
  }
  
  async processToolCall(actor: User, userMessage: string, availableTools: Record<string, CoreTool>): Promise<string> {
    console.log('[DEBUG] processToolCall called with:', actor.cpf, userMessage);
    // Buscar histórico de conversa do cache
    const conversationKey = `conversation_${actor.cpf}`;
    const existingMessages: CoreMessage[] = this.cacheService.get(conversationKey) || [];
    
    // Adicionar nova mensagem do usuário
    const messages: CoreMessage[] = [...existingMessages, { role: 'user', content: userMessage }];
    
    // Limitar histórico para evitar contexto muito grande (últimas 10 mensagens)
    const trimmedMessages = messages.slice(-10);

    // Debug: Log available tools
    console.log('[AI] Available tools:', Object.keys(availableTools));
    console.log('[AI] System prompt preview:', this.promptService.getSystemPrompt(actor).substring(0, 200) + '...');
    
    const result = await streamText({
      model: this.model,
      system: this.promptService.getSystemPrompt(actor),
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
          
          // Handle any unavailable tool error with standardized message
          if ((part.error as any)?.name === 'AI_NoSuchToolError') {
            return 'Desculpe, não posso te ajudar com essa questão. Posso ajudá-lo com informações sobre seus dados acadêmicos, atividades ou preceptores da plataforma RADE.';
          }
          
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
      let finalResponseText = '';
      try {
        const finalResult = await streamText({
          model: this.model,
          system: this.promptService.getSystemPrompt(actor),
          messages: trimmedMessages,
        });
        for await (const part of finalResult.fullStream) {
          if (part.type === 'text-delta') {
            finalResponseText += part.textDelta;
          } else if (part.type === 'error') {
            console.error('Final stream error:', part.error);
          }
        }
      } catch (err) {
        console.error('[AI] Error generating final response after tool results:', err);
      }
      // Fallback: if the model didn't produce any text, synthesize a concise human response from the tool results
      if (!finalResponseText || finalResponseText.trim().length === 0) {
        console.warn('[AI] Empty final response text after tool calls. Building fallback response.');
        finalResponseText = this.buildFallbackResponseFromToolResults(toolResults);
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

  // Build a concise human-friendly response from tool results when the model doesn't emit text
  private buildFallbackResponseFromToolResults(toolResults: Array<{ toolName: string; result: any }>): string {
    try {
      const lines: string[] = [];
      for (const tr of toolResults) {
        const name = tr.toolName;
        const result = tr.result;
        if (name === 'generateReport') {
          if (result && typeof result === 'object' && result.downloadUrl) {
            lines.push(`Relatório gerado. Link para download: ${result.downloadUrl}`);
          } else if (result && result.error) {
            lines.push(`Não foi possível gerar o relatório: ${result.error}`);
          }
          continue;
        }

        if (name === 'findPersonByName') {
          if (result && typeof result === 'object' && result.name) {
            lines.push(`Pessoa encontrada: ${result.name}`);
          } else if (result && result.error) {
            lines.push(`${result.error}`);
          }
          continue;
        }

        // Data-fetching tools
        if (Array.isArray(result)) {
          const count = result.length;
          const preview = this.previewArray(result);
          const label = this.labelForTool(name, count);
          lines.push(`${label}: ${count} encontrado(s).${preview ? `\n${preview}` : ''}`);
          continue;
        }

        if (result && typeof result === 'object') {
          const formatted = this.previewObject(result);
          const label = this.labelForTool(name, 1);
          lines.push(`${label}:\n${formatted}`);
          continue;
        }

        // Primitive or unknown
        if (result != null) {
          lines.push(String(result));
        }
      }

      if (lines.length === 0) {
        return 'Consegui obter os dados solicitados, mas não recebi um texto final da IA. Você pode pedir para eu gerar um relatório em PDF/CSV/TXT ou fazer outra pergunta.';
      }

      return lines.join('\n\n');
    } catch (err) {
      console.error('[AI] Error building fallback response:', err);
      return 'Consegui executar as ferramentas, mas não recebi um texto final da IA. Tente repetir a pergunta ou pedir um relatório.';
    }
  }

  private labelForTool(toolName: string, count: number): string {
    switch (toolName) {
      case 'getCoordinatorsOngoingActivities':
        return 'Atividades em andamento';
      case 'getCoordinatorsProfessionals':
        return 'Profissionais supervisionados';
      case 'getCoordinatorsStudents':
        return 'Estudantes supervisionados';
      case 'getCoordinatorDetails':
        return 'Detalhes do coordenador';
      case 'getStudentsScheduledActivities':
        return 'Suas atividades agendadas';
      case 'getStudentsProfessionals':
        return 'Seus preceptores';
      case 'findPersonByName':
        return 'Pessoa encontrada';
      default:
        return `Resultado (${toolName})`;
    }
  }

  private previewArray(items: any[], maxItems: number = 3): string {
    if (!items || items.length === 0) {
      return '';
    }
    const subset = items.slice(0, maxItems);
    const rendered = subset.map((item, idx) => `- ${this.previewObject(item)}`).join('\n');
    const more = items.length > maxItems ? `\n... e mais ${items.length - maxItems}.` : '';
    return `${rendered}${more}`;
  }

  private previewObject(obj: any): string {
    if (!obj || typeof obj !== 'object') {
      return String(obj);
    }
    // Try well-known shapes first
    if (obj.studentName && obj.taskName) {
      const date = new Date(obj.scheduledStartTo).toLocaleDateString('pt-BR');
      const startTime = new Date(obj.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(obj.scheduledEndTo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${obj.studentName} — ${obj.taskName} em ${obj.internshipLocationName} (${date}, ${startTime}-${endTime})`;
    }
    if (obj.taskName && obj.preceptorNames) {
      const date = new Date(obj.scheduledStartTo).toLocaleDateString('pt-BR');
      const startTime = new Date(obj.scheduledStartTo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(obj.scheduledEndTo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${obj.taskName} — ${obj.internshipLocationName} (${date}, ${startTime}-${endTime}); Preceptores: ${obj.preceptorNames.join(', ')}`;
    }
    if (obj.name && obj.email && obj.cpf) {
      const groups = obj.groupNames ? `; Grupos: ${obj.groupNames.join(', ')}` : '';
      return `${obj.name} (CPF: ${obj.cpf}); Email: ${obj.email}${groups}`;
    }
    // Generic compact rendering (first 4 keys)
    const entries = Object.entries(obj).slice(0, 4).map(([k, v]) => `${k}: ${v}`);
    return entries.join(' | ');
  }

  // Usar CacheService em vez de Map local para persistir entre requisições
  private getLastResultCacheKey(cpf: string): string {
    return `lastResult_${cpf}`;
  }

  private filterDataByFields(data: any, fieldsRequested: string): any {
    if (!data) return data;
    
    // Mapear campos solicitados para campos dos dados
    const fieldMapping: { [key: string]: string[] } = {
      'nome': ['studentName', 'coordinatorName', 'name'],
      'email': ['studentEmail', 'coordinatorEmail', 'email'],
      'telefone': ['studentPhone', 'coordinatorPhone', 'phone'],
      'grupos': ['groupNames'],
      'instituição': ['organizationsAndCourses'],
      'cursos': ['organizationsAndCourses'],
    };
    
    // Extrair campos solicitados da string
    const requestedLower = fieldsRequested.toLowerCase();
    const fieldsToInclude = new Set<string>();
    
    Object.entries(fieldMapping).forEach(([keyword, fields]) => {
      if (requestedLower.includes(keyword)) {
        fields.forEach(field => fieldsToInclude.add(field));
      }
    });
    
    // Se não conseguir mapear campos, retornar dados originais
    if (fieldsToInclude.size === 0) {
      return data;
    }
    
    // Filtrar dados
    if (Array.isArray(data)) {
      return data.map(item => this.filterSingleItem(item, fieldsToInclude));
    } else {
      return this.filterSingleItem(data, fieldsToInclude);
    }
  }
  
  private filterSingleItem(item: any, fieldsToInclude: Set<string>): any {
    const filteredItem: any = {};
    
    fieldsToInclude.forEach(field => {
      if (item.hasOwnProperty(field)) {
        filteredItem[field] = item[field];
      }
    });
    
    return filteredItem;
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
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000);
        return result;
      case 'getCoordinatorsStudents':
        result = await this.virtualAssistanceService.getCoordinatorsStudents(args.cpf);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000);
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
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000);
        return result;
        
      case 'getStudentInfo':
        result = await this.virtualAssistanceService.getStudentInfo(args.cpf);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000);
        return result;
      case 'getCoordinatorInfo':
        result = await this.virtualAssistanceService.getCoordinatorInfo(args.cpf);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000); // Cache por 1 hora (sessão)
        return result;
      
      case 'findPersonByName':
        const { name: searchName, cpf: searcherCpf } = args;
        let foundPerson: any = null;
        
        // Buscar em profissionais primeiro (mais comum)
        try {
          const professionals = await this.virtualAssistanceService.getStudentsProfessionals(searcherCpf);
          foundPerson = professionals.find(person => 
            person.name.toLowerCase().includes(searchName.toLowerCase())
          );
        } catch (error) {
          console.log('Erro ao buscar em profissionais:', error);
        }
        
        if (foundPerson) {
          this.cacheService.set(this.getLastResultCacheKey(searcherCpf), [foundPerson], 3600000);
          return foundPerson;
        } else {
          return { error: `Pessoa com nome "${searchName}" não encontrada.` };
        }

      case 'generateReport':
        const lastData = this.cacheService.get(this.getLastResultCacheKey(args.cpf));
        
        if (!lastData) {
          return { error: 'Não encontrei dados para gerar um relatório. Por favor, faça uma busca primeiro.' };
        }
        
        const { format, fieldsRequested } = args;
        
        // Filtrar dados se campos específicos foram solicitados
        let dataToReport = lastData;
        if (fieldsRequested) {
          dataToReport = this.filterDataByFields(lastData, fieldsRequested);
        }
        
        // Determinar título baseado no tipo de dados
        let title = fieldsRequested ? `Dados Solicitados` : 'Dados';
        if (Array.isArray(dataToReport) && dataToReport.length > 0) {
          if (dataToReport[0].studentName && dataToReport[0].taskName) {
            title = 'Atividades em Andamento';
          } else if (dataToReport[0].taskName && dataToReport[0].preceptorNames) {
            title = 'Atividades Agendadas';
          } else if (dataToReport[0].name && dataToReport[0].email) {
            if (dataToReport[0].groupNames) {
              title = 'Lista de Profissionais';
            } else {
              title = 'Lista de Estudantes';
            }
          }
        } else if (dataToReport && typeof dataToReport === 'object' && !Array.isArray(dataToReport)) {
          // Dados de estudante individual
          if (dataToReport.studentName || dataToReport.name) {
            title = fieldsRequested ? `Dados do Estudante - ${fieldsRequested}` : 'Dados do Estudante';
          } else if (dataToReport.coordinatorName) {
            title = fieldsRequested ? `Dados do Coordenador - ${fieldsRequested}` : 'Dados do Coordenador';
          }
        }
        
        const cacheId = randomUUID();
        this.cacheService.set(cacheId, { data: dataToReport, title });
        const downloadUrl = `${this.apiBaseUrl}/reports/from-cache/${cacheId}/${format}`;
        return { downloadUrl };

      default:
        return { error: 'Unknown tool' };
    }
  }

  
} 