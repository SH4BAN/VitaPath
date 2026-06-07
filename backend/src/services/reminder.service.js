const UPCOMING_DAYS = 30;

export function classifyReminder(item, type) {
  const today = new Date();
  const dueValue = item.scheduled_date || item.recommended_date;
  if (!dueValue || item.status === 'completed') return null;

  const dueDate = new Date(dueValue);
  const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0 || item.status === 'missed' || item.status === 'delayed') {
    return {
      type,
      severity: item.status === 'delayed' ? 'delayed' : 'overdue',
      daysUntilDue,
      dueDate: dueValue,
      item,
    };
  }
  if (daysUntilDue <= UPCOMING_DAYS) {
    return {
      type,
      severity: 'upcoming',
      daysUntilDue,
      dueDate: dueValue,
      item,
    };
  }
  return null;
}

export function buildReminders({ vaccinations = [], checkups = [] }) {
  return [
    ...vaccinations.map((item) => classifyReminder(item, 'vaccination')),
    ...checkups.map((item) => classifyReminder(item, 'checkup')),
  ]
    .filter(Boolean)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}
