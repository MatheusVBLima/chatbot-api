import { User } from '../entities/user.entity';

export interface AIService {
  generateResponse(userMessage: string, userData: User | User[]): Promise<string>;
} 