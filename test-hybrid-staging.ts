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
  AWAITING_COORDINATOR_CPF = 'AWAITING_COORDINATOR_CPF',
  STUDENT_MENU = 'STUDENT_MENU',
  AWAITING_STUDENT_MENU_CHOICE = 'AWAITING_STUDENT_MENU_CHOICE',
  AWAITING_STUDENT_HELP_CHOICE = 'AWAITING_STUDENT_HELP_CHOICE',
  COORDINATOR_MENU = 'COORDINATOR_MENU',
  AWAITING_COORDINATOR_MENU_CHOICE = 'AWAITING_COORDINATOR_MENU_CHOICE',
  AWAITING_COORDINATOR_HELP_CHOICE = 'AWAITING_COORDINATOR_HELP_CHOICE',
  AWAITING_NEW_USER_DETAILS = 'AWAITING_NEW_USER_DETAILS',
  // AI states with phone auth
  AWAITING_AI_USER_TYPE = 'AWAITING_AI_USER_TYPE',
  AWAITING_AI_CPF = 'AWAITING_AI_CPF',
  AWAITING_AI_PHONE = 'AWAITING_AI_PHONE',
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

// Authentication functions with phone validation
async function authenticateStudent(cpf: string, phone: string): Promise<{ token: string | null; userData: any }> {
  try {
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
      const studentPhone = response.data.studentPhone || '';
      // Remove formatting and compare
      const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
      
      if (normalizePhone(studentPhone) === normalizePhone(phone)) {
        return {
          token: 'student_authenticated',
          userData: response.data
        };
      } else {
        return { token: null, userData: null };
      }
    }
    return { token: null, userData: null };
  } catch (error) {
    return { token: null, userData: null };
  }
}

async function authenticateCoordinator(cpf: string, phone: string): Promise<{ token: string | null; userData: any }> {
  try {
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
      const coordinatorPhone = response.data.coordinatorPhone || '';
      // Remove formatting and compare
      const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
      
      if (normalizePhone(coordinatorPhone) === normalizePhone(phone)) {
        return {
          token: 'coordinator_authenticated',
          userData: response.data
        };
      } else {
        return { token: null, userData: null };
      }
    }
    return { token: null, userData: null };
  } catch (error) {
    return { token: null, userData: null };
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

      case ChatFlowState.AWAITING_COORDINATOR_CPF:
        return this.handleCoordinatorCpfResponse(message, state!);

      case ChatFlowState.AWAITING_STUDENT_MENU_CHOICE:
        return this.handleStudentMenuChoice(message, state!);

      case ChatFlowState.AWAITING_STUDENT_HELP_CHOICE:
        return this.handleStudentHelpChoice(message, state!);

      case ChatFlowState.AWAITING_COORDINATOR_MENU_CHOICE:
        return this.handleCoordinatorMenuChoice(message, state!);

      case ChatFlowState.AWAITING_COORDINATOR_HELP_CHOICE:
        return this.handleCoordinatorHelpChoice(message, state!);

      case ChatFlowState.AWAITING_NEW_USER_DETAILS:
        return this.handleNewUserDetails(message, state!);

      // New AI flow states
      case ChatFlowState.AWAITING_AI_USER_TYPE:
        return this.handleAiUserTypeResponse(message, state!);

      case ChatFlowState.AWAITING_AI_CPF:
        return this.handleAiCpfResponse(message, state!);

      case ChatFlowState.AWAITING_AI_PHONE:
        return await this.handleAiPhoneResponse(message, state!);

      case ChatFlowState.AI_CHAT:
        return await this.handleAiChat(message, state!);

      default:
        return this.handleStart();
    }
  }

  private handleStart(): { response: string; nextState: ChatState } {
    const response = `Olá! Bem-vindo ao atendimento RADE! Para começar, me diga qual seu perfil:

1 - Sou Estudante
2 - Sou Coordenador  
3 - Ainda não sou usuário`;

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
      return {
        response: 'Entendido. Para continuar, por favor, informe seu CPF (apenas números).',
        nextState: {
          currentState: ChatFlowState.AWAITING_COORDINATOR_CPF,
          data: state.data,
        },
      };
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

    // Invalid choice
    const response = `Desculpe, não entendi sua resposta. Por favor, escolha uma das opções (1, 2 ou 3):
1 - Sou Estudante
2 - Sou Coordenador
3 - Ainda não sou usuário`;
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

  private async handleCoordinatorCpfResponse(message: string, state: ChatState): Promise<{ response: string; nextState: ChatState }> {
    const cpf = message.trim();
    
    // For now, just show menu (in real app would validate via API)
    return this.showCoordinatorMenu({ ...state.data, coordinatorCpf: cpf });
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
2 - Não, preciso de mais ajuda
3 - Voltar ao menu anterior`;
      return {
        response,
        nextState: {
          currentState: ChatFlowState.AWAITING_STUDENT_HELP_CHOICE,
          data: state.data,
        },
      };
    }

    if (choice === '7') {
      // AI option for student
      return {
        response: 'Agora, informe seu número de telefone (com DDD):\n\nOu digite "voltar" para retornar ao menu anterior.',
        nextState: {
          currentState: ChatFlowState.AWAITING_AI_PHONE,
          data: { ...state.data, userType: 'student' },
        },
      };
    }

    if (choice === '8') {
      // Voltar ao menu inicial
      return this.handleStart();
    }

    if (choice === '9') {
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

    if (choice === '3') {
      return this.showStudentMenu(state.data);
    }

    return {
      response: 'Resposta inválida. Por favor, escolha uma das opções (1, 2 ou 3).',
      nextState: state,
    };
  }

  private handleCoordinatorMenuChoice(message: string, state: ChatState): { response: string; nextState: ChatState } {
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
2 - Não, preciso de mais ajuda
3 - Voltar ao menu anterior`;
      return {
        response,
        nextState: {
          currentState: ChatFlowState.AWAITING_COORDINATOR_HELP_CHOICE,
          data: state.data,
        },
      };
    }

    if (choice === '5') {
      // AI option for teacher/coordinator
      return {
        response: 'Agora, informe seu número de telefone (com DDD):\n\nOu digite "voltar" para retornar ao menu anterior.',
        nextState: {
          currentState: ChatFlowState.AWAITING_AI_PHONE,
          data: { ...state.data, userType: 'coordinator' },
        },
      };
    }

    if (choice === '6') {
      // Voltar ao menu inicial
      return this.handleStart();
    }

    if (choice === '7') {
      return {
        response: 'Compreendido. Estou encerrando nosso atendimento.',
        nextState: { currentState: ChatFlowState.END, data: {} },
      };
    }

    return {
      response: 'Opção inválida. Por favor, escolha um número do menu de coordenador.',
      nextState: state,
    };
  }

  private handleCoordinatorHelpChoice(message: string, state: ChatState): { response: string; nextState: ChatState } {
    const choice = message.trim();
    if (choice === '1') {
      return this.showCoordinatorMenu(state.data);
    }

    if (choice === '2') {
      return {
        response: 'Compreendido. Estou te encaminhando para um de nossos especialistas.',
        nextState: { currentState: ChatFlowState.END, data: {} },
      };
    }

    if (choice === '3') {
      return this.showCoordinatorMenu(state.data);
    }

    return {
      response: 'Resposta inválida. Por favor, escolha uma das opções (1, 2 ou 3).',
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
        response: 'Por favor, informe seu CPF (apenas números):',
        nextState: {
          currentState: ChatFlowState.AWAITING_AI_CPF,
          data: { ...state.data, userType: 'student' },
        },
      };
    }

    if (choice === '2') {
      return {
        response: 'Por favor, informe seu CPF (apenas números):',
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

  private handleAiCpfResponse(message: string, state: ChatState): { response: string; nextState: ChatState } {
    const cpf = message.trim();

    return {
      response: 'Agora, informe seu número de telefone (com DDD):',
      nextState: {
        currentState: ChatFlowState.AWAITING_AI_PHONE,
        data: { ...state.data, userCpf: cpf },
      },
    };
  }

  private async handleAiPhoneResponse(message: string, state: ChatState): Promise<{ response: string; nextState: ChatState }> {
    const phone = message.trim();
    
    if (phone.toLowerCase() === 'sair') {
      return {
        response: 'Atendimento encerrado. Obrigado!',
        nextState: { currentState: ChatFlowState.END, data: {} },
      };
    }
    
    if (phone.toLowerCase() === 'voltar') {
      const userType = state.data.userType;
      if (userType === 'student') {
        return this.showStudentMenu(state.data);
      } else if (userType === 'coordinator') {
        return this.showCoordinatorMenu(state.data);
      }
    }
    
    const userType = state.data.userType;
    const cpf = state.data.studentCpf || state.data.coordinatorCpf || state.data.userCpf;

    let authResult: { token: string | null; userData: any };

    if (userType === 'student') {
      authResult = await authenticateStudent(cpf, phone);
    } else if (userType === 'coordinator') {
      authResult = await authenticateCoordinator(cpf, phone);
    } else {
      return {
        response: 'Erro interno. Por favor, tente novamente.',
        nextState: state,
      };
    }

    if (!authResult.token) {
      const menuOption = userType === 'student' ? 'menu' : 'menu';
      return {
        response: `CPF ou telefone não conferem. Verifique os dados e tente novamente.

Digite "voltar" para retornar ao menu anterior ou "sair" para encerrar.`,
        nextState: state,
      };
    }

    const welcomeMessage = `Autenticado com sucesso! Como posso ajudá-lo?\n\nDigite "voltar" para retornar ao menu principal ou "sair" para encerrar.`;

    return {
      response: welcomeMessage,
      nextState: {
        currentState: ChatFlowState.AI_CHAT,
        data: { ...state.data, userToken: authResult.token, userCpf: cpf },
      },
    };
  }

  private async handleAiChat(message: string, state: ChatState): Promise<{ response: string; nextState: ChatState }> {
    if (message.toLowerCase().trim() === 'sair') {
      return {
        response: 'Atendimento encerrado. Obrigado!',
        nextState: { currentState: ChatFlowState.END, data: {} },
      };
    }

    if (message.toLowerCase().trim() === 'voltar') {
      const userType = state.data.userType;
      if (userType === 'student') {
        return this.showStudentMenu(state.data);
      } else if (userType === 'coordinator') {
        return this.showCoordinatorMenu(state.data);
      }
      return this.handleStart();
    }

    try {

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
        let fullResponse = apiResponse;
        
        // Detect and highlight download links
        if (apiResponse.includes('http://localhost:3001/reports/') || apiResponse.includes('https://api.stg.radeapp.com/reports/')) {
          fullResponse += `\n\n📎 Link para download gerado. Copie o link acima e cole no navegador.`;
        }

        return {
          response: fullResponse,
          nextState: state,
        };
      } else {
        return {
          response: `Erro: ${apiResponse}`,
          nextState: state,
        };
      }
    } catch (error) {
      return {
        response: `Erro ao contatar o serviço. Tente novamente.`,
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
7 - Conversar com Atendente Virtual
8 - Voltar ao menu inicial
9 - Encerrar atendimento`,
      nextState: {
        currentState: ChatFlowState.AWAITING_STUDENT_MENU_CHOICE,
        data,
      },
    };
  }

  private showCoordinatorMenu(data: any): { response: string; nextState: ChatState } {
    return {
      response: `Bem-vindo, coordenador! Como posso ajudar hoje?
1 - Como validar atividades
2 - Como realizar avaliação
3 - Como agendar retroativo
4 - Como gerar QR code
5 - Conversar com Atendente Virtual
6 - Voltar ao menu inicial
7 - Encerrar atendimento`,
      nextState: {
        currentState: ChatFlowState.AWAITING_COORDINATOR_MENU_CHOICE,
        data,
      },
    };
  }
}


async function startHybridChat() {
  console.log('=== RADE Chatbot ===\n');
  console.log('🌐 Sistema de Atendimento Virtual\n');
  

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