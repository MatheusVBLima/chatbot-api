import { Injectable, Inject } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AIService } from '../../domain/services/ai.service';
import { ChatMessage } from '../../domain/entities/chat-message.entity';
import { User } from '../../domain/entities/user.entity';

export interface ProcessChatMessageRequest {
  message: string;
  userId?: string;
  phone?: string;
  email?: string;
  channel: 'web' | 'whatsapp' | 'telegram';
}

export interface ProcessChatMessageResponse {
  response: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class ProcessChatMessageUseCase {
  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
    @Inject('AIService') private readonly aiService: AIService,
  ) {}

  async execute(request: ProcessChatMessageRequest): Promise<ProcessChatMessageResponse> {
    try {
      // 1. Identificar o usuário
      let user: User | null = null;
      
      if (request.userId) {
        user = await this.userRepository.findById(request.userId);
      } else if (request.phone) {
        user = await this.userRepository.findByPhone(request.phone);
      } else if (request.email) {
        user = await this.userRepository.findByEmail(request.email);
      }

      if (!user) {
        return {
          response: 'Desculpe, não consegui encontrar seus dados cadastrais. Verifique se suas informações estão corretas.',
          success: false,
          error: 'User not found'
        };
      }

      // 2. Gerar resposta usando IA
      const aiResponse = await this.aiService.generateResponse(request.message, user);

      return {
        response: aiResponse,
        success: true
      };

    } catch (error) {
      console.error('Error processing chat message:', error);
      return {
        response: 'Desculpe, ocorreu um erro interno. Tente novamente em alguns instantes.',
        success: false,
        error: error.message
      };
    }
  }
} 