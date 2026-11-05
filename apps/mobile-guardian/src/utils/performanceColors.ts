/**
 * Discrete Percentage-Based Performance Color Thresholds
 *
 * | Percentage | Color  | Hex Code | Performance    |
 * |------------|--------|----------|----------------|
 * | 0–39%      | Red    | #EF4444  | Poor           |
 * | 40–49%     | Orange | #F97316  | Below average  |
 * | 50–59%     | Amber  | #F59E0B  | Average        |
 * | 60–69%     | Blue   | #3B82F6  | Good           |
 * | 70–100%    | Green  | #10B981  | Excellent      |
 */

export function getPerformanceColor(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || isNaN(pct)) return '#94A3B8';
  const val = Number(pct);
  if (val < 40) return '#EF4444'; // Red
  if (val < 50) return '#F97316'; // Orange
  if (val < 60) return '#F59E0B'; // Amber
  if (val < 70) return '#3B82F6'; // Blue
  return '#10B981';               // Green
}

export function getPerformanceLabel(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || isNaN(pct)) return 'Not recorded';
  const val = Number(pct);
  if (val < 40) return 'Poor';
  if (val < 50) return 'Below average';
  if (val < 60) return 'Average';
  if (val < 70) return 'Good';
  return 'Excellent';
}

export function getPerformanceBg(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || isNaN(pct)) return '#F1F5F9';
  const val = Number(pct);
  if (val < 40) return '#FEF2F2'; // Red tint
  if (val < 50) return '#FFF7ED'; // Orange tint
  if (val < 60) return '#FFFBEB'; // Amber tint
  if (val < 70) return '#EFF6FF'; // Blue tint
  return '#ECFDF5';               // Green tint
}

export function getPerformanceBorder(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || isNaN(pct)) return '#E2E8F0';
  const val = Number(pct);
  if (val < 40) return '#FECACA';
  if (val < 50) return '#FED7AA';
  if (val < 60) return '#FDE68A';
  if (val < 70) return '#BFDBFE';
  return '#A7F3D0';
}

