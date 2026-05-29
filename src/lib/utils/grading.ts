/**
 * Shared helper to compute aggregate score and derive grade+remark from a GradingConfig.
 * All scores are normalised to their respective weights out of 100.
 */
export function computeAggregate(
  config: {
    quizWeight: number; quizMaxScore: number;
    caWeight: number; caMaxScore: number;
    examWeight: number; examMaxScore: number;
    gradeThresholds: { grade: string; minScore: number; remark: string }[];
  },
  raw: { quizRawScore: number; caScore: number; examScore: number }
) {
  const quizNorm =
    config.quizMaxScore > 0
      ? (raw.quizRawScore / config.quizMaxScore) * config.quizWeight
      : 0;
  const caNorm =
    config.caMaxScore > 0
      ? (raw.caScore / config.caMaxScore) * config.caWeight
      : 0;
  const examNorm =
    config.examMaxScore > 0
      ? (raw.examScore / config.examMaxScore) * config.examWeight
      : 0;

  const aggregate = Math.round(quizNorm + caNorm + examNorm);

  // Sort thresholds descending so we match highest first
  const sorted = [...config.gradeThresholds].sort((a, b) => b.minScore - a.minScore);
  let grade = "F";
  let remark = "Fail";
  for (const t of sorted) {
    if (aggregate >= t.minScore) {
      grade = t.grade;
      remark = t.remark;
      break;
    }
  }

  return {
    quizScore: Math.round(quizNorm * 100) / 100,
    caScore: Math.round(caNorm * 100) / 100,
    examScore: Math.round(examNorm * 100) / 100,
    aggregateScore: aggregate,
    grade,
    remark,
  };
}
