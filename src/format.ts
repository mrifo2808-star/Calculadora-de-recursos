export const fmt = (n: number): string =>
  n === 0 ? '0' : n.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
