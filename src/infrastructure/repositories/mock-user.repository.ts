import { Injectable } from '@nestjs/common';
import { User, Subject } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';

// Mock data simulating a database of users
const mockUsers: User[] = [
  // 1. Coordinator User
  {
    id: '1',
    name: 'João Silva',
    email: 'joao.silva@email.com',
    phone: '+5511999999999',
    cpf: '123.456.789-00',
    birthDate: new Date('1985-03-15'),
    address: { street: 'Rua das Flores', number: '123', city: 'São Paulo', state: 'SP', zipCode: '01234-567' },
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-01-15'),
    role: 'coordinator',
  },
  // 2. Student User with Academic Data
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria.santos@email.com',
    phone: '+5511888888888',
    cpf: '987.654.321-01',
    birthDate: new Date('2002-07-22'),
    address: { street: 'Avenida Brasil', number: '456', city: 'Rio de Janeiro', state: 'RJ', zipCode: '22345-678' },
    createdAt: new Date('2023-02-20'),
    updatedAt: new Date('2024-02-20'),
    role: 'student',
    university: 'Universidade Federal do Rio de Janeiro',
    course: 'Engenharia de Software',
    period: 3,
    subjects: [
      { name: 'Cálculo II', averageGrade: 8.5, absences: 2 },
      { name: 'Estrutura de Dados', averageGrade: 9.2, absences: 0 },
      { name: 'Banco de Dados', averageGrade: 7.8, absences: 4 },
    ],
  },
  // 3. Student User without Academic Data
  {
    id: '3',
    name: 'Carlos Pereira',
    email: 'carlos.p@email.com',
    phone: '+5511777777777',
    cpf: '111.222.333-44',
    birthDate: new Date('2003-11-10'),
    address: { street: 'Praça da Sé', number: '789', city: 'São Paulo', state: 'SP', zipCode: '01001-000' },
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2024-03-01'),
    role: 'student',
  },
  // 4. Another Student with Academic Data
  {
    id: '4',
    name: 'Ana Costa',
    email: 'ana.costa@email.com',
    phone: '+5511666666666',
    cpf: '444.555.666-77',
    birthDate: new Date('2001-05-30'),
    address: { street: 'Rua da Consolação', number: '101', city: 'São Paulo', state: 'SP', zipCode: '01301-000' },
    createdAt: new Date('2023-04-10'),
    updatedAt: new Date('2024-04-10'),
    role: 'student',
    university: 'Universidade de São Paulo',
    course: 'Ciência da Computação',
    period: 5,
    subjects: [
      { name: 'Inteligência Artificial', averageGrade: 9.5, absences: 1 },
      { name: 'Compiladores', averageGrade: 8.0, absences: 3 },
      { name: 'Redes de Computadores', averageGrade: 8.8, absences: 2 },
    ],
  },
  // 5. Yet Another Student with Academic Data
  {
    id: '5',
    name: 'Lucas Souza',
    email: 'lucas.s@email.com',
    phone: '+5511555555555',
    cpf: '888.999.000-11',
    birthDate: new Date('2002-09-01'),
    address: { street: 'Avenida Paulista', number: '2000', city: 'São Paulo', state: 'SP', zipCode: '01310-200' },
    createdAt: new Date('2023-05-15'),
    updatedAt: new Date('2024-05-15'),
    role: 'student',
    university: 'Pontifícia Universidade Católica de São Paulo',
    course: 'Sistemas de Informação',
    period: 2,
    subjects: [
      { name: 'Lógica de Programação', averageGrade: 9.8, absences: 0 },
      { name: 'Engenharia de Requisitos', averageGrade: 8.2, absences: 1 },
      { name: 'Modelagem de Sistemas', averageGrade: 7.5, absences: 5 },
    ],
  },
];

@Injectable()
export class MockUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const user = mockUsers.find((u) => u.id === id);
    return user || null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const user = mockUsers.find((u) => u.phone === phone);
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = mockUsers.find((u) => u.email === email);
    return user || null;
  }

  async findByCpf(cpf: string): Promise<User | null> {
    const sanitizedCpf = cpf.replace(/[.-]/g, '');
    const user = mockUsers.find((u) => u.cpf.replace(/[.-]/g, '') === sanitizedCpf);
    return user || null;
  }
}
 