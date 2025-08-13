import { z } from 'zod';
import { tool } from 'ai';

const cpfSchema = z.object({ 
  cpf: z.string().describe('O CPF do usuário a ser consultado. Deve conter 11 dígitos.') 
});

export const virtualAssistanceTools = {
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

  // --- Generic Report Tool ---
  generateReport: tool({
    description: 'OBRIGATÓRIO: Use esta ferramenta sempre que o usuário pedir para gerar relatório, exportar dados, baixar arquivos ou criar documentos. Funciona com qualquer resultado de busca anterior. Palavras-chave: "relatório", "exportar", "baixar", "PDF", "CSV", "TXT", "gerar", "arquivo".',
    parameters: z.object({
      format: z.enum(['pdf', 'csv', 'txt']).describe('O formato do arquivo solicitado pelo usuário (pdf, csv, ou txt).'),
      cpf: z.string().describe('O CPF do usuário logado.'),
    }),
  }),
}; 