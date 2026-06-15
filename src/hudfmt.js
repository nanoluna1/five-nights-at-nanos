export function clockText(state) {
  const hour = Math.floor(state.clockMinutes / 60); // 0..6
  const display = hour === 0 ? 12 : hour;            // 12 AM, then 1..6 AM
  return `${display} AM`;
}

export function powerPct(state) {
  return Math.max(0, Math.min(100, Math.round(state.power)));
}
