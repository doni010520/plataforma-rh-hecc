import { NextResponse } from 'next/server';

interface DiscQuestionOption {
  D: string;
  I: string;
  S: string;
  C: string;
}

interface DiscQuestion {
  id: number;
  options: DiscQuestionOption;
}

const DISC_QUESTIONS: DiscQuestion[] = [
  { id: 1, options: { D: 'Direto', I: 'Entusiasmado', S: 'Paciente', C: 'Cuidadoso' } },
  { id: 2, options: { D: 'Decidido', I: 'Convincente', S: 'Gentil', C: 'Preciso' } },
  { id: 3, options: { D: 'Competitivo', I: 'Alegre', S: 'Leal', C: 'Analitico' } },
  { id: 4, options: { D: 'Determinado', I: 'Inspirador', S: 'Estavel', C: 'Perfeccionista' } },
  { id: 5, options: { D: 'Assertivo', I: 'Expressivo', S: 'Tolerante', C: 'Organizado' } },
  { id: 6, options: { D: 'Ousado', I: 'Sociavel', S: 'Cooperativo', C: 'Meticuloso' } },
  { id: 7, options: { D: 'Independente', I: 'Otimista', S: 'Confiavel', C: 'Logico' } },
  { id: 8, options: { D: 'Objetivo', I: 'Comunicativo', S: 'Calmo', C: 'Sistematico' } },
  { id: 9, options: { D: 'Corajoso', I: 'Amigavel', S: 'Diplomatico', C: 'Rigoroso' } },
  { id: 10, options: { D: 'Focado', I: 'Persuasivo', S: 'Compreensivo', C: 'Detalhista' } },
  { id: 11, options: { D: 'Exigente', I: 'Motivador', S: 'Harmonioso', C: 'Disciplinado' } },
  { id: 12, options: { D: 'Dominante', I: 'Espontaneo', S: 'Ponderado', C: 'Criterioso' } },
  { id: 13, options: { D: 'Pragmatico', I: 'Carismatico', S: 'Previsivel', C: 'Cauteloso' } },
  { id: 14, options: { D: 'Ambicioso', I: 'Energetico', S: 'Receptivo', C: 'Exato' } },
  { id: 15, options: { D: 'Destemido', I: 'Empolgante', S: 'Acolhedor', C: 'Reflexivo' } },
  { id: 16, options: { D: 'Resolutivo', I: 'Influente', S: 'Solidario', C: 'Minucioso' } },
  { id: 17, options: { D: 'Empreendedor', I: 'Encantador', S: 'Persistente', C: 'Planejador' } },
  { id: 18, options: { D: 'Comandante', I: 'Criativo', S: 'Consistente', C: 'Formal' } },
  { id: 19, options: { D: 'Franco', I: 'Divertido', S: 'Atencioso', C: 'Reservado' } },
  { id: 20, options: { D: 'Visionario', I: 'Contagiante', S: 'Dedicado', C: 'Estruturado' } },
  { id: 21, options: { D: 'Audacioso', I: 'Expansivo', S: 'Moderado', C: 'Metódico' } },
  { id: 22, options: { D: 'Incisivo', I: 'Vivaz', S: 'Ponderado', C: 'Prudente' } },
  { id: 23, options: { D: 'Desafiador', I: 'Cativante', S: 'Estabilizador', C: 'Investigador' } },
  { id: 24, options: { D: 'Arrojado', I: 'Animado', S: 'Tranquilo', C: 'Racional' } },
];

export async function GET() {
  return NextResponse.json({ questions: DISC_QUESTIONS, total: DISC_QUESTIONS.length });
}
