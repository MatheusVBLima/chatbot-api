# Chatbot API - Projeto X

Este é o "Projeto X" descrito na arquitetura do sistema de chatbot - uma API headless que funciona como o cérebro da operação, orquestrando a busca de dados e interagindo com IA para responder perguntas sobre dados cadastrais de usuários.

## 🏗️ Arquitetura

O projeto segue os princípios da **Clean Architecture**, organizando o código em camadas bem definidas:

- **Domain**: Entidades e interfaces (regras de negócio)
- **Application**: Casos de uso (orquestração)
- **Infrastructure**: Implementações concretas (frameworks, APIs, banco de dados)

## 🚀 Tecnologias

- **NestJS** com TypeScript
- **Vercel AI SDK** para integração com IA
- **Google Gemini 2.0 Flash Lite** como modelo de IA
- **Clean Architecture** para organização do código

## 📁 Estrutura do Projeto

```
src/
├── domain/
│   ├── entities/           # Entidades de domínio
│   ├── repositories/       # Interfaces de repositórios
│   └── services/          # Interfaces de serviços
├── application/
│   └── use-cases/         # Casos de uso
└── infrastructure/
    ├── controllers/       # Controllers HTTP
    ├── repositories/      # Implementações de repositórios
    └── services/         # Implementações de serviços
```

## 🔧 Configuração

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   cp env.example .env
   ```
   
   Edite o arquivo `.env` com suas configurações:
   ```env
   GOOGLE_GENERATIVE_AI_API_KEY=sua_chave_do_google_ai
   PORT=3000
   NODE_ENV=development
   ```

3. **Execute o projeto:**
   ```bash
   # Desenvolvimento
   npm run start:dev
   
   # Produção
   npm run build
   npm run start:prod
   ```

## 📡 Endpoints da API

### `POST /chat/message`
Processa uma mensagem do usuário e retorna a resposta do chatbot.

**Request:**
```json
{
  "message": "Qual é o meu nome?",
  "userId": "1",
  "channel": "web"
}
```

**Response:**
```json
{
  "response": "Seu nome cadastrado é João Silva",
  "success": true
}
```

### `POST /chat/health`
Endpoint de health check.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔄 Fluxo de Orquestração

1. **Recebimento**: API recebe mensagem e identificador do usuário
2. **Identificação**: Sistema identifica o usuário (por ID, telefone ou email)
3. **Busca de Dados**: Consulta dados do usuário (simulado via MockUserRepository)
4. **Processamento IA**: Combina mensagem + dados do usuário em prompt para Gemini
5. **Resposta**: Retorna resposta personalizada da IA

## 🧪 Dados de Teste

O sistema inclui usuários mock para teste:

**Usuário 1:**
- ID: `1`
- Nome: João Silva
- Email: joao.silva@email.com
- Telefone: +5511999999999

**Usuário 2:**
- ID: `2`
- Nome: Maria Santos
- Email: maria.santos@email.com
- Telefone: +5511888888888

## 🔗 Integração com Projeto Y

Atualmente, o sistema usa um repositório mock (`MockUserRepository`) que simula a API do Projeto Y. Para integrar com a API real:

1. Implemente `UserRepository` em `infrastructure/repositories/`
2. Configure as variáveis de ambiente `PROJECT_Y_API_URL` e `PROJECT_Y_API_KEY`
3. Atualize o provider no `AppModule`

## 📝 Exemplo de Uso

```bash
# Teste com cURL
curl -X POST http://localhost:3000/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Qual é o meu endereço?",
    "userId": "1",
    "channel": "web"
  }'
```

## 🎯 Próximos Passos

- [ ] Implementar autenticação JWT
- [ ] Adicionar logging estruturado
- [ ] Implementar rate limiting
- [ ] Adicionar testes unitários e de integração
- [ ] Implementar repositório real para Projeto Y
- [ ] Adicionar suporte a streaming de respostas
- [ ] Implementar cache de respostas