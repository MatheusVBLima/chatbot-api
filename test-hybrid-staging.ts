import axios from 'axios';
import * as readline from 'readline';

// Base URLs
const CHAT_API_URL = 'https://api.stg.radeapp.com/chat/closed';
const AUTH_API_URL = 'https://api.stg.radeapp.com';
const AI_CHAT_URL = 'http://localhost:3001/chat/open';

// Flow states
enum ChatFlowState {
  START = 'START',
  AWAITING_USER_TYPE = 'AWAITING_USER_TYPE',
  AWAITING_STUDENT_CPF = 'AWAITING_STUDENT_CPF',
  STUDENT_MENU = 'STUDENT_MENU',
  AWAITING_STUDENT_MENU_CHOICE = 'AWAITING_STUDENT_MENU_CHOICE',
  AWAITING_STUDENT_HELP_CHOICE = 'AWAITING_STUDENT_HELP_CHOICE',
  TEACHER_MENU = 'TEACHER_MENU',
  AWAITING_TEACHER_MENU_CHOICE = 'AWAITING_TEACHER_MENU_CHOICE',
  AWAITING_TEACHER_HELP_CHOICE = 'AWAITING_TEACHER_HELP_CHOICE',
  AWAITING_NEW_USER_DETAILS = 'AWAITING_NEW_USER_DETAILS',
  // New AI states
  AWAITING_AI_USER_TYPE = 'AWAITING_AI_USER_TYPE',
  AWAITING_AI_CPF = 'AWAITING_AI_CPF',
  AI_CHAT = 'AI_CHAT',
  END = 'END',
}

interface ChatState {
  currentState: ChatFlowState;
  data: {
    [key: string]: any;
    studentId?: string;
    userToken?: string;
    userType?: 'student' | 'coordinator';
  };
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Authentication functions
async function authenticateStudent(cpf: string): Promise<string | null> {
  try {
    console.log(`🔐 Autenticando estudante com CPF: ${cpf}...`);
    const response = await axios.get(
      `${AUTH_API_URL}/virtual-assistance/students/${cpf}`,
      {
        headers: {
          'Authorization': 'JQiFrDkkM5eNKtLxwNKzZoga0xkeRDAZ',
          'Content-Type': 'application/json'
        }
      }
    );
    if (response.data) {
      console.log(`✅ Estudante autenticado: ${response.data.studentName || 'Nome não disponível'}`);
      return 'student_authenticated'; // In real app, this would be a JWT token
    }
    return null;
  } catch (error) {
    console.log(`❌ Erro na autenticação: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function authenticateCoordinator(cpf: string): Promise<string | null> {
  try {
    console.log(`🔐 Autenticando coordenador com CPF: ${cpf}...`);
    const response = await axios.get(
      `${AUTH_API_URL}/virtual-assistance/coordinators/${cpf}`,
      {
        headers: {
          'Authorization': 'JQiFrDkkM5eNKtLxwNKzZoga0xkeRDAZ',
          'Content-Type': 'application/json'
        }
      }
    );
    if (response.data) {
      console.log(`✅ Coordenador autenticado: ${response.data.coordinatorName || 'Nome não disponível'}`);
      return 'coordinator_authenticated'; // In real app, this would be a JWT token
    }
    return null;
  } catch (error) {
    console.log(`❌ Erro na autenticação: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// Local flow handler (mimics the closed chat flow)
class LocalChatFlow {
  async handle(message: string, state: ChatState | null): Promise<{ response: string; nextState: ChatState | null }> {
    const currentState = state?.currentState || ChatFlowState.START;

    switch (currentState) {
      case ChatFlowState.START:
        return this.handleStart();

      case ChatFlowState.AWAITING_USER_TYPE:
        return this.handleUserTypeResponse(message, state!);

      case ChatFlowState.AWAITING_STUDENT_CPF:
        return this.handleStudentCpfResponse(message, state!);

      case ChatFlowState.AWAITING_STUDENT_MENU_CHOICE:
        return this.handleStudentMenuChoice(message, state!);

      case ChatFlowState.AWAITING_STUDENT_HELP_CHOICE:
        return this.handleStudentHelpChoice(message, state!);

      case ChatFlowState.AWAITING_TEACHER_MENU_CHOICE:
        return this.handleTeacherMenuChoice(message, state!);

      case ChatFlowState.AWAITING_TEACHER_HELP_CHOICE:
        return this.handleTeacherHelpChoice(message, state!);

      case ChatFlowState.AWAITING_NEW_USER_DETAILS:
        return this.handleNewUserDetails(message, state!);

      // New AI flow states
      case ChatFlowState.AWAITING_AI_USER_TYPE:
        return this.handleAiUserTypeResponse(message, state!);

      case ChatFlowState.AWAITING_AI_CPF:
        return await this.handleAiCpfResponse(message, state!);

      case ChatFlowState.AI_CHAT:
        return await this.handleAiChat(message, state!);

      default:
        return this.handleStart();
    }
  }

  private handleStart(): { response: string; nextState: ChatState } {
    const response = `🤖 Olá! Bem-vindo ao atendimento RADE! Para começar, me diga qual seu perfil:

1 - Sou Estudante
2 - Sou Professor  
3 - Ainda não sou usuário
4 - Conversar com Atendente Virtual (IA) 🧠`;

    return {
      response,
      nextState: {
        currentState: ChatFlowState.AWAITING_USER_TYPE,
        data: {},
      },
    };
  }

  private handleUserTypeResponse(message: string, state: ChatState): { response: string; nextState: ChatState } {
    const choice = message.trim();

    if (choice === '1') {
      return {
        response: 'Entendido. Para continuar, por favor, informe seu CPF (apenas números).',
        nextState: {
          currentState: ChatFlowState.AWAITING_STUDENT_CPF,
          data: state.data,
        },
      };
    }

    if (choice === '2') {
      return this.showTeacherMenu(state.data);
    }

    if (choice === '3') {
      return {
        response: 'Ok. Para realizar seu cadastro inicial, por favor, me diga seu nome completo, CPF, instituição, curso e período, tudo em uma única mensagem.',
        nextState: {
          currentState: ChatFlowState.AWAITING_NEW_USER_DETAILS,
          data: state.data,
        },
      };
    }

    if (choice === '4') {
      // New AI flow
      return {
        response: `🧠 Ótimo! Você escolheu conversar com nossa Inteligência Artificial.

Primeiro, me diga qual seu perfil para eu te dar as permissões certas:
1 - Sou Estudante
2 - Sou Coordenador`,
        nextState: {
          currentState: ChatFlowState.AWAITING_AI_USER_TYPE,
          data: state.data,
        },
      };
    }

    // Invalid choice
    const response = `Desculpe, não entendi sua resposta. Por favor, escolha uma das opções (1, 2, 3 ou 4):
1 - Sou Estudante
2 - Sou Professor
3 - Ainda não sou usuário
4 - Conversar com Atendente Virtual (IA) 🧠`;
    return {
      response,
      nextState: state,
    };
  }

  private async handleStudentCpfResponse(message: string, state: ChatState): Promise<{ response: string; nextState: ChatState }> {
    const cpf = message.trim();
    
    // For now, just show menu (in real app would validate via API)
    return this.showStudentMenu({ ...state.data, studentCpf: cpf });
  }

  private handleStudentMenuChoice(message: string, state: ChatState): { response: string; nextState: ChatState } {
    const choice = message.trim();
    const videoLinks = {
      '1': 'https://www.youtube.com/watch?v=video1_cadastro',
      '2': 'https://www.youtube.com/watch?v=video2_agendamento',
      '3': 'https://www.youtube.com/watch?v=video3_iniciar_finalizar',
      '4': 'https://www.youtube.com/watch?v=video4_avaliacao',
      '5': 'https://www.youtube.com/watch?v=video5_justificar',
      '6': 'https://www.youtube.com/watch?v=video6_tce',
    };

    if (videoLinks[choice]) {
      const response = `Claro! Aqui está o vídeo sobre isso: ${videoLinks[choice]}

O vídeo foi suficiente ou posso ajudar com algo mais?
1 - Sim, foi suficiente
2 - Não, preciso de mais ajuda`;
      return {
        response,
        nextState: {
          currentState: ChatFlowState.AWAITING_STUDENT_HELP_CHOICE,
          data: state.data,
        },
      };
    }

    if (choice === '7') {
      return {
        response: 'Ok, estou encerrando nosso atendimento. Se precisar de algo mais, basta me chamar!',
        nextState: { currentState: ChatFlowState.END, data: {} },
      };
    }

    return {
      response: 'Opção inválida. Por favor, escolha um número do menu.',
      nextState: state,
    };
  }

  private handleStudentHelpChoice(message: string, state: ChatState): { response: string; nextState: ChatState } {
    const choice = message.trim();
    if (choice === '1') {
      return this.showStudentMenu(state.data);
    }

    if (choice === '2') {
      return {
        response: 'Entendido. Estou transferindo você para um de nossos atendentes para te ajudar melhor.',
        nextState: { currentState: ChatFlowState.END, data: {} },
      };
    }

    return {
      response: 'Resposta inválida. Por favor, digite 1 se o vídeo foi suficiente ou 2 se precisar de mais ajuda.',
      nextState: state,
    };
  }

  private handleTeacherMenuChoice(message: string, state: ChatState): { response: string; nextState: ChatState } {
    const choice = message.trim();
    const videoLinks = {
      '1': 'https://www.youtube.com/watch?v=9AQrYArZ-5k',
      '2': 'https://www.youtube.com/watch?v=RkjrtSsEDP8',
      '3': 'https://www.youtube.com/watch?v=TsXVDRszDnY',
      '4': 'https://www.youtube.com/watch?v=bT1Qnk1B8Oo',
    };

    if (videoLinks[choice]) {
      const response = `Certo! Aqui está o vídeo com as instruções: ${videoLinks[choice]}

O vídeo foi útil ou você precisa de mais alguma ajuda?
1 - Sim, foi suficiente
2 - Não, preciso de mais ajuda`;
      return {
        response,
        nextState: {
          currentState: ChatFlowState.AWAITING_TEACHER_HELP_CHOICE,
          data: state.data,
        },
      };
    }

    return {
      response: 'Opção inválida. Por favor, escolha um número do menu de professor.',
      nextState: state,
    };
  }

  private handleTeacherHelpChoice(message: string, state: ChatState): { response: string; nextState: ChatState } {
    const choice = message.trim();
    if (choice === '1') {
      return this.showTeacherMenu(state.data);
    }

    if (choice === '2') {
      return {
        response: 'Compreendido. Estou te encaminhando para um de nossos especialistas.',
        nextState: { currentState: ChatFlowState.END, data: {} },
      };
    }

    return {
      response: 'Resposta inválida. Por favor, digite 1 se o vídeo foi suficiente ou 2 se precisar de mais ajuda.',
      nextState: state,
    };
  }

  private handleNewUserDetails(message: string, state: ChatState): { response: string; nextState: ChatState } {
    return {
      response: 'Obrigado! Seus dados foram recebidos e em breve entraremos em contato para finalizar seu cadastro. O atendimento será encerrado.',
      nextState: {
        currentState: ChatFlowState.END,
        data: {},
      },
    };
  }

  // New AI flow handlers
  private handleAiUserTypeResponse(message: string, state: ChatState): { response: string; nextState: ChatState } {
    const choice = message.trim();

    if (choice === '1') {
      return {
        response: '👨‍🎓 Perfeito! Você escolheu o perfil de Estudante. Agora preciso do seu CPF para fazer a autenticação na API e liberar o acesso aos seus dados.\n\nPor favor, informe seu CPF (apenas números):',
        nextState: {
          currentState: ChatFlowState.AWAITING_AI_CPF,
          data: { ...state.data, userType: 'student' },
        },
      };
    }

    if (choice === '2') {
      return {
        response: '👨‍🏫 Excelente! Você escolheu o perfil de Coordenador. Agora preciso do seu CPF para fazer a autenticação na API e liberar o acesso completo.\n\nPor favor, informe seu CPF (apenas números):',
        nextState: {
          currentState: ChatFlowState.AWAITING_AI_CPF,
          data: { ...state.data, userType: 'coordinator' },
        },
      };
    }

    return {
      response: 'Opção inválida. Por favor, escolha:\n1 - Sou Estudante\n2 - Sou Coordenador',
      nextState: state,
    };
  }

  private async handleAiCpfResponse(message: string, state: ChatState): Promise<{ response: string; nextState: ChatState }> {
    const cpf = message.trim();
    const userType = state.data.userType;

    let token: string | null = null;

    if (userType === 'student') {
      token = await authenticateStudent(cpf);
    } else if (userType === 'coordinator') {
      token = await authenticateCoordinator(cpf);
    }

    if (!token) {
      return {
        response: `❌ CPF não encontrado ou sem permissão para ${userType === 'student' ? 'estudante' : 'coordenador'}. 

Por favor, verifique se:
- O CPF está correto
- Você escolheu o perfil certo
- Você tem acesso ao sistema

Tente novamente ou digite "voltar" para escolher outro perfil:`,
        nextState: state, // Keep same state to allow retry
      };
    }

    const welcomeMessage = userType === 'student' 
      ? `🎉 Autenticação realizada com sucesso! 

Agora você pode conversar comigo sobre seus dados acadêmicos. Posso te ajudar com:
- Suas atividades programadas
- Profissionais que acompanham você  
- Gerar relatórios em PDF/CSV/TXT
- Responder dúvidas sobre seus dados

💡 Exemplos de perguntas:
• "Quais são minhas próximas atividades?"
• "Quem são meus preceptores?"
• "Gere um relatório das minhas atividades em PDF"

Digite sua pergunta ou "sair" para encerrar:`
      : `🎉 Autenticação realizada com sucesso! 

Como coordenador, você tem acesso completo aos dados. Posso te ajudar com:
- Atividades em andamento de todos os estudantes
- Dados de profissionais e estudantes
- Relatórios gerenciais em PDF/CSV/TXT
- Consultas avançadas do sistema

💡 Exemplos de perguntas:
• "Quais atividades estão em andamento?"
• "Listar todos os estudantes"
• "Gere um relatório completo em PDF"

Digite sua pergunta ou "sair" para encerrar:`;

    return {
      response: welcomeMessage,
      nextState: {
        currentState: ChatFlowState.AI_CHAT,
        data: { ...state.data, userToken: token, userCpf: cpf },
      },
    };
  }

  private async handleAiChat(message: string, state: ChatState): Promise<{ response: string; nextState: ChatState }> {
    if (message.toLowerCase().trim() === 'sair') {
      return {
        response: '👋 Obrigado por usar nossa IA! Atendimento encerrado. Volte sempre!',
        nextState: { currentState: ChatFlowState.END, data: {} },
      };
    }

    if (message.toLowerCase().trim() === 'voltar') {
      return this.handleStart();
    }

    try {
      console.log(`\n🤖 Enviando para a IA: "${message}"`);
      console.log(`👤 Usuário: ${state.data.userType} - CPF: ${state.data.userCpf}`);

      const response = await axios.post(
        AI_CHAT_URL,
        {
          message: message,
          userId: state.data.userCpf,
          channel: 'web',
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const { response: apiResponse, success } = response.data;

      if (success) {
        let fullResponse = `🧠 IA: ${apiResponse}`;
        
        // Detect and highlight download links (localhost or staging)
        if (apiResponse.includes('http://localhost:3001/reports/') || apiResponse.includes('https://api.stg.radeapp.com/reports/')) {
          fullResponse += `\n\n🎉 LINK DE DOWNLOAD GERADO!
💡 Copie o link acima e cole no seu navegador para baixar o arquivo.
📁 O arquivo será baixado automaticamente quando você acessar o link.`;
        }

        fullResponse += `\n\n💬 Continue a conversa ou digite "sair" para encerrar:`;

        return {
          response: fullResponse,
          nextState: state, // Keep in AI chat mode
        };
      } else {
        return {
          response: `⚠️ A IA retornou um erro: ${apiResponse}\n\nTente reformular sua pergunta ou digite "sair" para encerrar:`,
          nextState: state,
        };
      }
    } catch (error) {
      console.error('\n🚨 Erro ao contatar a IA:', error.response?.data || error.message);
      return {
        response: `🚨 Erro ao contatar a IA: ${error.response?.data?.message || error.message}\n\nTente novamente ou digite "sair" para encerrar:`,
        nextState: state,
      };
    }
  }


  private showStudentMenu(data: any): { response: string; nextState: ChatState } {
    return {
      response: `Aqui estão as opções que posso te ajudar:
1 - Como fazer meu cadastro
2 - Como agendar minhas atividades
3 - Como iniciar e finalizar atividade
4 - Como fazer uma avaliação
5 - Como justificar atividade perdida
6 - Como preencher meu TCE
7 - Encerrar atendimento`,
      nextState: {
        currentState: ChatFlowState.AWAITING_STUDENT_MENU_CHOICE,
        data,
      },
    };
  }

  private showTeacherMenu(data: any): { response: string; nextState: ChatState } {
    return {
      response: `Bem-vindo, professor! Como posso ajudar hoje?
1 - Como validar atividades
2 - Como realizar avaliação
3 - Como agendar retroativo
4 - Como gerar QR code`,
      nextState: {
        currentState: ChatFlowState.AWAITING_TEACHER_MENU_CHOICE,
        data,
      },
    };
  }
}

async function startHybridChat() {
  console.log('🚀 === TESTE HÍBRIDO STAGING - RADE Chatbot ===');
  console.log('💡 Este teste simula o fluxo completo: Chat estruturado + IA');
  console.log('🔗 Conectando com: api.stg.radeapp.com');
  console.log('🔑 Usando token: JQiFrDkkM5eNKtLxwNKzZoga0xkeRDAZ');
  console.log('=====================================\n');
  
  console.log('📋 CPFs REAIS para teste:');
  console.log('👨‍🎓 ESTUDANTES:');
  console.log('   • 98765432100 - Joaquim José da Silva Xavier (Administração - Wyden Unifavip)');
  console.log('   • 13281598412 - Karla Priscila Negromonte de Queiroz (Eng. Ambiental)');
  console.log('   • 12381436448 - Josefa Andreza Alves da Silva (Eng. Ambiental)');
  console.log('   • 70436988470 - Helaysa Samara Louise Silva (Administração)');
  console.log('   • 11536655490 - Bruno Washington Santos Silva (Arquitetura)');
  console.log('👨‍🏫 COORDENADOR:');
  console.log('   • 05631761483 - Ana Maraiza de Sousa Silva (134 estudantes, 4 profissionais)');
  console.log('=====================================\n');

  const flow = new LocalChatFlow();
  let currentState: ChatState | null = null;
  let running = true;

  while (running) {
    try {
      let message: string;
      
      if (!currentState) {
        // First interaction
        const { response, nextState } = await flow.handle('', null);
        console.log(response);
        currentState = nextState;
        message = await askQuestion('\nSua escolha: ');
      } else {
        message = await askQuestion('\nSua mensagem: ');
      }

      const { response, nextState } = await flow.handle(message, currentState);
      console.log(`\n${response}`);
      
      currentState = nextState;
      
      if (nextState?.currentState === ChatFlowState.END || nextState === null) {
        running = false;
      }

    } catch (error) {
      console.error('\n🚨 Erro inesperado:', error.message);
      running = false;
    }
  }

  rl.close();
}

startHybridChat();