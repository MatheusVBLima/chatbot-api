import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ProcessChatMessageUseCase, ProcessChatMessageRequest, ProcessChatMessageResponse } from '../../application/use-cases/process-chat-message.use-case';

export class ChatRequestDto {
  message: string;
  userId?: string;
  phone?: string;
  email?: string;
  channel: 'web' | 'whatsapp' | 'telegram';
}

export class ChatResponseDto {
  response: string;
  success: boolean;
  error?: string;
}

@Controller('chat')
export class ChatController {
  constructor(
    private readonly processChatMessageUseCase: ProcessChatMessageUseCase,
  ) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  async processMessage(@Body() request: ChatRequestDto): Promise<ChatResponseDto> {
    const result = await this.processChatMessageUseCase.execute(request);
    
    return {
      response: result.response,
      success: result.success,
      error: result.error
    };
  }

  @Post('health')
  @HttpCode(HttpStatus.OK)
  async health(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'OK',
      timestamp: new Date().toISOString()
    };
  }
} 