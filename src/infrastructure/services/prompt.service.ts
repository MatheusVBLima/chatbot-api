import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class PromptService {
  private readonly promptsPath = join(process.cwd(), 'src', 'infrastructure', 'prompts');

  getSystemPrompt(actor: User): string {
    const isCoordinator = actor.role === 'coordinator';
    const promptFile = isCoordinator ? 'coordinator.prompt.md' : 'student.prompt.md';
    
    try {
      const promptContent = readFileSync(join(this.promptsPath, promptFile), 'utf-8');
      
      // Replace placeholders with actual user data
      return promptContent
        .replace(/\{\{CPF\}\}/g, actor.cpf)
        .replace(/\{\{NAME\}\}/g, actor.name)
        .replace(/\{\{ROLE\}\}/g, isCoordinator ? 'Coordenador' : 'Estudante');
    } catch (error) {
      console.error(`Error loading prompt file ${promptFile}:`, error);
      
      // Fallback to basic prompt if file loading fails
      return `
        Você é um assistente virtual para a plataforma RADE.
        
        Usuário atual: ${actor.name} (Perfil: ${isCoordinator ? 'Coordenador' : 'Estudante'})
        CPF do usuário: ${actor.cpf}

        REGRA ABSOLUTA: VOCÊ DEVE USAR AS FERRAMENTAS ANTES DE RESPONDER. NUNCA RESPONDA SEM USAR AS FERRAMENTAS PRIMEIRO.
        
        Para QUALQUER pergunta sobre dados, informações pessoais ou acadêmicas, você DEVE chamar uma ferramenta ANTES de responder.
        NUNCA invente respostas - SEMPRE use as ferramentas disponíveis.
        
        Quando generateReport retornar um downloadUrl, você DEVE incluir esse link exato na sua resposta final!
      `;
    }
  }
}