# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run start:dev` - Start development server with hot reload
- `npm run start:debug` - Start with debugging enabled
- `npm run build` - Build for production
- `npm run start:prod` - Run production build

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage report
- `npm run test:e2e` - Run end-to-end tests

### Code Quality
- `npm run format` - Format code with Prettier

## Architecture Overview

This is a **NestJS-based chatbot API** following **Clean Architecture** principles, organized in three main layers:

### Domain Layer (`src/domain/`)
- **Entities**: Core business objects (User, Student, etc.)
- **Repositories**: Interfaces for data access
- **Services**: Interfaces for external services 
- **Flows**: Business logic for conversation flows (e.g., `ClosedChatFlow`)

### Application Layer (`src/application/`)
- **Use Cases**: Orchestrate business logic (e.g., `ProcessOpenChatMessageUseCase`)
- **Services**: Application-specific services like `CacheService`

### Infrastructure Layer (`src/infrastructure/`)
- **Controllers**: HTTP endpoints and DTOs
- **Services**: Concrete implementations (Gemini AI, Z-API, RADE API)
- **Repositories**: Data access implementations (currently mock)
- **Modules**: NestJS module configurations

## Key Architectural Patterns

### Module System
The application uses **three interchangeable modules**:
- `AppModule` - Mixed mock/API setup (default)
- `AppMockModule` - Full mock mode for testing
- `AppApiModule` - Full API integration mode

Module selection is controlled by `USE_API_DATA` environment variable in `src/main.ts`.

### Chat Flow Types
1. **Open Chat** (`/chat/open`) - AI-powered dynamic responses using Google Gemini
2. **Closed Chat** (`/chat/closed`) - State machine-based guided conversations
3. **API Chat** (`/chat/api`) - Direct API integration responses

### State Management (Closed Chat)
Uses `ClosedChatFlow` with enum-based states (`ChatFlowState`) and stateful conversation tracking via `ClosedChatState` interface. Client must maintain and send back state between requests.

## Integration Patterns

### External APIs
- **RADE API**: Main data source (authentication via `RadeAuthService`)
- **Z-API**: WhatsApp Business integration
- **Google Gemini**: AI text generation via `@ai-sdk/google`

### Repository Pattern
All data access goes through repository interfaces:
- `UserRepository` - User data access
- `StudentRepository` - Student-specific data

Current implementations are mock-based but designed for easy API integration replacement.

## Environment Configuration

The application supports **environment-based behavior switching**:
- `USE_API_DATA=true` - Use real API integrations
- `USE_API_DATA=false` - Use mock data (default for development)

Production environment should be configured via `.env.production` with Docker deployment.

## Docker Deployment

Docker configuration includes:
- Multi-stage Dockerfile with Node.js 18-alpine
- Nginx reverse proxy with SSL via Let's Encrypt
- Production environment via docker-compose

Deploy using `./scripts/deploy.sh` after configuring domain and API keys.

## Testing Strategy

Mock repositories are used extensively for testing. When adding new features:
1. Create domain interfaces first
2. Implement mock versions for testing
3. Add use cases with dependency injection
4. Create API integrations last

## Key Dependencies

- **@nestjs/**: Core framework
- **@ai-sdk/google** & **@google/generative-ai**: AI integration
- **jspdf** & **pdfkit**: PDF generation capabilities
- **papaparse**: CSV data processing
- **axios**: HTTP client for API integrations