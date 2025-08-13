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
  private readonly client: AxiosInstance;
  private readonly baseURL = 'https://api.radeapp.com';
  private readonly authToken = 'olWbHZNVHMx8qIc6L0spduLuCL5PQzXz';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': this.authToken,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  async getCoordinatorOngoingActivities(cpf: string): Promise<OngoingActivity[]> {
    try {
      const response: AxiosResponse<OngoingActivity[]> = await this.client.get(
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

  async getStudentScheduledActivities(cpf: string): Promise<ScheduledActivity[]> {
    try {
      console.log(`[API-CLIENT] GET ${this.baseURL}/virtual-assistance/students/scheduled-activities/${cpf}`);
      const response: AxiosResponse<ScheduledActivity[]> = await this.client.get(
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

  async getStudentProfessionals(cpf: string): Promise<Professional[]> {
    try {
      const response: AxiosResponse<Professional[]> = await this.client.get(
        `/virtual-assistance/students/professionals/${cpf}`
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Erro ao buscar profissionais do estudante: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async getCoordinatorProfessionals(cpf: string): Promise<Professional[]> {
    try {
      const response: AxiosResponse<Professional[]> = await this.client.get(
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

  async getCoordinatorStudents(cpf: string): Promise<Student[]> {
    try {
      const response: AxiosResponse<Student[]> = await this.client.get(
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

  async getCoordinatorInfo(cpf: string): Promise<CoordinatorInfo> {
    try {
      console.log(`[API-CLIENT] GET ${this.baseURL}/virtual-assistance/coordinators/${cpf}`);
      const response: AxiosResponse<CoordinatorInfo> = await this.client.get(
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