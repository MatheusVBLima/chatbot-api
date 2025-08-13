import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as Papa from 'papaparse';

@Injectable()
export class ReportService {

  private formatDataForDisplay(data: any, reportTitle: string = 'Dados'): string {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return 'Não há dados para gerar o relatório.';
    }

    const dataArray = Array.isArray(data) ? data : [data];
    let formatted = `RELATÓRIO: ${reportTitle.toUpperCase()}\n`;
    formatted += '='.repeat(50) + '\n\n';

    return this.formatDataContent(dataArray, formatted);
  }

  private formatDataForDisplayPDF(data: any, reportTitle: string = 'Dados'): string {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return 'Não há dados para gerar o relatório.';
    }

    const dataArray = Array.isArray(data) ? data : [data];
    let formatted = ''; // Sem título para PDF pois já está no cabeçalho

    return this.formatDataContent(dataArray, formatted);
  }

  private formatDataContent(dataArray: any[], formatted: string): string {
    dataArray.forEach((item, index) => {
      formatted += `${index + 1}. `;
      
      // Atividades em andamento
      if (item.studentName && item.taskName) {
        const startTime = new Date(item.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(item.scheduledEndTo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const date = new Date(item.scheduledStartTo).toLocaleDateString('pt-BR');
        
        formatted += `${item.studentName}\n`;
        formatted += `   Grupo: ${item.groupName}\n`;
        formatted += `   Atividade: ${item.taskName}\n`;
        formatted += `   Local: ${item.internshipLocationName}\n`;
        formatted += `   Data: ${date}\n`;
        formatted += `   Horário: ${startTime} - ${endTime}\n`;
        formatted += `   Preceptor: ${item.preceptorName}\n`;
      }
      // Atividades agendadas
      else if (item.taskName && item.preceptorNames) {
        const startTime = new Date(item.scheduledStartTo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(item.scheduledEndTo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const date = new Date(item.scheduledStartTo).toLocaleDateString('pt-BR');
        
        formatted += `Atividade Agendada\n`;
        formatted += `   Grupo: ${item.groupName}\n`;
        formatted += `   Atividade: ${item.taskName}\n`;
        formatted += `   Local: ${item.internshipLocationName}\n`;
        formatted += `   Data: ${date}\n`;
        formatted += `   Horário: ${startTime} - ${endTime}\n`;
        formatted += `   Preceptores: ${item.preceptorNames.join(', ')}\n`;
      }
      // Profissionais
      else if (item.name && item.email) {
        formatted += `${item.name}\n`;
        formatted += `   CPF: ${item.cpf}\n`;
        formatted += `   Email: ${item.email}\n`;
        if (item.phone) formatted += `   Telefone: ${item.phone}\n`;
        if (item.groupNames) formatted += `   Grupos: ${item.groupNames.join(', ')}\n`;
        if (item.pendingValidationWorkloadMinutes !== undefined) {
          formatted += `   Horas pendentes: ${item.pendingValidationWorkloadMinutes} min\n`;
        }
      }
      // Estudantes
      else if (item.name && item.groupNames) {
        formatted += `${item.name}\n`;
        formatted += `   CPF: ${item.cpf}\n`;
        formatted += `   Email: ${item.email}\n`;
        if (item.phone) formatted += `   Telefone: ${item.phone}\n`;
        formatted += `   Grupos: ${item.groupNames.join(', ')}\n`;
      }
      // Dados genéricos
      else {
        formatted += `Registro ${index + 1}\n`;
        Object.entries(item).forEach(([key, value]) => {
          formatted += `   ${key}: ${value}\n`;
        });
      }
      
      formatted += '\n';
    });

    formatted += '='.repeat(50) + '\n';
    formatted += `Relatório gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    formatted += `Total de registros: ${dataArray.length}\n`;

    return formatted;
  }

  public generateTxtReport(data: any, reportTitle: string = 'Dados'): string {
    return this.formatDataForDisplay(data, reportTitle);
  }

  public generateCsvReport(data: any, reportTitle: string = 'Dados'): string {
    if (!data) {
      return Papa.unparse([{ "Erro": "Não há dados para gerar o relatório." }]);
    }
    const dataArray = Array.isArray(data) ? data : [data];
    if (dataArray.length === 0) {
      return Papa.unparse([{ "Erro": "Não há dados para gerar o relatório." }]);
    }

    // Preparar dados para CSV com cabeçalhos em português
    const csvData = dataArray.map(item => {
      const csvItem: any = {};
      
      if (item.studentName && item.taskName) {
        // Atividades em andamento
        csvItem['Estudante'] = item.studentName;
        csvItem['Grupo'] = item.groupName;
        csvItem['Atividade'] = item.taskName;
        csvItem['Local'] = item.internshipLocationName;
        csvItem['Data_Inicio'] = new Date(item.scheduledStartTo).toLocaleDateString('pt-BR');
        csvItem['Hora_Inicio'] = new Date(item.startedAt).toLocaleTimeString('pt-BR');
        csvItem['Hora_Fim'] = new Date(item.scheduledEndTo).toLocaleTimeString('pt-BR');
        csvItem['Preceptor'] = item.preceptorName;
      } else if (item.taskName && item.preceptorNames) {
        // Atividades agendadas
        csvItem['Grupo'] = item.groupName;
        csvItem['Atividade'] = item.taskName;
        csvItem['Local'] = item.internshipLocationName;
        csvItem['Data'] = new Date(item.scheduledStartTo).toLocaleDateString('pt-BR');
        csvItem['Hora_Inicio'] = new Date(item.scheduledStartTo).toLocaleTimeString('pt-BR');
        csvItem['Hora_Fim'] = new Date(item.scheduledEndTo).toLocaleTimeString('pt-BR');
        csvItem['Preceptores'] = item.preceptorNames.join(', ');
      } else {
        // Dados genéricos
        Object.entries(item).forEach(([key, value]) => {
          csvItem[key] = value;
        });
      }
      
      return csvItem;
    });

    return Papa.unparse(csvData);
  }

  public generatePdfReport(data: any, reportTitle: string = 'Dados'): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: any[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Título
        doc.fontSize(18).text(`RELATÓRIO: ${reportTitle.toUpperCase()}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text('='.repeat(60), { align: 'center' });
        doc.moveDown();

        // Conteúdo formatado (sem título duplicado)
        const content = this.formatDataForDisplayPDF(data, reportTitle);
        doc.fontSize(10).font('Helvetica').text(content);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
} 