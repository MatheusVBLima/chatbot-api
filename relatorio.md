# Documentação do Sistema de Chat - Ad-Astra

## 📋 Visão Geral

O sistema de chat Ad-Astra oferece três modalidades de acesso para diferentes necessidades:

- **Chat Fechado** - Fluxo guiado por menus com dados simulados
- **Chat Aberto** - Conversação natural com IA usando dados simulados
- **Chat API** - Conversação natural com IA usando dados reais da plataforma

---

## 🔒 Chat Fechado (Dados Simulados)

### Como Funciona
O chat fechado oferece uma experiência guiada através de menus estruturados, ideal para demonstrações e treinamento.

### Endpoint
```
POST /chat/closed
```

### Fluxo de Uso

#### 1. Início da Conversa
**Você envia:** Qualquer mensagem inicial
```json
{
  "message": "Olá",
  "userId": "opcional",
  "channel": "web"
}
```

**Sistema responde:** Menu de seleção de perfil
```
👋 Bem-vindo ao Ad-Astra!

Selecione seu perfil:
1️⃣ Sou Estudante
2️⃣ Sou Professor/Preceptor
3️⃣ Sou Coordenador
4️⃣ Sou um Novo Usuário
```

#### 2. Seleção de Perfil
**Você envia:** Número da opção (ex: "1")

**Sistema responde:** Solicitação de identificação
```
👩‍🎓 Perfeito! Para acessar suas informações, preciso do seu CPF.
Digite seu CPF (apenas números):
```

#### 3. Identificação
**Você envia:** CPF válido dos dados simulados

**Sistema responde:** Menu específico do perfil
```
📚 Olá, Alice Ferreira!

O que você gostaria de ver hoje?
1️⃣ Minhas Atividades Agendadas
2️⃣ Meus Preceptores
3️⃣ Gerar Relatório
```

### CPFs Disponíveis (Dados Simulados)

#### Estudantes:
- **55443322100** - Alice Ferreira (Grupos: Saúde da Mulher, Saúde Mental)
- **44332211099** - Bruno Lima (Grupo: Saúde da Família)  
- **33221100988** - Camila Rocha (Grupos: Saúde da Criança, Saúde do Idoso)

#### Coordenador:
- **111.111.111-11** - Prof. Daniela Moura

### Dados Disponíveis

#### Para Estudantes:
- ✅ **Atividades Agendadas** - Próximas atividades programadas
- ✅ **Preceptores** - Lista de profissionais que acompanham o estudante
- ✅ **Relatórios** - Exportação em PDF, CSV ou TXT

#### Para Coordenadores:
- ✅ **Atividades em Andamento** - Atividades que estão acontecendo agora
- ✅ **Todos os Profissionais** - Lista completa de preceptores
- ✅ **Todos os Estudantes** - Lista completa de alunos supervisionados
- ✅ **Relatórios** - Exportação em PDF, CSV ou TXT

---

## 💬 Chat Aberto (Dados Simulados)

### Como Funciona
Conversação natural com inteligência artificial usando dados simulados. Perfeito para demonstrar capacidades da IA sem afetar dados reais.

### Endpoint
```
POST /chat/open
```

### Métodos de Identificação

#### Por CPF:
```json
{
  "message": "Quero ver minhas atividades",
  "userId": "55443322100",
  "channel": "web"
}
```

#### Por Email:
```json
{
  "message": "Quero ver minhas atividades", 
  "email": "alice.ferreira@alunos.ufpr.br",
  "channel": "web"
}
```

#### Por Telefone:
```json
{
  "message": "Quero ver minhas atividades",
  "phone": "41991234567", 
  "channel": "web"
}
```

### Exemplos de Perguntas e Respostas

#### 👩‍🎓 Estudante (Alice Ferreira)

**Pergunta:** "Quero ver minhas atividades"
```
Alice Ferreira, suas atividades agendadas são:

• Grupo: Grupo 1 - Saúde da Mulher
• Atividade: Coleta de Preventivo
• Local: Centro de Saúde Jardim das Flores
• Data: 26/07/2025 das 13:00 às 17:00
• Preceptor: Dra. Larissa Melo
```

**Pergunta:** "Quem são meus preceptores?"
```
Seus preceptores são:

• Dr. João Carlos Oliveira - Grupos: Saúde da Mulher, Saúde Mental
  📧 joao.oliveira@preceptores.ufpr.br | 📱 41999887766

• Dra. Larissa Melo - Grupo: Saúde da Mulher  
  📧 larissa.melo@preceptores.ufpr.br | 📱 41987654326

• Dr. João Mendes - Grupo: Saúde Mental
  📧 joao.mendes@preceptores.ufpr.br | 📱 41987654327
```

**Pergunta:** "Posso ver atividades em andamento?"
```
Olá, Alice! Como estudante, você só pode acessar suas atividades agendadas. 
Apenas coordenadores têm acesso a atividades em andamento.
Posso te mostrar suas próximas atividades programadas se desejar.
```

#### 👨‍🏫 Coordenador (Prof. Daniela Moura)

**Pergunta:** "Quero ver as atividades"
```
Como coordenador, você pode acessar diferentes tipos de atividades. 
Deseja ver as atividades em andamento ou as atividades agendadas dos estudantes?
```

**Pergunta:** "Mostre as atividades em andamento"
```
As seguintes atividades estão em andamento:

• Alice Ferreira (Grupo 4 - Saúde Mental): Visita domiciliar na UBS Santa Clara
  Com Dr. João Mendes | Iniciada às 8h15, prevista para terminar às 12h00

• Bruno Lima (Grupo 2 - Saúde da Família): Atendimento ambulatorial na Clínica Escola UFPR  
  Com Dra. Carla Souza | Iniciada às 13h05, prevista para terminar às 17h00

• Camila Rocha (Grupo 5 - Saúde do Idoso): Roda de conversa no CRAS Boa Vista
  Com Dr. Paulo Henrique | Iniciada às 9h10, prevista para terminar às 11h30
```

**Pergunta:** "Liste todos os estudantes"
```
Estudantes supervisionados:

• Alice Ferreira (CPF: 55443322100)
  📧 alice.ferreira@alunos.ufpr.br | 📱 41991234567
  Grupos: Saúde da Mulher, Saúde Mental

• Bruno Lima (CPF: 44332211099)  
  📧 bruno.lima@alunos.ufpr.br
  Grupo: Saúde da Família

• Camila Rocha (CPF: 33221100988)
  📧 camila.rocha@alunos.ufpr.br | 📱 41992345678  
  Grupos: Saúde da Criança, Saúde do Idoso
```

### Recursos Inteligentes

#### 🤖 IA Contextual
- Entende linguagem natural em português
- Reconhece automaticamente o perfil do usuário
- Adapta respostas baseado nas permissões

#### 🔐 Controle de Acesso
- **Estudantes:** Apenas atividades agendadas e seus preceptores
- **Coordenadores:** Acesso total a todos os dados

#### 📊 Geração de Relatórios
**Pergunta:** "Gere um relatório em PDF"
```
Relatório gerado com sucesso! 
📁 Download: https://api.adli.adasi.io/reports/abc123/pdf
```

### Comandos Naturais Aceitos

#### Para Atividades:
- "minhas atividades"
- "atividades agendadas"  
- "próximas atividades"
- "atividades futuras"
- "atividades programadas"

#### Para Profissionais:
- "meus preceptores"
- "professores"
- "quem me acompanha"
- "profissionais do meu grupo"

#### Para Relatórios:
- "gere um relatório"
- "exporte esses dados"
- "quero baixar em PDF"
- "preciso de um CSV"

---

## 🌐 Chat API (Dados Reais)

### Como Funciona
Conversação natural com IA conectada à API real da plataforma Ad-Astra. **Funciona exatamente igual ao Chat Aberto**, mas usa dados reais dos usuários autenticados da plataforma.

### Endpoint
```
POST /chat/api
```

### Configuração Atual
- **URL Base:** `https://api.radeapp.com`
- **Token:** `olWbHZNVHMx8qIc6L0spduLuCL5PQzXz`
- **Status:** ✅ Conexão e autenticação funcionando

### ⚠️ Requisito Importante
**DEVE usar CPFs reais** de usuários cadastrados na plataforma Ad-Astra. Os CPFs dos dados simulados (55443322100, 111.111.111-11, etc.) **não funcionarão** neste chat.

### Métodos de Identificação

#### Por CPF Real:
```json
{
  "message": "Quero ver minhas atividades",
  "userId": "cpf_real_do_usuario",
  "channel": "web"
}
```

#### Por Email Real:
```json
{
  "message": "Quero ver minhas atividades", 
  "email": "email_real@instituicao.edu.br",
  "channel": "web"
}
```

#### Por Telefone Real:
```json
{
  "message": "Quero ver minhas atividades",
  "phone": "telefone_real_cadastrado", 
  "channel": "web"
}
```

### Comportamento Idêntico ao Chat Aberto
O Chat API tem **exatamente as mesmas funcionalidades** do Chat Aberto:

- ✅ **Comandos naturais** - Aceita as mesmas perguntas em linguagem natural
- ✅ **IA contextual** - Entende o perfil e adapta as respostas
- ✅ **Permissões** - Estudantes só veem atividades agendadas, coordenadores veem tudo
- ✅ **Relatórios** - Gera PDF, CSV e TXT dos dados reais
- ✅ **Tratamento de erros** - Mensagens amigáveis para problemas

### Exemplos de Uso com Dados Reais

#### 👩‍🎓 Estudante Real
**Pergunta:** "Quero ver minhas atividades"
```
[Nome do Estudante], suas atividades agendadas são:

• Grupo: [Grupo Real]
• Atividade: [Atividade Real]
• Local: [Local Real]
• Data: [Data Real]
• Preceptor: [Preceptor Real]
```

#### 👨‍🏫 Coordenador Real
**Pergunta:** "Mostre as atividades em andamento"
```
As seguintes atividades estão em andamento:

• [Estudante Real] ([Grupo Real]): [Atividade Real] no [Local Real]
  Com [Preceptor Real] | Iniciada às [Hora], prevista para terminar às [Hora]
```

### Diferenças dos Dados Simulados
- ✅ Dados reais e atualizados da plataforma Ad-Astra
- ✅ Usuários autenticados existentes
- ✅ Atividades e horários em tempo real
- ✅ Informações atuais de preceptores e estudantes
- ✅ Relatórios com dados verdadeiros

### Testado e Validado
- ✅ **Conectividade** - API externa respondendo
- ✅ **Autenticação** - Token aceito e funcional
- ✅ **Rotas** - Endpoints implementados e acessíveis
- ✅ **Tratamento** - Erros para CPFs inexistentes funcionando corretamente

---

## 📋 Comparativo dos Chats

| Recurso | Chat Fechado | Chat Aberto | Chat API |
|---------|--------------|-------------|----------|
| **Dados** | Simulados | Simulados | Reais |
| **Interface** | Menus guiados | IA natural | IA natural |
| **Identificação** | CPF apenas | CPF/Email/Phone | CPF/Email/Phone |
| **Permissões** | ✅ | ✅ | ✅ |
| **Relatórios** | ✅ | ✅ | ✅ |
| **Tempo Real** | ❌ | ❌ | ✅ |

---

## 🎯 Casos de Uso Recomendados

### Chat Fechado 👍
- **Demonstrações** para clientes
- **Treinamento** de novos usuários  
- **Testes** de fluxos específicos
- **Apresentações** comerciais

### Chat Aberto 👍  
- **Desenvolvimento** e testes de IA
- **Validação** de funcionalidades
- **Demonstrações** de capacidades da IA
- **Prototipagem** de novas features

### Chat API 👍
- **Produção** com usuários reais
- **Ambiente** de homologação
- **Testes** com dados reais
- **Validação** final before deploy

---

## 🔧 Implementação Técnica

### Ferramentas de IA Disponíveis

#### Estudantes:
- `getStudentsScheduledActivities` - Busca atividades agendadas
- `getStudentsProfessionals` - Lista preceptores associados

#### Coordenadores:  
- `getCoordinatorsOngoingActivities` - Atividades em andamento
- `getCoordinatorsProfessionals` - Todos os profissionais
- `getCoordinatorsStudents` - Todos os estudantes
- `getCoordinatorDetails` - Detalhes do coordenador

#### Comum:
- `generateReport` - Geração de relatórios (PDF/CSV/TXT)

### Tratamento de Erros
- **Usuário não encontrado:** Retorna mensagem amigável
- **Sem dados:** Informa ausência e sugere alternativas  
- **Erro de API:** Trata graciosamente e oferece retry
- **Permissão negada:** Explica limitações e alternativas

---

## 📞 Exemplos de Integração Frontend

### React/JavaScript
```javascript
const sendMessage = async (message, userId) => {
  const response = await fetch('/chat/open', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      message,
      userId,
      channel: 'web'
    })
  });
  
  const data = await response.json();
  return data.response;
};
```

### Tratamento de Respostas
```javascript
const handleChatResponse = (response) => {
  if (response.success) {
    displayMessage(response.response);
  } else {
    showError(response.error);
  }
};
```

---

## ✅ Status dos Sistemas

- 🟢 **Chat Fechado** - Funcionando perfeitamente
- 🟢 **Chat Aberto** - Funcionando perfeitamente  
- 🟢 **Chat API** - Funcionando perfeitamente (com dados reais)
- 🟢 **IA Tools** - Todas funcionais
- 🟢 **Relatórios** - Sistema completo
- 🟢 **Permissões** - Implementadas corretamente
- 🟢 **Autenticação** - Token validado e funcional
- 🟢 **Conectividade** - API externa respondendo

**Última atualização:** 13/08/2025
**Versão da API:** 1.0.0
**Status geral:** ✅ SISTEMA PRONTO PARA PRODUÇÃO