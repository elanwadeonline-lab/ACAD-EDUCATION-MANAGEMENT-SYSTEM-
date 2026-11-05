/** Read-only presentation of the approved report query's score / maximum fields. */
export function publishedScorePercent(row: {score?:unknown;total_score?:unknown}): number {
  const score=Number(row.score),maximum=Number(row.total_score);
  return Number.isFinite(score)&&Number.isFinite(maximum)&&maximum>0?Math.round(score/maximum*1000)/10:0;
}
