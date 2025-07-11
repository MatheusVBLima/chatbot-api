import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatController } from './infrastructure/controllers/chat.controller';
import { ProcessChatMessageUseCase } from './application/use-cases/process-chat-message.use-case';
import { MockUserRepository } from './infrastructure/repositories/mock-user.repository';
import { GeminiAIService } from './infrastructure/services/gemini-ai.service';
// Domain interfaces for dependency injection
const USER_REPOSITORY = 'UserRepository';
const AI_SERVICE = 'AIService';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, ChatController],
  providers: [
    AppService,
    ProcessChatMessageUseCase,
    {
      provide: USER_REPOSITORY,
      useClass: MockUserRepository,
    },
    {
      provide: AI_SERVICE,
      useClass: GeminiAIService,
    },
  ],
})
export class AppModule {}
