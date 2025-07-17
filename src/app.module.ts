import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatController } from './infrastructure/controllers/chat.controller';
import { ReportController } from './infrastructure/controllers/report.controller';
import { ProcessOpenChatMessageUseCase } from './application/use-cases/process-open-chat-message.use-case';
import { ProcessClosedChatMessageUseCase } from './application/use-cases/process-closed-chat-message.use-case';
import { ClosedChatFlow } from './domain/flows/closed-chat.flow';
import { ReportService } from './application/services/report.service';
import { MockUserRepository } from './infrastructure/repositories/mock-user.repository';
import { GeminiAIService } from './infrastructure/services/gemini-ai.service';

const USER_REPOSITORY = 'UserRepository';
const AI_SERVICE = 'AIService';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, ChatController, ReportController],
  providers: [
    AppService,
    ProcessOpenChatMessageUseCase,
    ProcessClosedChatMessageUseCase,
    ClosedChatFlow,
    ReportService,
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

