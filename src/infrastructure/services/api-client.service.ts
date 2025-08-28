import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface OngoingActivity {
  studentName: string;
  groupName: string;
  taskName: string;
  internshipLocationName: string;
  scheduledStartTo: string;
  scheduledEndTo: string;
  startedAt: string;
  preceptorName: string;
}

export interface ScheduledActivity {
  groupName: string;
  taskName: string;
  internshipLocationName: string;
  scheduledStartTo: string;
  scheduledEndTo: string;
  preceptorNames: string[];
}

export interface Professional {
  cpf: string;
  name: string;
  email: string;
  phone: string | null;
  groupNames: string[];
  pendingValidationWorkloadMinutes?: number;
}

export interface Student {
  cpf: string;
  name: string;
  email: string;
  phone: string | null;
  groupNames: string[];
}

export interface StudentInfo {
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  groupNames: string[];
  organizationsAndCourses: {
    organizationName: string;
    courseNames: string[];
  }[];
}

export interface CoordinatorInfo {
  coordinatorName: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
  groupNames: string[];
  organizationsAndCourses: {
    organizationName: string;
    courseNames: string[];
  }[];
}

@Injectable()
export class ApiClientService {
  private readonly baseURL = 'https://api.stg.radeapp.com';
  private readonly stagingToken = 'JQiFrDkkM5eNKtLxwNKzZoga0xkeRDAZ';

  constructor() {}

  private createClient(token?: string): AxiosInstance {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    // Use staging token (without Bearer prefix as discovered in tests)
    const authToken = token || this.stagingToken;
    if (authToken) {
      headers['Authorization'] = authToken;
    }

    return axios.create({
      baseURL: this.baseURL,
      headers,
      timeout: 10000,
    });
  }

  async getCoordinatorOngoingActivities(cpf: string, token?: string): Promise<OngoingActivity[]> {
    try {
      const client = this.createClient(token);
      const response: AxiosResponse<OngoingActivity[]> = await client.get(
        `/virtual-assistance/coordinators/ongoing-activities/${cpf}`
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Erro ao buscar atividades em andamento: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async getStudentScheduledActivities(cpf: string, token?: string): Promise<ScheduledActivity[]> {
    try {
      console.log(`[API-CLIENT] GET ${this.baseURL}/virtual-assistance/students/scheduled-activities/${cpf}`);
      const client = this.createClient(token);
      const response: AxiosResponse<ScheduledActivity[]> = await client.get(
        `/virtual-assistance/students/scheduled-activities/${cpf}`
      );
      console.log(`[API-CLIENT] Atividades encontradas: ${response.data.length} atividades`);
      return response.data;
    } catch (error) {
      console.log(`[API-CLIENT] Erro estudante: ${error.response?.status} - ${JSON.stringify(error.response?.data) || error.message}`);
      throw new HttpException(
        `Erro ao buscar atividades agendadas: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async getStudentProfessionals(cpf: string, token?: string): Promise<Professional[]> {
    try {
      console.log(`[API-CLIENT] GET ${this.baseURL}/virtual-assistance/students/professionals/${cpf}`);
      const client = this.createClient(token);
      const response: AxiosResponse<Professional[]> = await client.get(
        `/virtual-assistance/students/professionals/${cpf}`
      );
      console.log(`[API-CLIENT] Profissionais encontrados: ${response.data.length} profissionais`);
      console.log(`[API-CLIENT] Dados dos profissionais:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.log(`[API-CLIENT] Erro profissionais estudante: ${error.response?.status} - ${JSON.stringify(error.response?.data) || error.message}`);
      throw new HttpException(
        `Erro ao buscar profissionais do estudante: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async getCoordinatorProfessionals(cpf: string, token?: string): Promise<Professional[]> {
    try {
      const client = this.createClient(token);
      const response: AxiosResponse<Professional[]> = await client.get(
        `/virtual-assistance/coordinators/professionals/${cpf}`
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Erro ao buscar profissionais do coordenador: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async getCoordinatorStudents(cpf: string, token?: string): Promise<Student[]> {
    try {
      const client = this.createClient(token);
      const response: AxiosResponse<Student[]> = await client.get(
        `/virtual-assistance/coordinators/students/${cpf}`
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Erro ao buscar estudantes do coordenador: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async getStudentInfo(cpf: string, token?: string): Promise<StudentInfo> {
    try {
      console.log(`[API-CLIENT] GET ${this.baseURL}/virtual-assistance/students/${cpf}`);
      const client = this.createClient(token);
      const response: AxiosResponse<StudentInfo> = await client.get(
        `/virtual-assistance/students/${cpf}`
      );
      console.log(`[API-CLIENT] Estudante encontrado: ${response.data.studentName}`);
      return response.data;
    } catch (error) {
      console.log(`[API-CLIENT] Erro estudante individual: ${error.response?.status} - ${JSON.stringify(error.response?.data) || error.message}`);
      throw new HttpException(
        `Erro ao buscar informações do estudante: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async getCoordinatorInfo(cpf: string, token?: string): Promise<CoordinatorInfo> {
    try {
      console.log(`[API-CLIENT] GET ${this.baseURL}/virtual-assistance/coordinators/${cpf}`);
      const client = this.createClient(token);
      const response: AxiosResponse<CoordinatorInfo> = await client.get(
        `/virtual-assistance/coordinators/${cpf}`
      );
      console.log(`[API-CLIENT] Coordenador encontrado: ${response.data.coordinatorName}`);
      return response.data;
    } catch (error) {
      console.log(`[API-CLIENT] Erro coordenador: ${error.response?.status} - ${JSON.stringify(error.response?.data) || error.message}`);
      throw new HttpException(
        `Erro ao buscar informações do coordenador: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }
}