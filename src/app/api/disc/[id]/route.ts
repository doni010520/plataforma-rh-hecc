import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';
import { DiscProfile } from '@prisma/client';
import { awardPoints } from '@/lib/gamification';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const assessment = await prisma.discAssessment.findFirst({
    where: { id, userId: user.id },
  });

  if (!assessment) {
    return NextResponse.json({ error: 'Avaliacao nao encontrada.' }, { status: 404 });
  }

  return NextResponse.json(assessment);
}

interface DiscAnswer {
  questionId: number;
  most: 'D' | 'I' | 'S' | 'C';
  least: 'D' | 'I' | 'S' | 'C';
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const assessment = await prisma.discAssessment.findFirst({
    where: { id, userId: user.id },
  });

  if (!assessment) {
    return NextResponse.json({ error: 'Avaliacao nao encontrada.' }, { status: 404 });
  }

  if (assessment.completedAt) {
    return NextResponse.json({ error: 'Avaliacao ja foi concluida.' }, { status: 400 });
  }

  const body = await request.json() as { answers: DiscAnswer[] };
  const { answers } = body;

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: 'Respostas sao obrigatorias.' }, { status: 400 });
  }

  // Calculate DISC profile
  // Each "most" selection adds +2, each "least" selection subtracts -1
  const scores: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };

  for (const answer of answers) {
    const validProfiles = ['D', 'I', 'S', 'C'];
    if (!validProfiles.includes(answer.most) || !validProfiles.includes(answer.least)) {
      continue;
    }
    if (answer.most === answer.least) {
      return NextResponse.json({ error: 'As opções "mais" e "menos" devem ser diferentes.' }, { status: 400 });
    }
    scores[answer.most] += 2;
    scores[answer.least] -= 1;
  }

  // Normalize to 0-100 scale
  const maxPossible = answers.length * 2; // Maximum score possible
  const minPossible = answers.length * -1; // Minimum score possible
  const range = maxPossible - minPossible;

  const profileD = Math.round(((scores.D - minPossible) / range) * 100);
  const profileI = Math.round(((scores.I - minPossible) / range) * 100);
  const profileS = Math.round(((scores.S - minPossible) / range) * 100);
  const profileC = Math.round(((scores.C - minPossible) / range) * 100);

  // Determine primary profile
  const profileScores: Array<{ profile: DiscProfile; score: number }> = [
    { profile: 'D' as DiscProfile, score: profileD },
    { profile: 'I' as DiscProfile, score: profileI },
    { profile: 'S' as DiscProfile, score: profileS },
    { profile: 'C' as DiscProfile, score: profileC },
  ];
  profileScores.sort((a, b) => b.score - a.score);
  const primaryProfile = profileScores[0].profile;

  const updated = await prisma.discAssessment.update({
    where: { id },
    data: {
      answers: JSON.stringify(answers),
      profileD,
      profileI,
      profileS,
      profileC,
      primaryProfile,
      completedAt: new Date(),
    },
  });

  // Award gamification points for completing DISC assessment
  awardPoints(user.id, user.companyId, 'DISC_COMPLETED', id);

  return NextResponse.json(updated);
}
