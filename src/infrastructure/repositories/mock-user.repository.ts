import { Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';

@Injectable()
export class MockUserRepository implements UserRepository {
  private readonly mockUsers: User[] = [
    {
      id: '1',
      name: 'João Silva',
      email: 'joao.silva@email.com',
      phone: '+5511999999999',
      cpf: '123.456.789-00',
      birthDate: new Date('1985-03-15'),
      address: {
        street: 'Rua das Flores',
        number: '123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567'
      },
      createdAt: new Date('2023-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '+5511888888888',
      cpf: '987.654.321-00',
      birthDate: new Date('1990-07-22'),
      address: {
        street: 'Avenida Paulista',
        number: '456',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
      },
      createdAt: new Date('2023-02-20'),
      updatedAt: new Date('2024-02-20')
    }
  ];

  async findById(id: string): Promise<User | null> {
    const user = this.mockUsers.find(u => u.id === id);
    return user || null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const user = this.mockUsers.find(u => u.phone === phone);
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = this.mockUsers.find(u => u.email === email);
    return user || null;
  }
} 