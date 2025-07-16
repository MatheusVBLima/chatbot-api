import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatController } from './infrastructure/controllers/chat.controller';
import { ProcessOpenChatMessageUseCase } from './application/use-cases/process-open-chat-message.use-case';
import { ProcessClosedChatMessageUseCase } from './application/use-cases/process-closed-chat-message.use-case';
import { ClosedChatFlow } from './domain/flows/closed-chat.flow';
import { MockUserRepository } from './infrastructure/repositories/mock-user.repository';
import { MockStudentRepository } from './infrastructure/repositories/mock-student.repository';
import { GeminiAIService } from './infrastructure/services/gemini-ai.service';
// Domain interfaces for dependency injection
const USER_REPOSITORY = 'UserRepository';
const STUDENT_REPOSITORY = 'StudentRepository';
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
    ProcessOpenChatMessageUseCase,
    ProcessClosedChatMessageUseCase,
    ClosedChatFlow,
    {
      provide: USER_REPOSITORY,
      useClass: MockUserRepository,
    },
    {
      provide: STUDENT_REPOSITORY,
      useClass: MockStudentRepository,
    },
    {
      provide: AI_SERVICE,
      useClass: GeminiAIService,
    },
  ],
})
export class AppModule {}
