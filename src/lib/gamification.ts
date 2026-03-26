import { prisma } from '@/lib/prisma';

/**
 * Point values for automatic gamification rewards (like Feedz coins).
 * Employees earn points automatically when completing platform actions.
 */
export const POINT_VALUES = {
  SURVEY_COMPLETED: 15,
  NR01_COMPLETED: 20,
  FEEDBACK_SENT: 10,
  FEEDBACK_RECEIVED: 5,
  MOOD_VOTE: 3,
  DISC_COMPLETED: 25,
  ENPS_COMPLETED: 10,
  ONE_ON_ONE_COMPLETED: 15,
  EXPERIENCE_EVAL_COMPLETED: 20,
} as const;

export const POINT_LABELS: Record<string, string> = {
  SURVEY_COMPLETED: 'Pesquisa respondida',
  NR01_COMPLETED: 'Avaliação NR-01 respondida',
  FEEDBACK_SENT: 'Feedback enviado',
  FEEDBACK_RECEIVED: 'Feedback recebido',
  MOOD_VOTE: 'Voto de humor registrado',
  DISC_COMPLETED: 'Avaliação DISC concluída',
  ENPS_COMPLETED: 'eNPS respondido',
  ONE_ON_ONE_COMPLETED: 'Reunião 1:1 concluída',
  EXPERIENCE_EVAL_COMPLETED: 'Avaliação de experiência concluída',
};

/**
 * Award gamification points automatically to a user.
 * This is the internal function used by API routes — no role check needed.
 *
 * @param userId - The user receiving points
 * @param companyId - The user's company
 * @param sourceType - Type of action (key from POINT_VALUES)
 * @param sourceId - Optional ID of the related record (assessment ID, survey ID, etc.)
 */
export async function awardPoints(
  userId: string,
  companyId: string,
  sourceType: keyof typeof POINT_VALUES,
  sourceId?: string,
): Promise<void> {
  try {
    // Prevent duplicate awards for the same source
    if (sourceId) {
      const existing = await prisma.gamificationPoints.findFirst({
        where: {
          userId,
          sourceType,
          sourceId,
        },
      });
      if (existing) return;
    }

    await prisma.gamificationPoints.create({
      data: {
        companyId,
        userId,
        points: POINT_VALUES[sourceType],
        reason: POINT_LABELS[sourceType],
        sourceType,
        sourceId: sourceId ?? null,
      },
    });
  } catch (error) {
    // Log but don't fail the main operation
    console.error('Failed to award gamification points:', error);
  }
}
