import axios from 'axios';
import * as readline from 'readline';

const API_URL = 'http://localhost:3001/chat/api';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function startChat() {
  console.log('--- Iniciando teste do Chat API (Dados Reais) ---');
  
  console.log('\nUse um dos CPFs abaixo para conectar com a API real:');
  console.log('------------------------------------------------------------------');
  console.log('👤 Coordenadores (podem ver dados de estudantes e profissionais):');
  console.log('   - 111.111.111-11 (Prof. Daniela Moura)');
  console.log('   - ou qualquer CPF de coordenador válido na API');
  console.log('\n👥 Estudantes/Profissionais (veem apenas seus próprios dados):');
  console.log('   - CPFs de estudantes ou profissionais cadastrados na API');
  console.log('------------------------------------------------------------------\n');
  
  const userIdentifier = await askQuestion('Qual CPF você quer usar para conectar com a API? ');
  if (!userIdentifier) {
    console.log('CPF inválido. Encerrando.');
    rl.close();
    return;
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(' Este chat conecta diretamente com a API em api.radeapp.com');
  console.log(' Os dados são obtidos em tempo real, não são mockados!');
  console.log('--------------------------------------------------------------------------------');
  console.log('📊 Perguntas sugeridas:');
  console.log('   - "Quais são minhas atividades programadas?"');
  console.log('   - "Mostre as atividades em andamento dos estudantes"');
  console.log('   - "Quem são meus preceptores?"');
  console.log('   - "Liste os profissionais do meu grupo"');
  console.log('   - "Qual minha próxima atividade?"');
  console.log('--------------------------------------------------------------------------------');

  console.log(`\n✅ Conectando com a API usando CPF: ${userIdentifier}`);
  console.log('   Digite "sair" a qualquer momento para terminar.');
  
  let running = true;

  while (running) {
    try {
      const message = await askQuestion('\nSua pergunta: ');

      if (message.toLowerCase() === 'sair') {
        running = false;
        break;
      }

      console.log('\n🔄 Consultando API...');
      
      const response = await axios.post(
        API_URL,
        {
          message: message,
          userId: userIdentifier,
          channel: 'web',
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000, // 30 seconds timeout for API calls
        },
      );

      const { response: apiResponse, success } = response.data;

      if (success) {
        console.log(`\n🤖 Assistente Virtual: ${apiResponse}`);
      } else {
        console.warn(`\n⚠️  API retornou um erro: ${apiResponse}`);
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          console.error('\n🚨 Erro: Não foi possível conectar ao servidor local.');
          console.error('   Certifique-se de que o servidor está rodando em http://localhost:3001');
        } else if (error.response?.status === 400) {
          console.error('\n🚨 Erro 400 - Requisição inválida:', error.response?.data?.message || 'Dados inválidos');
        } else if (error.response?.status === 401) {
          console.error('\n🚨 Erro 401 - Não autorizado. Verifique o CPF informado.');
        } else if (error.response?.status === 500) {
          console.error('\n🚨 Erro 500 - Erro interno do servidor:', error.response?.data?.message || 'Erro interno');
        } else {
          console.error('\n🚨 Erro ao contatar a API:', error.response?.data || error.message);
        }
      } else {
        console.error('\n🚨 Ocorreu um erro inesperado:', error);
      }
      
      // Don't exit on error, let user try again
      console.log('💡 Tente novamente com uma pergunta diferente.');
    }
  }

  rl.close();
}

startChat();