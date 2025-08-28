@echo off
echo Configurando servidor para usar DADOS REAIS DE STAGING...
echo USE_API_DATA=true > temp_env.txt
echo GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyBHoB-eD_JXAeCxKXNXW8NKRsp-35o2Hbg  >> temp_env.txt
echo API_BASE_URL=http://localhost:3001 >> temp_env.txt
copy temp_env.txt .env > nul
del temp_env.txt
echo ✅ Configurado para REAL API DATA
echo 📋 Agora use: test-api-chat.ts e test-hybrid-staging.ts