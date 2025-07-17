import { Injectable, Inject } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AIService } from '../../domain/services/ai.service';
import { User } from '../../domain/entities/user.entity';

export interface ProcessOpenChatMessageRequest {
  message: string;
  userId?: string;
  phone?: string;
  email?: string;
  channel: 'web' | 'whatsapp' | 'telegram';
}

export interface ProcessOpenChatMessageResponse {
  response: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class ProcessOpenChatMessageUseCase {
  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
    @Inject('AIService') private readonly aiService: AIService,
  ) {}

  async execute(request: ProcessOpenChatMessageRequest): Promise<ProcessOpenChatMessageResponse> {
    try {
      // 1. Identify the user making the request (the "actor")
      let actor: User | null = null;
      
      if (request.userId) {
        actor = await this.userRepository.findById(request.userId);
      } else if (request.phone) {
        actor = await this.userRepository.findByPhone(request.phone);
      } else if (request.email) {
        actor = await this.userRepository.findByEmail(request.email);
      }

      if (!actor) {
        return {
          response: 'Desculpe, não consegui te identificar. Verifique se suas informações de acesso estão corretas.',
          success: false,
          error: 'Actor not found'
        };
      }
      
      // 2. Identify all potential target users for the query if the actor is a coordinator.
      let targetUsers: User[] = [];
      if (actor.role === 'coordinator') {
        const targetIds = this.extractTargetIds(request.message);
        const targetNames = await this.extractAllTargetNames(request.message, actor.name);
        
        const usersFromIds = await Promise.all(targetIds.map(id => this.userRepository.findById(id)));
        const usersFromNames = await Promise.all(targetNames.map(name => this.findUserByName(name)));

        const allTargets = [...usersFromIds, ...usersFromNames];
        const validTargetsMap = new Map<string, User>();
        allTargets.forEach(user => {
            // Include valid users who are not the actor
            if (user && user.id !== actor.id) {
                validTargetsMap.set(user.id, user);
            }
        });
        targetUsers = Array.from(validTargetsMap.values());
      }
      
      // 3. Handle report generation directly if requested
      const isReportRequest = /relat[oó]rio/i.test(request.message);
      if (isReportRequest) {
        let targetsForReport: User[] = [];

        // If the query was for multiple users (e.g., "relatório dos usuários 2 e 4")
        if (targetUsers.length > 0) {
            targetsForReport = targetUsers;
        } 
        // If the query was for a single named user (e.g., "relatório de Maria")
        else {
            const singleTargetName = this.extractSingleTargetName(request.message);
            if (singleTargetName && actor.role === 'coordinator') {
                const foundTarget = await this.findUserByName(singleTargetName);
                if (foundTarget) {
                    targetsForReport.push(foundTarget);
                }
            } else if (!singleTargetName) { // Report about the actor themselves
                 targetsForReport.push(actor);
            }
        }
        
        if (targetsForReport.length > 1) {
            // MULTI-USER consolidated report
            const userIds = targetsForReport.map(u => u.id).join(',');
            const requestedFields = this.extractRequestedFields(request.message);
            
            const queryParams = new URLSearchParams();
            queryParams.append('userIds', userIds);
            if (requestedFields.length > 0) {
                queryParams.append('fields', requestedFields.join(','));
            }

            let responseText = `Claro! Preparei o relatório consolidado para ${targetsForReport.length} usuários. Escolha o formato para download:\n`;
            responseText += `\n- [Baixar em PDF](http://localhost:3000/reports/consolidated/pdf?${queryParams.toString()})\n`;
            responseText += `- [Baixar em CSV (para Excel)](http://localhost:3000/reports/consolidated/csv?${queryParams.toString()})\n`;
            responseText += `- [Ver como Texto Simples](http://localhost:3000/reports/consolidated/txt?${queryParams.toString()})\n`;

            return { response: responseText, success: true };

        } else if (targetsForReport.length === 1) {
             // SINGLE-USER report
            const target = targetsForReport[0];
            const requestedFields = this.extractRequestedFields(request.message);
            const subjectName = this.extractSubjectName(request.message, target);
            
            const queryParams = new URLSearchParams();
            if (subjectName) {
                queryParams.append('subject', subjectName);
            }
            if (requestedFields.length > 0) {
                queryParams.append('fields', requestedFields.join(','));
            }
            const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

            let responseText = `Claro! Preparei o relatório acadêmico de ${target.name}. Escolha o formato para download:\n`;
            responseText += `  - [Baixar em PDF](http://localhost:3000/reports/${target.id}/pdf${queryString})\n`;
            responseText += `  - [Baixar em CSV (para Excel)](http://localhost:3000/reports/${target.id}/csv${queryString})\n`;
            responseText += `  - [Ver como Texto Simples](http://localhost:3000/reports/${target.id}/txt${queryString})\n`;
            return { response: responseText, success: true };
        }
      }

      // 4. Fallback to AI for all other questions (non-report related)
      let aiContext: User | User[] = actor; // Default to actor

      if (targetUsers.length > 1) {
        // A) Multi-user context
        aiContext = targetUsers;
      } else if (targetUsers.length === 1) {
        // B) Single user from the multi-user search
        aiContext = targetUsers[0];
      } else {
        const singleTargetName = this.extractSingleTargetName(request.message);
        if (singleTargetName && actor.role === 'coordinator') {
            const foundTarget = await this.findUserByName(singleTargetName);
            if (foundTarget) {
                aiContext = foundTarget;
            }
        }
      }
      
      // 5. Generate response using AI with the determined context
      const aiResponse = await this.aiService.generateResponse(request.message, aiContext);

      return {
        response: aiResponse,
        success: true
      };

    } catch (error) {
      console.error('Error processing chat message:', error);
      return {
        response: 'Desculpe, ocorreu um erro interno. Tente novamente em alguns instantes.',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * A simple function to extract a potential user name from the message.
   * This is a basic implementation and can be improved with more robust NLP.
   */
  private extractSingleTargetName(message: string): string | null {
    // Looks for patterns like "de Maria Santos", "da Ana Costa", "do João Silva"
    const match = message.match(/(?:de|do|da)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    return match ? match[1] : null;
  }

  private extractRequestedFields(message: string): string[] {
    const fieldsMap = {
        'falta': 'absences',
        'faltas': 'absences',
        'nota': 'averageGrade',
        'notas': 'averageGrade',
        'média': 'averageGrade',
        'médias': 'averageGrade',
        'universidade': 'university',
        'faculdade': 'university',
        'instituição': 'university',
        'curso': 'course',
        'período': 'period',
        'matéria': 'subjects',
        'disciplina': 'subjects',
        'matérias': 'subjects',
        'disciplinas': 'subjects',
        'nome': 'name',
        'email': 'email',
        'telefone': 'phone',
        'cpf': 'cpf',
    };
    
    const lowerCaseMessage = message.toLowerCase();
    const foundFields = new Set<string>();

    for (const keyword in fieldsMap) {
        if (lowerCaseMessage.includes(keyword)) {
            foundFields.add(fieldsMap[keyword]);
        }
    }

    return Array.from(foundFields);
  }

  private extractTargetIds(message: string): string[] {
    const ids: string[] = [];
    // Regex to find patterns like "id 2", "id 2 e 4", "usuarios 3, 5" etc.
    // It captures the entire list of numbers following the keyword.
    const matches = message.matchAll(/(?:id|usu[áa]rio)[\s:]*(\d+(?:[\s,eEouOU\s]+\d+)*)/gi);
    
    for (const match of matches) {
      // match[1] will be something like "2 e 4" or "3, 5"
      const numbersAsString = match[1];
      // Split the string by any non-digit character to get individual numbers
      const individualIds = numbersAsString.split(/\D+/).filter(Boolean);
      ids.push(...individualIds);
    }
    return ids;
  }

  private extractSubjectName(message: string, user: User): string | null {
    if (!user.subjects) return null;

    const lowerCaseMessage = message.toLowerCase();
    for (const subject of user.subjects) {
      if (lowerCaseMessage.includes(subject.name.toLowerCase())) {
        return subject.name;
      }
    }
    
    return null;
  }

  /**
   * Finds all known user names mentioned in a message.
   */
  private async extractAllTargetNames(message: string, actorName: string): Promise<string[]> {
    // In a real app, this list would come from the DB more efficiently.
    const knownUserNames: string[] = [];
    for (const id of ['1', '2', '3', '4', '5']) {
      const user = await this.userRepository.findById(id);
      if (user) knownUserNames.push(user.name);
    }
    
    const foundNames = knownUserNames.filter(name => 
      name.toLowerCase() !== actorName.toLowerCase() && // Exclude the actor themselves
      message.toLowerCase().includes(name.toLowerCase())
    );

    return foundNames;
  }

  /**
   * A helper to find a user by name from the repository.
   * NOTE: This is inefficient. In a real DB, you'd query directly.
   * We're assuming names are unique for this mock implementation.
   */
  private async findUserByName(name: string): Promise<User | null> {
    // This is a workaround as our repository doesn't have findByName.
    // We'll iterate through known users.
    for (const id of ['1', '2', '3', '4', '5']) {
      const user = await this.userRepository.findById(id);
      if (user && user.name.toLowerCase() === name.toLowerCase()) {
        return user;
      }
    }
    return null;
  }
} 