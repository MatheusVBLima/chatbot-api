import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { 
  ProcessOpenChatMessageUseCase, 
  ProcessOpenChatMessageRequest 
} from '../../application/use-cases/process-open-chat-message.use-case';
import { 
  ProcessClosedChatMessageUseCase, 
  ProcessClosedChatMessageRequest 
} from '../../application/use-cases/process-closed-chat-message.use-case';
import { ClosedChatState } from '../../domain/flows/closed-chat.flow';

// DTO for open chat
export class OpenChatRequestDto implements ProcessOpenChatMessageRequest {
  message: string;
  userId?: string;
  phone?: string;
  email?: string;
  channel: 'web' | 'whatsapp' | 'telegram';
}

// DTO for closed chat
export class ClosedChatRequestDto implements ProcessClosedChatMessageRequest {
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
  nextState?: ClosedChatState | null;
}

@Controller('chat')
export class ChatController {
  constructor(
    private readonly processOpenChatMessageUseCase: ProcessOpenChatMessageUseCase,
    private readonly processClosedChatMessageUseCase: ProcessClosedChatMessageUseCase,
  ) {}

  @Post('open')
  @HttpCode(HttpStatus.OK)
  async processOpenMessage(@Body() request: OpenChatRequestDto): Promise<ChatResponseDto> {
    const result = await this.processOpenChatMessageUseCase.execute(request);
    
    return {
      response: result.response,
      success: result.success,
      error: result.error
    };
  }

  @Post('closed')
  @HttpCode(HttpStatus.OK)
  async processClosedMessage(@Body() request: ClosedChatRequestDto): Promise<ChatResponseDto> {
    const result = await this.processClosedChatMessageUseCase.execute(request);
    
    return {
      response: result.response,
      success: result.success,
      error: result.error,
      nextState: result.nextState,
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