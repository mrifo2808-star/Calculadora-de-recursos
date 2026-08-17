import type { RecursoCatalogo } from './types';

const CSV_COLUMNAS = [
  'Estado',
  'Tipo',
  'Nombre visible',
  'Extension',
  'Unidad',
  'DI (HH)',
  'DG (HH)',
  'SOP (HH)',
  'ID tecnico',
  'Fuente',
  'Observaciones',
] as const;

/** Escapa un valor para CSV (RFC 4180): comillas dobles y separador se envuelven en comillas. */
function celdaCSV(valor: string | number | null): string {
  const texto = valor == null ? '' : String(valor);
  if (/[",\n;]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function catalogoACSV(catalogo: RecursoCatalogo[]): string {
  const filas = catalogo.map((r) =>
    [
      r.estado,
      r.tipo,
      r.nombreVisible,
      r.extension,
      r.unidad,
      r.di,
      r.dg,
      r.sop,
      r.id,
      r.fuente,
      r.observaciones,
    ]
      .map(celdaCSV)
      .join(';'),
  );
  // BOM UTF-8 para que Excel reconozca acentos/eñes al abrir el CSV directamente.
  return '﻿' + [CSV_COLUMNAS.join(';'), ...filas].join('\r\n');
}

export function descargarCSV(nombreArchivo: string, contenido: string): void {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
