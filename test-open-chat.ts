import axios from 'axios';
import * as readline from 'readline';

/* const API_URL = 'http://localhost:3001/chat/open'; */
const API_URL = 'https://chatbot-api-32gp.onrender.com/chat/open';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function startChat() {
  console.log('--- Iniciando teste do Chat Aberto (IA) ---');
  
  console.log('\nUse um dos CPFs abaixo para simular o login de um usuário:');
  console.log('------------------------------------------------------------------');
  console.log('👤 Coordenadora (Acesso Total):');
  console.log('   - Prof. Daniela Moura (CPF: 111.111.111-11)');
  console.log('\n👥 Demais Usuários (Acesso limitado aos próprios dados):');
  console.log('   - Dr. João Carlos Oliveira (CPF: 98765432100)');
  console.log('   - Dra. Maria Eduarda Silva (CPF: 87654321099)');
  console.log('   - Dr. Rafael Costa Lima (CPF: 76543210988)');
  console.log('   - Dr. Gustavo Andrade (CPF: 11223344556)');
  console.log('   - Dra. Helena Ribeiro (CPF: 22334455667)');
  console.log('   - Dr. Eduardo Martins (CPF: 33445566778)');
  console.log('   - Alice Ferreira (CPF: 55443322100)');
  console.log('   - Bruno Lima (CPF: 44332211099)');
  console.log('   - Camila Rocha (CPF: 33221100988)');
  console.log('------------------------------------------------------------------\n');
  
  const userIdentifier = await askQuestion('Qual CPF você quer usar para "logar"? ');
  if (!userIdentifier) {
    console.log('CPF inválido. Encerrando.');
    rl.close();
    return;
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(' Passo 2: Faça perguntas sobre os dados abaixo (disponíveis via API Mock):');
  console.log('--------------------------------------------------------------------------------');
  console.log('🕵️  Profissionais (visão do coordenador): Dr. Gustavo, Dra. Helena, Dr. Eduardo');
  console.log('🎓 Alunos (visão do coordenador): Alice Ferreira (55443322100), Bruno Lima, Camila Rocha');
  console.log('👨‍⚕️  Profissionais (visão de um aluno): Dr. João Carlos, Dra. Maria Eduarda, Dr. Rafael');
  console.log('--------------------------------------------------------------------------------');
  console.log('\n📊 TESTANDO GERAÇÃO DE PDF:');
  console.log('--------------------------------------------------------------------------------');
  console.log('1️⃣ Primeiro faça uma pergunta para buscar dados (ex: "quais minhas atividades")');
  console.log('2️⃣ Depois peça o relatório (ex: "gere um relatório em PDF")');
  console.log('3️⃣ A IA retornará um link de download válido');
  console.log('');
  console.log('💡 Exemplos de comandos para relatórios:');
  console.log('   • "gere um relatório em PDF"');
  console.log('   • "quero baixar esses dados em CSV"');
  console.log('   • "exporte isso em TXT"');
  console.log('   • "preciso de um relatório"');
  console.log('--------------------------------------------------------------------------------');

  console.log(`\n✅ Login simulado com CPF: ${userIdentifier}. Agora você pode fazer perguntas.`);
  console.log('   Lembre-se: as respostas e permissões dependem do perfil deste CPF.');
  console.log('   Digite "sair" a qualquer momento para terminar.');
  console.log('\n🔗 IMPORTANTE: Links de download gerados:');
  console.log('   • Os links retornados são válidos e podem ser acessados no navegador');
  console.log('   • Formato: http://localhost:3001/reports/from-cache/{id}/{formato}');
  console.log('   • Copie e cole o link no navegador para baixar o arquivo');
  
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
          userId: userIdentifier, // Send the CPF as the user identifier
          channel: 'web',
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const { response: apiResponse, success } = response.data;

      if (success) {
        console.log(`\n🤖 Chatbot: ${apiResponse}`);
        
        // Detectar e destacar links de download
        if (apiResponse.includes('http://localhost:3001/reports/')) {
          console.log('\n🎉 LINK DE DOWNLOAD GERADO!');
          console.log('💡 Copie o link acima e cole no seu navegador para baixar o arquivo.');
          console.log('📁 O arquivo será baixado automaticamente quando você acessar o link.');
        }
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