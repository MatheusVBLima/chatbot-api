import { Module } from '@nestjs/common';
import { ZapiService } from '../services/zapi.service';
import { ZapiIntegrationService } from '../services/zapi-integration.service';
import { ZapiWebhookController } from '../controllers/zapi-webhook.controller';
import { RadeAuthService } from '../services/rade-auth.service';
import { ApiClientService } from '../services/api-client.service';

@Module({
  controllers: [ZapiWebhookController],
  providers: [
    ZapiService,
    ZapiIntegrationService,
    RadeAuthService,
    ApiClientService,
  ],
  exports: [
    ZapiService,
    ZapiIntegrationService,
    RadeAuthService,
    ApiClientService,
  ],
})
export class ZapiModule {}