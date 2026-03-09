const ts = Date.now();

export const testData = {
  // Auth
  companyName: `E2E Teste ${ts}`,
  adminName: 'Admin E2E',
  adminEmail: `admin-${ts}@teste-e2e.com`,
  password: 'SenhaSegura123!',

  // Department
  departmentName: `Engenharia ${ts}`,

  // Employee
  employeeName: 'Colaborador E2E',
  employeeEmail: `colab-${ts}@teste-e2e.com`,
  employeeJobTitle: 'Desenvolvedor',

  // Evaluation
  cycleName: `Avaliação E2E Q1 ${ts}`,
  criteriaName1: 'Qualidade do Trabalho',
  criteriaName2: 'Comunicação',

  // Feedback
  feedbackContent: 'Excelente trabalho na entrega do projeto trimestral! Continue assim, seu esforço é reconhecido pela equipe.',

  // OKR
  okrTitle: `Aumentar produtividade ${ts}`,
  okrDescription: 'Melhorar a eficiência da equipa de desenvolvimento',
  krTitle: 'Taxa de entrega de sprints',
  krTargetValue: '100',

  // Survey
  surveyTitle: `Pesquisa de Clima E2E ${ts}`,
  surveyQuestion1: 'Estou satisfeito(a) com o meu ambiente de trabalho.',
  surveyQuestion2: 'O que poderia ser melhorado?',

  // Celebration
  celebrationContent: 'Parabéns pela conquista da certificação de qualidade! Um marco importante para a equipa!',

  // Announcement
  announcementTitle: `Comunicado E2E ${ts}`,
  announcementContent: 'Este é um comunicado de teste para validação dos fluxos automatizados da plataforma.',

  // Helpers
  today: new Date().toISOString().split('T')[0],
  futureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
};
