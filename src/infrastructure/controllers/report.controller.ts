import { Controller, Get, Param, Res, NotFoundException, BadRequestException, Inject, Query } from '@nestjs/common';
import { Response } from 'express';
import { ReportService } from '../../application/services/report.service';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';

@Controller('reports')
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    @Inject('UserRepository') private readonly userRepository: UserRepository,
  ) {}

  @Get('consolidated/:format')
  async generateConsolidatedReport(
    @Param('format') format: 'txt' | 'csv' | 'pdf',
    @Query('userIds') userIds: string,
    @Query('fields') fields: string | undefined,
    @Res() res: Response,
  ) {
    if (!userIds) {
      throw new BadRequestException('Pelo menos um "userId" é necessário.');
    }
    const ids = userIds.split(',');
    const users = await Promise.all(ids.map(id => this.userRepository.findById(id)));
    const foundUsers = users.filter((u): u is User => u !== null);

    if (foundUsers.length === 0) {
      throw new NotFoundException(`Nenhum usuário encontrado para os IDs fornecidos.`);
    }

    const requestedFields = fields ? fields.split(',') : undefined;

    switch (format) {
      case 'txt':
        const txtReport = this.reportService.generateTxtReport(foundUsers, requestedFields);
        res.header('Content-Type', 'text/plain');
        res.header('Content-Disposition', `attachment; filename="relatorio_consolidado.txt"`);
        res.send(txtReport);
        break;
      
      case 'csv':
        const csvReport = this.reportService.generateCsvReport(foundUsers, requestedFields);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename="relatorio_consolidado.csv"`);
        res.send(csvReport);
        break;
        
      case 'pdf':
        const pdfBuffer = await this.reportService.generatePdfReport(foundUsers, requestedFields);
        res.header('Content-Type', 'application/pdf');
        res.header('Content-Disposition', `attachment; filename="relatorio_consolidado.pdf"`);
        res.send(pdfBuffer);
        break;

      default:
        throw new BadRequestException('Formato de relatório inválido. Use "txt", "csv" ou "pdf".');
    }
  }

  @Get(':userId/:format')
  async generateReport(
    @Param('userId') userId: string,
    @Param('format') format: 'txt' | 'csv' | 'pdf',
    @Query('subject') subjectName: string | undefined,
    @Query('fields') fields: string | undefined,
    @Res() res: Response,
  ) {
    let user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado.`);
    }

    // If a specific subject is requested, filter the user's subjects
    if (subjectName && user.subjects) {
      const filteredSubjects = user.subjects.filter(s => 
        s.name.toLowerCase() === decodeURIComponent(subjectName).toLowerCase()
      );
      
      if (filteredSubjects.length === 0) {
        throw new NotFoundException(`Matéria "${subjectName}" não encontrada para este usuário.`);
      }

      // Clone the user and replace subjects with the filtered list
      user = { ...user, subjects: filteredSubjects };
    }

    const requestedFields = fields ? fields.split(',') : undefined;

    switch (format) {
      case 'txt':
        const txtReport = this.reportService.generateTxtReport(user, requestedFields);
        res.header('Content-Type', 'text/plain');
        res.header('Content-Disposition', `attachment; filename="relatorio_${user.id}.txt"`);
        res.send(txtReport);
        break;
      
      case 'csv':
        const csvReport = this.reportService.generateCsvReport(user, requestedFields);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename="relatorio_${user.id}.csv"`);
        res.send(csvReport);
        break;
        
      case 'pdf':
        const pdfBuffer = await this.reportService.generatePdfReport(user, requestedFields);
        res.header('Content-Type', 'application/pdf');
        res.header('Content-Disposition', `attachment; filename="relatorio_${user.id}.pdf"`);
        res.send(pdfBuffer);
        break;

      default:
        throw new BadRequestException('Formato de relatório inválido. Use "txt", "csv" ou "pdf".');
    }
  }
} 