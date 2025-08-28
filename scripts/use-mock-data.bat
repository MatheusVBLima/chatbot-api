@echo off
echo Configurando servidor para usar DADOS MOCK...
echo USE_API_DATA=false > temp_env.txt
echo GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyBHoB-eD_JXAeCxKXNXW8NKRsp-35o2Hbg  >> temp_env.txt
echo API_BASE_URL=http://localhost:3001 >> temp_env.txt
copy temp_env.txt .env > nul
del temp_env.txt
echo ✅ Configurado para MOCK DATA
echo 📋 Agora use: test-open-chat.ts e test-closed-chat.ts