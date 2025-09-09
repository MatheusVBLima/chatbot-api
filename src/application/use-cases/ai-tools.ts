import { z } from 'zod';
import { tool } from 'ai';
import { ConfigService } from '@nestjs/config';

const cpfSchema = z.object({ 
  cpf: z.string().describe('O CPF do usuário a ser consultado. Deve conter 11 dígitos.') 
});

export const getVirtualAssistanceTools = (configService: ConfigService) => {
  const reportsEnabled = configService.get('REPORTS_ENABLED', 'true') === 'true';

  const tools = {
  // --- Coordinator Tools ---
  getCoordinatorsOngoingActivities: tool({
    description: "Obtém a lista de TODAS as atividades em andamento. Requer o CPF do coordenador logado.",
    parameters: cpfSchema,
  }),
  getCoordinatorsProfessionals: tool({
    description: 'Lista todos os profissionais (preceptores/professores) gerenciados pelo coordenador. Requer o CPF do coordenador logado.',
    parameters: cpfSchema,
  }),
  getCoordinatorsStudents: tool({
    description: 'Lista todos os alunos gerenciados pelo coordenador. Requer o CPF do coordenador logado.',
    parameters: cpfSchema,
  }),
  getCoordinatorDetails: tool({
    description: 'Obtém os detalhes do perfil de um coordenador específico. Requer o CPF do coordenador.',
    parameters: cpfSchema,
  }),

  // --- Student/Professional Tools ---
  getStudentsScheduledActivities: tool({
    description: 'Obtém as atividades futuras agendadas para um aluno/profissional específico. Requer o CPF do alvo.',
    parameters: cpfSchema,
  }),
  getStudentsProfessionals: tool({
    description: 'Lista os profissionais (preceptores/professores) associados a um aluno específico. Requer o CPF do aluno.',
    parameters: cpfSchema,
  }),
  getStudentInfo: tool({
    description: 'Obtém dados pessoais completos do estudante (nome, email, telefone, grupos, organizações). Use quando o usuário perguntar sobre "meus dados", "minhas informações", "meu perfil".',
    parameters: cpfSchema,
  }),

  // --- Coordinator Info Tools ---
  getCoordinatorInfo: tool({
    description: 'Obtém dados pessoais completos do coordenador (nome, email, telefone, grupos, organizações). Use quando o usuário perguntar sobre "meus dados", "minhas informações", "meu perfil".',
    parameters: cpfSchema,
  }),

  // --- Search Tools ---
  findPersonByName: tool({
    description: 'Busca uma pessoa específica por nome entre estudantes e profissionais. Use antes de gerar relatórios de terceiros.',
    parameters: z.object({
      name: z.string().describe('O nome da pessoa a ser buscada (ex: "Dra. Carla Souza", "Alice Ferreira")'),
      cpf: z.string().describe('O CPF do usuário logado fazendo a busca.'),
    }),
  }),

  };

  // Conditionally add generateReport tool only if enabled
  if (reportsEnabled) {
    (tools as any).generateReport = tool({
      description: 'OBRIGATÓRIO: Use esta ferramenta sempre que o usuário pedir para gerar relatório, exportar dados, baixar arquivos ou criar documentos. Funciona com qualquer resultado de busca anterior. Palavras-chave: "relatório", "exportar", "baixar", "PDF", "CSV", "TXT", "gerar", "arquivo".',
      parameters: z.object({
        format: z.enum(['pdf', 'csv', 'txt']).describe('O formato do arquivo solicitado pelo usuário (pdf, csv, ou txt).'),
        cpf: z.string().describe('O CPF do usuário logado.'),
        fieldsRequested: z.string().optional().describe('Campos específicos solicitados pelo usuário (ex: "nome e email", "apenas telefone", "nome, email e telefone"). Se não especificado, inclui todos os dados.'),
      }),
    });
  }

  return tools;
}; 