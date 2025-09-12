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
import { MetricsService, ChatMetric } from '../../application/services/metrics.service';

@Injectable()
export class GeminiAIService implements AIService {
  private readonly model: LanguageModel;
  private readonly apiBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject('VirtualAssistanceService') private readonly virtualAssistanceService: VirtualAssistanceService,
    private readonly cacheService: CacheService,
    private readonly promptService: PromptService,
    private readonly metricsService: MetricsService,
    ) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY');
    this.model = google('gemini-2.0-flash-lite');
    const configuredBaseUrl = this.configService.get<string>('API_BASE_URL');
    const renderExternalUrl = process.env.RENDER_EXTERNAL_URL;
    this.apiBaseUrl = configuredBaseUrl || renderExternalUrl || 'http://localhost:3001';
  }

  // Método mantido apenas para compatibilidade com process-api-chat-message.use-case.ts
  async generateResponse(userMessage: string, userData: User | User[]): Promise<string> {
    return "Este endpoint está descontinuado. Por favor, use o chat open (/chat/open) que possui todas as funcionalidades atualizadas.";
  }
  
  async processToolCall(actor: User, userMessage: string, availableTools: Record<string, CoreTool>): Promise<string> {
    const startTime = Date.now();
    console.log('[DEBUG] processToolCall called with:', actor.cpf, userMessage);
    
    // Buscar histórico de conversa do cache
    const conversationKey = `conversation_${actor.cpf}`;
    const existingMessages: CoreMessage[] = this.cacheService.get(conversationKey) || [];
    
    // Adicionar nova mensagem do usuário
    const messages: CoreMessage[] = [...existingMessages, { role: 'user', content: userMessage }];
    
    // Limitar histórico para evitar contexto muito grande (últimas 3 mensagens)
    const trimmedMessages = messages.slice(-3);

    // Métricas de tokens
    const systemPrompt = this.promptService.getSystemPrompt(actor);
    const estimatedInputTokens = this.estimateTokens(systemPrompt) + 
      trimmedMessages.reduce((acc, msg) => acc + this.estimateTokens(JSON.stringify(msg.content)), 0);
    
    console.log('[METRICS] Estimated input tokens:', estimatedInputTokens);
    console.log('[METRICS] Available tools:', Object.keys(availableTools).length);
    console.log('[METRICS] Message history length:', trimmedMessages.length);
    
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

      // Primeiro tentar usar fallback inteligente, se não funcionar, fazer segunda chamada
      let finalResponseText = this.buildFallbackResponseFromToolResults(toolResults, userMessage);
      
      // Se o fallback não conseguiu gerar uma resposta adequada, aí sim fazer segunda chamada
      if (!finalResponseText || finalResponseText.includes('não recebi um texto final da IA') || finalResponseText.length < 10) {
        console.log('[AI] Fallback insufficient, making second AI call');
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
          // Manter fallback como resposta se segunda chamada falhar
        }
      } else {
        console.log('[AI] Using intelligent fallback, skipping second AI call');
      }

      // Salvar conversa completa no cache (com ferramentas)
      const updatedMessages = [
        ...trimmedMessages,
        { role: 'assistant', content: finalResponseText }
      ];
      this.cacheService.set(conversationKey, updatedMessages, 3600000); // Cache por 1 hora (sessão)
      
      // Métricas finais (com tools)
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const estimatedOutputTokens = this.estimateTokens(finalResponseText);
      const totalTokens = estimatedInputTokens + estimatedOutputTokens;
      const estimatedCost = (estimatedInputTokens * 0.075 + estimatedOutputTokens * 0.30) / 1000000;
      const toolCallsCount = toolCalls.length;
      const cacheHitsCount = toolResults.filter(tr => {
        // Verificar se usou cache checando se o log foi impresso
        return tr.result && typeof tr.result === 'object';
      }).length;
      
      console.log('[METRICS] Response time:', responseTime, 'ms');
      console.log('[METRICS] Tool calls made:', toolCallsCount);
      console.log('[METRICS] Cache hits:', cacheHitsCount);
      console.log('[METRICS] Estimated output tokens:', estimatedOutputTokens);
      console.log('[METRICS] Total estimated tokens:', totalTokens);
      console.log('[METRICS] Estimated cost: $', estimatedCost.toFixed(6));
      
      // Gravar métrica
      this.recordMetric(actor, userMessage, responseTime, estimatedInputTokens, estimatedOutputTokens, totalTokens, estimatedCost, toolCalls.map(tc => tc.toolName), cacheHitsCount, false);
      
      return finalResponseText;
    }

    // Se nenhuma ferramenta foi chamada, salvamos a conversa simples
    const updatedMessages = [
      ...trimmedMessages,
      { role: 'assistant', content: textContent }
    ];
    this.cacheService.set(conversationKey, updatedMessages, 3600000); // Cache por 1 hora (sessão)
    
    // Métricas finais (sem tools)
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const estimatedOutputTokens = this.estimateTokens(textContent);
    const totalTokens = estimatedInputTokens + estimatedOutputTokens;
    const estimatedCost = (estimatedInputTokens * 0.075 + estimatedOutputTokens * 0.30) / 1000000;
    
    console.log('[METRICS] Response time:', responseTime, 'ms');
    console.log('[METRICS] Estimated output tokens:', estimatedOutputTokens);
    console.log('[METRICS] Total estimated tokens:', totalTokens);
    console.log('[METRICS] Estimated cost: $', estimatedCost.toFixed(6));
    
    // Gravar métrica (sem tools)
    this.recordMetric(actor, userMessage, responseTime, estimatedInputTokens, estimatedOutputTokens, totalTokens, estimatedCost, [], 0, false);
    
    return textContent;
  }

  // Estimativa simples de tokens (aprox. 4 caracteres = 1 token)
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Gravar métrica da interação
  private recordMetric(
    actor: User, 
    message: string, 
    responseTime: number, 
    inputTokens: number, 
    outputTokens: number, 
    totalTokens: number, 
    cost: number, 
    toolsUsed: string[], 
    cacheHits: number, 
    fallbackUsed: boolean
  ): void {
    const metric: ChatMetric = {
      timestamp: Date.now(),
      userId: actor.cpf,
      userType: actor.role,
      message: message.substring(0, 100), // Limitar tamanho para logs
      responseTime,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      totalTokens,
      estimatedCost: cost,
      toolsUsed,
      cacheHits,
      fallbackUsed
    };
    
    this.metricsService.recordChatMetric(metric);
  }

  // Build a concise human-friendly response from tool results when the model doesn't emit text
  // Agora o fallback é mais simples - deixa a IA fazer o trabalho de formatação na segunda chamada
  private buildFallbackResponseFromToolResults(toolResults: Array<{ toolName: string; result: any }>, userMessage: string): string {
    try {
      // Para casos simples onde conseguimos responder diretamente
      if (toolResults.length === 1) {
        const tr = toolResults[0];
        
        // Relatório gerado
        if (tr.toolName === 'generateReport') {
          if (tr.result && tr.result.downloadUrl) {
            return `✅ Relatório gerado! Link: ${tr.result.downloadUrl}`;
          } else if (tr.result && tr.result.error) {
            return `❌ Erro ao gerar relatório: ${tr.result.error}`;
          }
        }
        
        // Pessoa não encontrada
        if (tr.toolName === 'findPersonByName' && tr.result && tr.result.error) {
          return tr.result.error;
        }
      }
      
      // Para outros casos, forçar segunda chamada da IA que agora tem instruções melhores
      return '';
    } catch (err) {
      console.error('[AI] Error building fallback response:', err);
      return 'Dados obtidos com sucesso! Tente fazer uma pergunta específica ou solicitar um relatório.';
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




  // Gerar chave específica do cache para cada tipo de tool
  private getToolCacheKey(toolName: string, cpf: string): string {
    return `tool_${toolName}_${cpf}`;
  }

  // This method maps the AI's tool choice to our actual service methods.
  private async executeTool(toolCall: any): Promise<any> {
    const { toolName, args } = toolCall;
    
    // Cache inteligente: verificar se já temos os dados deste tool
    const toolCacheKey = this.getToolCacheKey(toolName, args.cpf);
    const cachedResult = this.cacheService.get(toolCacheKey);
    
    if (cachedResult) {
      console.log(`[CACHE] Using cached result for ${toolName}`);
      // Atualizar lastResult para permitir geração de relatórios
      this.cacheService.set(this.getLastResultCacheKey(args.cpf), cachedResult, 3600000);
      return cachedResult;
    }
    
    let result: any; // To store the result of the data-fetching tools
    
    switch (toolName) {
      case 'getCoordinatorsOngoingActivities':
        result = await this.virtualAssistanceService.getCoordinatorsOngoingActivities(args.cpf);
        this.cacheService.set(toolCacheKey, result, 3600000); // Cache específico do tool
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000); // Cache do último resultado
        return result;
      case 'getCoordinatorsProfessionals':
        result = await this.virtualAssistanceService.getCoordinatorsProfessionals(args.cpf);
        this.cacheService.set(toolCacheKey, result, 3600000);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000);
        return result;
      case 'getCoordinatorsStudents':
        result = await this.virtualAssistanceService.getCoordinatorsStudents(args.cpf);
        this.cacheService.set(toolCacheKey, result, 3600000);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000);
        return result;
      case 'getStudentsScheduledActivities':
        result = await this.virtualAssistanceService.getStudentsScheduledActivities(args.cpf);
        this.cacheService.set(toolCacheKey, result, 3600000);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000);
        return result;
      case 'getStudentsProfessionals':
        result = await this.virtualAssistanceService.getStudentsProfessionals(args.cpf);
        this.cacheService.set(toolCacheKey, result, 3600000);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000);
        return result;
        
      case 'getStudentInfo':
        result = await this.virtualAssistanceService.getStudentInfo(args.cpf);
        this.cacheService.set(toolCacheKey, result, 3600000);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000);
        return result;
      case 'getCoordinatorInfo':
        result = await this.virtualAssistanceService.getCoordinatorInfo(args.cpf);
        this.cacheService.set(toolCacheKey, result, 3600000);
        this.cacheService.set(this.getLastResultCacheKey(args.cpf), result, 3600000);
        return result;
      
      case 'findPersonByName':
        const { name: searchName, cpf: searcherCpf } = args;
        let foundPerson: any = null;
        
        // Função para normalizar texto (remover acentos e converter para lowercase)
        const normalizeText = (text: string): string => {
          return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
        };
        
        // Função para calcular distância de edição (Levenshtein distance)
        const editDistance = (a: string, b: string): number => {
          const matrix: number[][] = [];
          for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
          }
          for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
          }
          for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
              if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
              } else {
                matrix[i][j] = Math.min(
                  matrix[i - 1][j - 1] + 1,
                  matrix[i][j - 1] + 1,
                  matrix[i - 1][j] + 1
                );
              }
            }
          }
          return matrix[b.length][a.length];
        };
        
        // Buscar em profissionais primeiro (mais comum)
        try {
          const professionals = await this.virtualAssistanceService.getStudentsProfessionals(searcherCpf);
          
          // Primeiro tentar busca exata (includes)
          foundPerson = professionals.find(person => {
            const normalizedPersonName = normalizeText(person.name);
            const normalizedSearchName = normalizeText(searchName);
            return normalizedPersonName.includes(normalizedSearchName);
          });
          
          // Se não encontrou, tentar busca por palavras individuais com tolerância a erros
          if (!foundPerson) {
            const searchWords = normalizeText(searchName).split(' ').filter(w => w.length >= 3);
            
            foundPerson = professionals.find(person => {
              const personWords = normalizeText(person.name).split(' ');
              
              return searchWords.some(searchWord => {
                return personWords.some(personWord => {
                  // Busca exata primeiro
                  if (personWord.includes(searchWord)) return true;
                  
                  // Se palavra tem pelo menos 4 caracteres, permitir 1-2 erros
                  if (searchWord.length >= 4) {
                    const distance = editDistance(searchWord, personWord);
                    const maxErrors = searchWord.length <= 5 ? 1 : 2;
                    return distance <= maxErrors;
                  }
                  
                  return false;
                });
              });
            });
          }
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