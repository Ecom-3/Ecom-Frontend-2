export const formatPickupSchedule = (date, slot) => {
  if (!date && !slot) return '';
  const dateValue = String(date || '').slice(0, 10);
  if (dateValue && /^\d{2}:\d{2}$/.test(String(slot || ''))) {
    const bookedAt = new Date(`${dateValue}T${slot}`);
    if (!Number.isNaN(bookedAt.getTime())) {
      return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(bookedAt);
    }
  }
  return [dateValue, slot].filter(Boolean).join(' · ');
};
