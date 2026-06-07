export function buildTimeline({ vaccinations = [], checkups = [], milestones = [], appointments = [], visits = [] }) {
  const vaccineEvents = vaccinations.map((item) => ({
    id: item.id,
    type: 'vaccination',
    title: item.vaccine_name,
    status: item.status,
    date: item.completed_date || item.scheduled_date || item.recommended_date,
    data: item,
  }));

  const checkupEvents = checkups.map((item) => ({
    id: item.id,
    type: 'checkup',
    title: item.checkup_type,
    status: item.status,
    date: item.completed_date || item.scheduled_date,
    data: item,
  }));

  const milestoneEvents = milestones.map((item) => ({
    id: item.id,
    type: 'milestone',
    title: item.title,
    status: item.status,
    date: item.achieved_date || item.expected_date,
    data: item,
  }));

  const appointmentEvents = appointments.map((item) => ({
    id: item.id,
    type: item.type === 'vaccination' ? 'vaccination' : item.type === 'checkup' ? 'checkup' : 'appointment',
    title: `${item.type.replace('_', ' ')} appointment`,
    status: item.status,
    date: item.completed_at || item.scheduled_at,
    notes: item.notes,
    provider_name: item.provider_name,
    data: item,
  }));

  const visitEvents = visits.map((item) => ({
    id: item.id,
    type: 'home_visit',
    title: `${item.visit_type || 'Home'} visit`,
    status: item.status,
    date: item.completed_at || item.scheduled_at,
    notes: item.risk_notes || item.vaccination_notes || item.nutrition_notes,
    provider_name: item.nurse_name,
    data: item,
  }));

  return [...vaccineEvents, ...checkupEvents, ...milestoneEvents, ...appointmentEvents, ...visitEvents]
    .filter((event) => event.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}
