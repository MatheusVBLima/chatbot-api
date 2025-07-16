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

## �� Endpoints da API

A API agora possui dois endpoints principais para lidar com os diferentes fluxos de conversa.

### `POST /chat/open`
Processa uma mensagem do usuário usando o fluxo de **chat aberto**, onde a IA do Google Gemini é usada para gerar respostas dinâmicas com base nos dados cadastrais do usuário.

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
  "response": "Seu nome cadastrado é João Silva.",
  "success": true
}
```

### `POST /chat/closed`
Processa uma mensagem do usuário usando o fluxo de **chat fechado**, que segue uma máquina de estados pré-definida (o diagrama) para guiar o usuário através de um menu de opções.

**Request (primeira mensagem):**
```json
{
  "message": "",
  "state": null,
  "channel": "web"
}
```

**Response (exemplo):**
```json
{
  "response": "Olá! Para começar, por favor, me diga qual seu perfil:\n1 - Sou Estudante\n2 - Sou Professor\n3 - Ainda não sou usuário",
  "success": true,
  "nextState": {
    "currentState": "AWAITING_USER_TYPE",
    "data": {}
  }
}
```

**Request (mensagem subsequente):**
O cliente **deve** enviar de volta o objeto `state` recebido na resposta anterior.
```json
{
  "message": "1",
  "state": {
    "currentState": "AWAITING_USER_TYPE",
    "data": {}
  },
  "channel": "web"
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

### Chat Aberto (`/chat/open`)
1. **Recebimento**: API recebe mensagem e identificador do usuário.
2. **Identificação**: Sistema identifica o usuário (por ID, telefone ou email).
3. **Busca de Dados**: Consulta dados do usuário (simulado via `MockUserRepository`).
4. **Processamento IA**: Combina mensagem + dados do usuário em um prompt para o Gemini.
5. **Resposta**: Retorna a resposta personalizada gerada pela IA.

### Chat Fechado (`/chat/closed`)
1. **Recebimento**: API recebe a mensagem do usuário e o **estado atual** da conversa.
2. **Máquina de Estados**: O `ClosedChatFlow` processa a mensagem com base no estado atual.
3. **Execução da Lógica**: Dependendo do estado, o sistema pode consultar APIs (como a de estudantes), fazer uma pergunta, ou apresentar um menu.
4. **Próximo Estado**: A API retorna a resposta para o usuário e o **próximo estado** da conversa, que deve ser armazenado pelo cliente.

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

Atualmente, o sistema usa um repositório mock (`MockUserRepository` e `MockStudentRepository`) que simula a API do Projeto Y. Para integrar com a API real:

1. Implemente `UserRepository` e `StudentRepository` em `infrastructure/repositories/`
2. Configure as variáveis de ambiente `PROJECT_Y_API_URL` e `PROJECT_Y_API_KEY`
3. Atualize o provider no `AppModule`

## 📝 Exemplo de Uso

```bash
# Teste do Chat Aberto com cURL
curl -X POST http://localhost:3000/chat/open \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Qual é o meu endereço?",
    "userId": "1",
    "channel": "web"
  }'

# Teste do Chat Fechado com cURL (iniciando a conversa)
curl -X POST http://localhost:3000/chat/closed \
  -H "Content-Type: application/json" \
  -d '{
    "message": "",
    "state": null,
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