// Script de teste para a API do Chatbot
// Execute: node test-api.js (com o servidor rodando)

interface TestMessage {
    message: string;
    channel: string;
    userId?: string;
    email?: string;
    phone?: string;
}

const testChatbot = async () => {
    const baseUrl = 'http://localhost:3000';

    // Teste 1: Health Check
    console.log('🔍 Testando Health Check...');
    try {
        const healthResponse = await fetch(`${baseUrl}/chat/health`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const healthData = await healthResponse.json();
        console.log('✅ Health Check:', healthData);
    } catch (error) {
        console.log('❌ Health Check falhou:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Teste 2: Mensagens com usuário existente
    console.log('🤖 Testando mensagens do chatbot...');

    // ADICIONE SUAS PERGUNTAS DE TESTE AQUI
    const testMessages: TestMessage[] = [
        // Perguntas básicas sobre dados pessoais
        /*    {
               message: "Qual é o meu nome?",
               userId: "1",
               channel: "web"
           },
           {
               message: "Qual é o meu email?",
               userId: "1",
               channel: "web"
           },
           {
               message: "Qual é o meu telefone?",
               userId: "1",
               channel: "web"
           },
           {
               message: "Qual é o meu CPF?",
               userId: "1",
               channel: "web"
           },
   
           // Perguntas sobre endereço
           {
               message: "Qual é o meu endereço completo?",
               userId: "1",
               channel: "web"
           },
           {
               message: "Em que cidade eu moro?",
               userId: "1",
               channel: "web"
           },
           {
               message: "Qual é o meu CEP?",
               userId: "1",
               channel: "web"
           },
   
           // Perguntas sobre datas
           {
               message: "Quando me cadastrei?",
               userId: "1",
               channel: "web"
           },
           {
               message: "Qual é a minha data de nascimento?",
               userId: "1",
               channel: "web"
           },
           {
               message: "Quando atualizei meus dados pela última vez?",
               userId: "1",
               channel: "web"
           },
   
           // Perguntas mais complexas
           {
               message: "Há quanto tempo sou cliente?",
               userId: "1",
               channel: "web"
           },
           {
               message: "Qual é a minha idade?",
               userId: "1",
               channel: "web"
           },
           {
               message: "Meus dados estão atualizados?",
               userId: "1",
               channel: "web"
           },
   
           // Teste com usuário 2 (Maria Santos)
           {
               message: "Qual é o meu nome?",
               userId: "2",
               channel: "web"
           },
           {
               message: "Onde eu moro?",
               userId: "2",
               channel: "web"
           },
   
           // Teste com telefone
           {
               message: "Qual é o meu nome?",
               phone: "+5511999999999",
               channel: "whatsapp"
           }, */

        // Teste com email
        {
            message: "Quais são os meus dados cadastrais?",
            email: "maria.santos@email.com",
            channel: "web"
        },
        {
            message: "Qual o melhor time de futebol?",
            email: "maria.santos@email.com",
            channel: "web"
        },
        {

            message: "Fale brevemente sobre machado de assis",
            userId: '1',
            channel: "web"

        }

        // ADICIONE MAIS PERGUNTAS AQUI CONFORME NECESSÁRIO
        // Exemplo de novas perguntas que você pode adicionar:
        /*
        {
          message: "Preciso atualizar meu telefone, como faço?",
          userId: "1",
          channel: "web"
        },
        {
          message: "Quais documentos tenho cadastrados?",
          userId: "1",
          channel: "web"
        },
        {
          message: "Como posso alterar meu endereço?",
          userId: "1",
          channel: "web"
        },
        */
    ];

    // Executar todos os testes
    for (const testMessage of testMessages) {
        try {
            console.log(`\n📤 Enviando: "${testMessage.message}"`);
            console.log(`👤 Usuário: ${testMessage.userId || testMessage.phone || testMessage.email}`);

            const response = await fetch(`${baseUrl}/chat/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testMessage)
            });

            const data = await response.json();

            if (data.success) {
                console.log(`✅ Resposta: ${data.response}`);
            } else {
                console.log(`❌ Erro: ${data.error}`);
                console.log(`📝 Resposta: ${data.response}`);
            }

            console.log('-'.repeat(40));
        } catch (error) {
            console.log(`❌ Erro na requisição: ${error.message}`);
        }
    }

    // Teste 3: Usuário não encontrado
    console.log('\n🔍 Testando usuário não encontrado...');
    try {
        const response = await fetch(`${baseUrl}/chat/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Qual é o meu nome?",
                userId: "999",
                channel: "web"
            })
        });

        const data = await response.json();
        console.log(`📝 Resposta para usuário inexistente: ${data.response}`);
        console.log(`✅ Success: ${data.success}`);
    } catch (error) {
        console.log(`❌ Erro: ${error.message}`);
    }

    console.log('\n🎉 Testes concluídos!');
};

// Executar os testes
testChatbot().catch(console.error); 