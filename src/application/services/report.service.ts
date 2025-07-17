import { Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import * as PDFDocument from 'pdfkit';
import * as Papa from 'papaparse';

@Injectable()
export class ReportService {

  /**
   * Generates a formatted plain text report of a user's academic data.
   */
  public generateTxtReport(data: User | User[], requestedFields?: string[]): string {
    const users = Array.isArray(data) ? data : [data];
    if (users.length === 0) return 'Nenhum usuário para gerar relatório.';

    const reports = users.map(user => {
      // Re-use the single-user logic and just add a separator
      const singleReport = this.generateSingleTxtReport(user, requestedFields);
      return singleReport;
    });

    return reports.join('\n\n==================================================\n\n');
  }

  private generateSingleTxtReport(user: User, requestedFields?: string[]): string {
    const hasField = (field: string) => !requestedFields || requestedFields.includes(field);
    const hasSubjectField = () => hasField('subjects') || hasField('averageGrade') || hasField('absences');

    let report = `🎓 Relatório Acadêmico de ${user.name}\n==================================================\n`;

    if (hasField('university')) report += `Instituição: ${user.university || 'Não informado'}\n`;
    if (hasField('course')) report += `Curso: ${user.course || 'Não informado'}\n`;
    if (hasField('period')) report += `Período: ${user.period || 'Não informado'}\n`;

    if ((user.subjects && user.subjects.length > 0) && hasSubjectField()) {
      report += '==================================================\n\n Disciplinas:\n--------------------------------------------------\n';
      user.subjects.forEach(subject => {
        report += `\n📚 Matéria: ${subject.name}\n`;
        if (hasField('averageGrade') || hasField('subjects')) report += `    - Média de Notas: ${subject.averageGrade}\n`;
        if (hasField('absences') || hasField('subjects')) report += `    - Faltas: ${subject.absences}\n`;
      });
       report += `\n--------------------------------------------------`;
    } else if (hasSubjectField()) {
       report += `\nEste usuário não possui dados de disciplinas para exibir.`;
    }
    
    report += `\nFim do Relatório.\n`;
    return report.replace(/^ {4}/gm, '');
  }

  /**
   * Generates a CSV formatted report of a user's academic data.
   */
  public generateCsvReport(data: User | User[], requestedFields?: string[]): string {
    const users = Array.isArray(data) ? data : [data];
    if (users.length === 0) return Papa.unparse([{ "Erro": `Nenhum usuário para gerar relatório.` }]);
    
    const hasField = (field: string) => !requestedFields || requestedFields.includes(field);
    
    const allRows: any[] = [];

    users.forEach(user => {
      if (!user.subjects || user.subjects.length === 0) {
        allRows.push({ 'Aluno': user.name, 'Erro': 'Não possui dados acadêmicos' });
        return;
      }
      
      const userRows = user.subjects.map(subject => {
        const row: { [key: string]: any } = { 'Aluno': user.name };
        
        if (hasField('university')) row['Instituição'] = user.university;
        if (hasField('course')) row['Curso'] = user.course;
        if (hasField('period')) row['Período'] = user.period;
        
        row['Disciplina'] = subject.name;
  
        if (hasField('averageGrade') || hasField('subjects')) row['Media_Notas'] = subject.averageGrade;
        if (hasField('absences') || hasField('subjects')) row['Faltas'] = subject.absences;
  
        return row;
      });
      allRows.push(...userRows);
    });
    
    return Papa.unparse(allRows);
  }

  /**
   * Generates a PDF buffer report of a user's academic data.
   */
  public generatePdfReport(data: User | User[], requestedFields?: string[]): Promise<Buffer> {
    const users = Array.isArray(data) ? data : [data];
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: any[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        users.forEach((user, index) => {
          this.addPdfPage(doc, user, requestedFields);
          if (index < users.length - 1) {
            doc.addPage();
          }
        });
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addPdfPage(doc: PDFKit.PDFDocument, user: User, requestedFields?: string[]) {
      const hasField = (field: string) => !requestedFields || requestedFields.includes(field);
      const hasSubjectField = () => hasField('subjects') || hasField('averageGrade') || hasField('absences');

      doc.fontSize(20).text('Relatório Acadêmico', { align: 'center' });
      doc.moveDown();

      doc.fontSize(14).text(`Aluno: ${user.name}`);
      if (hasField('university')) doc.text(`Instituição: ${user.university || 'Não informado'}`);
      if (hasField('course')) doc.text(`Curso: ${user.course || 'Não informado'}`);
      if (hasField('period')) doc.text(`Período: ${user.period || 'Não informado'}`);
      doc.moveDown();

      doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      if ((user.subjects && user.subjects.length > 0) && hasSubjectField()) {
        doc.fontSize(16).text('Disciplinas', { underline: true });
        doc.moveDown();

        user.subjects.forEach(subject => {
          let line = `📚 Matéria: ${subject.name}`;
          let details: string[] = [];
          if (hasField('averageGrade') || hasField('subjects')) details.push(`Média: ${subject.averageGrade}`);
          if (hasField('absences') || hasField('subjects')) details.push(`Faltas: ${subject.absences}`);
          
          doc.fontSize(12).text(line, { continued: true });
          if (details.length > 0) {
            doc.text(` (${details.join(' | ')})`, { align: 'right' });
          } else {
            doc.text(''); // Finalize the line
          }
          doc.moveDown(0.5);
        });
      } else if (hasSubjectField()) {
        doc.fontSize(12).text('Este usuário não possui dados de disciplinas para exibir.');
      }
  }
} 