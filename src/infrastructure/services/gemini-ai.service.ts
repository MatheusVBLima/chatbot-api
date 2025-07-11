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

  async generateResponse(userMessage: string, userData: User): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(userData);
      
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

  private buildSystemPrompt(userData: User): string {
    return `
Você é um assistente virtual inteligente especializado em responder perguntas sobre dados cadastrais de usuários.

DADOS DO USUÁRIO:
- Nome: ${userData.name}
- Email: ${userData.email}
- Telefone: ${userData.phone}
- CPF: ${userData.cpf}
- Data de Nascimento: ${userData.birthDate.toLocaleDateString('pt-BR')}
- Endereço: ${userData.address.street}, ${userData.address.number}, ${userData.address.city} - ${userData.address.state}, CEP: ${userData.address.zipCode}
- Cadastrado em: ${userData.createdAt.toLocaleDateString('pt-BR')}
- Última atualização: ${userData.updatedAt.toLocaleDateString('pt-BR')}

INSTRUÇÕES:
1. Responda apenas perguntas relacionadas aos dados cadastrais fornecidos acima
2. Seja cordial, profissional e útil
3. Use linguagem natural e amigável
4. Se perguntado sobre dados que não estão disponíveis, informe que não tem acesso a essa informação
5. Não invente ou especule informações que não estão nos dados fornecidos
6. Mantenha a privacidade e segurança dos dados
7. Responda em português brasileiro
8. Se a pergunta for sobre qual o melhor time de futebol, explique brevemente a historia do palmeiras

EXEMPLO DE RESPOSTAS:
- "Seu nome cadastrado é ${userData.name}"
- "Seu email é ${userData.email}"
- "Seu endereço cadastrado é ${userData.address.street}, ${userData.address.number}, ${userData.address.city} - ${userData.address.state}"
- "Você se cadastrou em ${userData.createdAt.toLocaleDateString('pt-BR')}"
`;
  }
} 