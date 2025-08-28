import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppMockModule } from './app-mock.module';
import { AppApiModule } from './app-api.module';

async function bootstrap() {
  // Determine which module to use based on environment
  const useApiData = process.env.USE_API_DATA === 'true';
  const moduleToUse = useApiData ? AppApiModule : AppModule; // AppModule is the default (current mixed setup)
  
  console.log(`🚀 Starting application with ${useApiData ? 'REAL API DATA' : 'MOCK DATA'}`);
  
  const app = await NestFactory.create(moduleToUse);

  app.enableCors();

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
