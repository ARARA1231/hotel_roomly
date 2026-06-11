function toDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

function daysBetween(checkIn, checkOut) {
  const start = toDateOnly(checkIn);
  const end = toDateOnly(checkOut);
  if (!start || !end) return 0;
  return Math.round((end - start) / 86400000);
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  const aStartDate = toDateOnly(aStart);
  const aEndDate = toDateOnly(aEnd);
  const bStartDate = toDateOnly(bStart);
  const bEndDate = toDateOnly(bEnd);
  if (!aStartDate || !aEndDate || !bStartDate || !bEndDate) return false;
  return aStartDate < bEndDate && bStartDate < aEndDate;
}

module.exports = { toDateOnly, daysBetween, intervalsOverlap };
