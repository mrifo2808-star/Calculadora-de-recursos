import * as XLSX from 'xlsx';
import type { EstadoCatalogo, RecursoCatalogo } from './types';
import { catalogoWorkerUrl, urlConForzado } from './catalogoSharePoint';

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
 * Nucleo de la lectura, separado de la fuente del archivo (File del input local, o los
 * bytes que trae el Worker-proxy de SharePoint — ver src/catalogoSharePoint.ts) para
 * que ambos caminos usen EXACTAMENTE el mismo parser y nunca puedan desincronizarse en
 * el formato de columnas. Mismas columnas que descargarCatalogoExcel. Filas sin Tipo/
 * Nombre visible se descartan; IDs repetidos se fusionan quedandose con la ULTIMA fila
 * del archivo (permite "corregir" una fila agregando otra mas abajo con el mismo ID
 * tecnico).
 */
export function procesarLibroCatalogo(buffer: ArrayBuffer): ResultadoImportacionCatalogo {
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

/**
 * Trae el catalogo desde el Worker-proxy de Cloudflare que sirve el .xlsx compartido en
 * SharePoint (ver worker-catalogo/README.md) y lo procesa con `procesarLibroCatalogo`.
 *
 * SharePoint es la ÚNICA vía de actualización del catálogo compartido (no existe carga
 * manual de un Excel desde la UI): por eso cada punto de falla lanza un mensaje propio,
 * concreto y accionable (qué revisar, y que se puede reintentar con «Actualizar
 * catálogo») en vez de dejar pasar el error crudo de fetch/xlsx. Quien llama (
 * CatalogContext.tsx) nunca toca el catálogo ya cargado antes de que esta función
 * resuelva con éxito, así que cualquiera de estos throw deja la app usable con el último
 * catálogo compartido, nunca en blanco.
 */
export async function obtenerCatalogoDesdeSharePoint(forzar: boolean): Promise<ResultadoImportacionCatalogo> {
  if (!catalogoWorkerUrl) throw new Error('VITE_CATALOGO_WORKER_URL no está configurado en este build.');

  let respuesta: Response;
  try {
    respuesta = await fetch(urlConForzado(catalogoWorkerUrl, forzar));
  } catch {
    throw new Error(
      'No se pudo contactar el proxy de catálogo — revisa tu conexión a internet. El catálogo actual se mantiene sin cambios; puedes reintentar con «Actualizar catálogo».',
    );
  }

  if (!respuesta.ok) {
    const texto = await respuesta.text().catch(() => '');
    throw new Error(
      `El proxy de catálogo respondió ${respuesta.status}${texto ? `: ${texto}` : '.'} ` +
        'Reintenta en unos minutos con «Actualizar catálogo»; si el problema persiste, avisa a quien administra el Worker de catálogo (puede que el enlace de SharePoint haya vencido o cambiado de permisos).',
    );
  }

  const buffer = await respuesta.arrayBuffer();
  try {
    return procesarLibroCatalogo(buffer);
  } catch {
    throw new Error(
      'El archivo recibido no se pudo leer como Excel. El catálogo actual se mantiene sin cambios; reintenta con «Actualizar catálogo» y si persiste, avisa a quien administra el Worker de catálogo.',
    );
  }
}
