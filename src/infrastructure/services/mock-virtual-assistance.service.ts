import { Injectable } from '@nestjs/common';
import { 
  VirtualAssistanceService,
  OngoingActivity, 
  ScheduledActivity, 
  Professional, 
  Student, 
  Coordinator 
} from '../../domain/services/virtual-assistance.service';
import { 
  ongoingActivities, 
  scheduledActivities,
  studentProfessionals,
  coordinatorProfessionals,
  coordinatorStudents,
  coordinatorDetails 
} from './mock-virtual-assistance-data';

@Injectable()
export class MockVirtualAssistanceService implements VirtualAssistanceService {
  async getCoordinatorsOngoingActivities(cpf: string): Promise<OngoingActivity[]> {
    // In a real scenario, we would use the coordinator's CPF to filter data.
    // For this mock, we return all coordinator-visible data.
    console.log(`Mock: Coordenador ${cpf} pediu atividades em andamento.`);
    return ongoingActivities;
  }

  async getCoordinatorsProfessionals(cpf: string): Promise<Professional[]> {
    console.log(`Mock: Coordenador ${cpf} pediu lista de profissionais.`);
    return coordinatorProfessionals;
  }

  async getCoordinatorsStudents(cpf: string): Promise<Student[]> {
    console.log(`Mock: Coordenador ${cpf} pediu lista de alunos.`);
    return coordinatorStudents;
  }

  async getCoordinatorDetails(cpf: string): Promise<Coordinator | null> {
    console.log(`Mock: Pedido de detalhes para o coordenador com CPF ${cpf}.`);
    // In a real implementation, you'd find the coordinator by CPF.
    return coordinatorDetails.cpf === cpf ? coordinatorDetails : null;
  }

  async getStudentsScheduledActivities(cpf: string): Promise<ScheduledActivity[]> {
    console.log(`Mock: Buscando atividades agendadas para o CPF ${cpf}.`);
    
    // Find the student to get their groups
    const student = coordinatorStudents.find(s => s.cpf === cpf);
    if (!student) {
      console.log(`Mock: Estudante com CPF ${cpf} não encontrado.`);
      return [];
    }
    
    // Filter activities by student's groups
    const filteredActivities = scheduledActivities.filter(activity => 
      student.groupNames.includes(activity.groupName)
    );
    
    console.log(`Mock: Encontradas ${filteredActivities.length} atividades para os grupos: ${student.groupNames.join(', ')}`);
    return filteredActivities;
  }

  async getStudentsProfessionals(cpf: string): Promise<Professional[]> {
    console.log(`Mock: Buscando profissionais para o aluno com CPF ${cpf}.`);
    
    // Find the student to get their groups
    const student = coordinatorStudents.find(s => s.cpf === cpf);
    if (!student) {
      console.log(`Mock: Estudante com CPF ${cpf} não encontrado.`);
      return [];
    }
    
    // Filter professionals by student's groups (professionals that work in the same groups)
    const filteredProfessionals = studentProfessionals.filter(professional => 
      professional.groupNames.some(group => student.groupNames.includes(group))
    );
    
    console.log(`Mock: Encontrados ${filteredProfessionals.length} profissionais para os grupos: ${student.groupNames.join(', ')}`);
    return filteredProfessionals;
  }
} 