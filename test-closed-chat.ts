import axios from 'axios';
import * as readline from 'readline';

// The URL of your running NestJS API
const API_URL = 'http://localhost:3000/chat/closed';

// Interface to match the structure of the API's state object
interface ChatState {
  currentState: string;
  data: Record<string, any>;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompts the user for input and returns it as a promise.
 * @param query The prompt message to display to the user.
 */
function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * The main loop for the interactive test chat.
 */
async function startChat() {
  console.log('--- Iniciando teste do Chat Fechado ---');
  console.log('Digite "sair" a qualquer momento para terminar.');
  
  let currentState: ChatState | null = null;
  let running = true;

  while (running) {
    try {
      // The first message has no state and an empty message
      const message = currentState ? await askQuestion('\nSua resposta: ') : '';

      if (message.toLowerCase() === 'sair') {
        running = false;
        break;
      }

      const response = await axios.post(
        API_URL,
        {
          message: message,
          state: currentState,
          channel: 'web', // Channel can be fixed for this test
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const { response: apiResponse, nextState } = response.data;

      console.log(`\n🤖 Chatbot: ${apiResponse}`);
      
      currentState = nextState;

      // End the loop if the flow reaches the END state
      if (currentState?.currentState === 'END') {
        console.log('\n--- Fim do Fluxo ---');
        running = false;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('\n🚨 Erro ao contatar a API:', error.response?.data || error.message);
      } else {
        console.error('\n🚨 Ocorreu um erro inesperado:', error);
      }
      running = false;
    }
  }

  rl.close();
}

startChat(); 