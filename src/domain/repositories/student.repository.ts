import { Student } from '../entities/student.entity';

export interface StudentRepository {
  findByCpf(cpf: string): Promise<Student | null>;
} 