import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatController } from './infrastructure/controllers/chat.controller';
import { ReportController } from './infrastructure/controllers/report.controller';
import { ProcessOpenChatMessageUseCase } from './application/use-cases/process-open-chat-message.use-case';
import { ProcessClosedChatMessageUseCase } from './application/use-cases/process-closed-chat-message.use-case';
import { ProcessApiChatMessageUseCase } from './application/use-cases/process-api-chat-message.use-case';
import { ClosedChatFlow } from './domain/flows/closed-chat.flow';
import { ReportService } from './application/services/report.service';
import { MockUserRepository } from './infrastructure/repositories/mock-user.repository';
import { GeminiAIService } from './infrastructure/services/gemini-ai.service';
import { MockVirtualAssistanceService } from './infrastructure/services/mock-virtual-assistance.service';
import { ApiClientService } from './infrastructure/services/api-client.service';
import { ApiVirtualAssistanceService } from './infrastructure/services/api-virtual-assistance.service';
import { CacheService } from './application/services/cache.service';

const USER_REPOSITORY = 'UserRepository';
const AI_SERVICE = 'AIService';
const VIRTUAL_ASSISTANCE_SERVICE = 'VirtualAssistanceService';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController, ChatController, ReportController],
  providers: [
    AppService,
    ProcessOpenChatMessageUseCase,
    ProcessClosedChatMessageUseCase,
    ProcessApiChatMessageUseCase,
    ClosedChatFlow,
    ReportService,
    CacheService,
    ApiClientService,
    ApiVirtualAssistanceService,
    {
      provide: USER_REPOSITORY,
      useClass: MockUserRepository,
    },
    {
      provide: AI_SERVICE,
      useClass: GeminiAIService,
    },
    {
      provide: VIRTUAL_ASSISTANCE_SERVICE,
      useClass: MockVirtualAssistanceService,
    }
  ],
})
export class AppModule {}

