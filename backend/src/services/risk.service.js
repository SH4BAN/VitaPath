export function calculatePreventiveRiskScore({ vaccinations = [], checkups = [] }) {
  const today = new Date().toISOString().slice(0, 10);
  let score = 0;

  for (const item of [...vaccinations, ...checkups]) {
    if (item.status === 'missed') score += 20;
    if (item.status === 'delayed') score += 10;
    if (item.status === 'pending') {
      const dueDate = item.scheduled_date || item.recommended_date;
      if (dueDate && dueDate < today) score += 15;
    }
  }

  return Math.min(score, 100);
}

export function riskBand(score) {
  if (score >= 60) return 'high';
  if (score >= 30) return 'moderate';
  return 'low';
}
