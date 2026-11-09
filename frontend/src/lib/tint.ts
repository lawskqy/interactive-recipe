// Mixes a hex colour towards white (positive amount) or black (negative).
export function tint(hex: string, amount: number) {
  const value = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const target = amount < 0 ? 0 : 255, weight = Math.abs(amount);
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * (1 - weight) + target * weight);
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}
