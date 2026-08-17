import * as XLSX from 'xlsx';
import type { EstadoCatalogo, RecursoCatalogo } from './types';

const HOJA = 'Catalogo';
const COLUMNAS = [
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

const ESTADOS_VALIDOS: EstadoCatalogo[] = ['Validado', 'Pendiente', 'Historico'];

export function descargarCatalogoExcel(catalogo: RecursoCatalogo[], nombreArchivo?: string): void {
  const filas = catalogo.map((r) => ({
    Estado: r.estado,
    Tipo: r.tipo,
    'Nombre visible': r.nombreVisible,
    Extension: r.extension,
    Unidad: r.unidad,
    'DI (HH)': r.di ?? '',
    'DG (HH)': r.dg ?? '',
    'SOP (HH)': r.sop ?? '',
    'ID tecnico': r.id,
    Fuente: r.fuente,
    Observaciones: r.observaciones,
  }));

  const hoja = XLSX.utils.json_to_sheet(filas, { header: [...COLUMNAS] });
  hoja['!cols'] = [
    { wch: 11 },
    { wch: 16 },
    { wch: 30 },
    { wch: 16 },
    { wch: 10 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 42 },
    { wch: 26 },
    { wch: 70 },
  ];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, HOJA);
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, nombreArchivo ?? `catalogo-welearn-${fecha}.xlsx`);
}

export interface ResultadoImportacionCatalogo {
  catalogo: RecursoCatalogo[];
  filasLeidas: number;
  filasValidas: number;
  duplicadosFusionados: number;
  erroresFila: string[];
}

function comoTexto(valor: unknown): string {
  return valor == null ? '' : String(valor).trim();
}

function comoNumero(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function generarId(tipo: string, nombre: string, extension: string, usados: Set<string>): string {
  const base = `${tipo}|${nombre}|${extension}`;
  let id = base;
  let n = 2;
  while (usados.has(id)) {
    id = `${base} (${n})`;
    n += 1;
  }
  return id;
}

/**
 * Lee un .xlsx (mismas columnas que descargarCatalogoExcel) y lo convierte en un
 * catalogo valido. Filas sin Tipo/Nombre visible se descartan; IDs repetidos se
 * fusionan quedandose con la ULTIMA fila del archivo (permite "corregir" una fila
 * agregando otra mas abajo con el mismo ID tecnico).
 */
export async function catalogoDesdeArchivoExcel(archivo: File): Promise<ResultadoImportacionCatalogo> {
  const buffer = await archivo.arrayBuffer();
  const libro = XLSX.read(buffer, { type: 'array' });
  const nombreHoja = libro.SheetNames.includes(HOJA) ? HOJA : libro.SheetNames[0];
  const hoja = libro.Sheets[nombreHoja];
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' });

  const mapa = new Map<string, RecursoCatalogo>();
  const erroresFila: string[] = [];
  let duplicadosFusionados = 0;

  filas.forEach((fila, indice) => {
    const numeroFilaExcel = indice + 2; // +1 por header, +1 por indice 0-based
    const tipo = comoTexto(fila['Tipo']);
    const nombreVisible = comoTexto(fila['Nombre visible']);
    if (!tipo || !nombreVisible) {
      erroresFila.push(`Fila ${numeroFilaExcel}: falta Tipo o Nombre visible, se omite.`);
      return;
    }

    const extension = comoTexto(fila['Extension']);
    let estado = comoTexto(fila['Estado']) as EstadoCatalogo;
    if (!ESTADOS_VALIDOS.includes(estado)) {
      erroresFila.push(`Fila ${numeroFilaExcel}: Estado "${estado || '(vacio)'}" invalido, se usa "Pendiente".`);
      estado = 'Pendiente';
    }

    let id = comoTexto(fila['ID tecnico']);
    if (!id) id = generarId(tipo, nombreVisible, extension, new Set(mapa.keys()));
    if (mapa.has(id)) duplicadosFusionados += 1;

    mapa.set(id, {
      id,
      estado,
      tipo,
      nombreVisible,
      extension,
      unidad: comoTexto(fila['Unidad']),
      di: comoNumero(fila['DI (HH)']),
      dg: comoNumero(fila['DG (HH)']),
      sop: comoNumero(fila['SOP (HH)']),
      fuente: comoTexto(fila['Fuente']),
      observaciones: comoTexto(fila['Observaciones']),
    });
  });

  return {
    catalogo: Array.from(mapa.values()),
    filasLeidas: filas.length,
    filasValidas: mapa.size,
    duplicadosFusionados,
    erroresFila,
  };
}
