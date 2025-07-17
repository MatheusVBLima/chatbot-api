import axios from 'axios';
import * as readline from 'readline';

const API_URL = 'http://localhost:3000/chat/open';
// const API_URL = 'https://chatbot-api-32gp.onrender.com/chat/open';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function startChat() {
  console.log('--- Iniciando teste do Chat Aberto (IA) ---');
  
  const userId = await askQuestion('Qual ID de usuário você quer simular? (1: João Coordenador, 2: Maria, 3: Carlos, 4: Ana, 5: Lucas): ');
  if (!userId) {
    console.log('ID de usuário inválido. Encerrando.');
    rl.close();
    return;
  }

  console.log(`\nSimulando como usuário ${userId}. Você pode começar a fazer perguntas.`);
  console.log('Digite "sair" a qualquer momento para terminar.');
  
  let running = true;

  while (running) {
    try {
      const message = await askQuestion('\nSua pergunta: ');

      if (message.toLowerCase() === 'sair') {
        running = false;
        break;
      }

      const response = await axios.post(
        API_URL,
        {
          message: message,
          userId: userId, // Using the selected user ID
          channel: 'web',
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const { response: apiResponse, success } = response.data;

      if (success) {
        console.log(`\n🤖 Chatbot: ${apiResponse}`);
      } else {
        console.warn(`\n⚠️  API retornou um erro: ${apiResponse}`);
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