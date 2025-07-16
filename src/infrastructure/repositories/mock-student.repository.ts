import { Injectable } from '@nestjs/common';
import { Student } from '../../domain/entities/student.entity';
import { StudentRepository } from '../../domain/repositories/student.repository';

// Mock data simulating a database of students from an external API
const mockStudents: Student[] = [
  {
    id: 'student-1',
    cpf: '11122233344',
    name: 'Alice Wonder',
    course: 'Computer Science',
    institution: 'Federal University of Imagination',
    isGroupActive: true,
  },
  {
    id: 'student-2',
    cpf: '55566677788',
    name: 'Bob Builder',
    course: 'Architecture',
    institution: 'State University of Tools',
    isGroupActive: false,
  },
];

@Injectable()
export class MockStudentRepository implements StudentRepository {
  async findByCpf(cpf: string): Promise<Student | null> {
    // Sanitize CPF: remove dots and hyphens
    const sanitizedCpf = cpf.replace(/[.-]/g, '');
    const student = mockStudents.find((s) => s.cpf === sanitizedCpf);
    
    // Return a promise to simulate async behavior
    return Promise.resolve(student || null);
  }
} 