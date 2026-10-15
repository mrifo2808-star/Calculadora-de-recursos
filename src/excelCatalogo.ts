import * as XLSX from 'xlsx';
import type { EstadoCatalogo, RecursoCatalogo } from './types';
import { catalogoWorkerUrl, urlConForzado } from './catalogoSharePoint';
import { alcanceDesdeId } from './catalogoIds';

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

/** Encabezados aceptados para cada columna del catalogo compartido.
 *
 * Existen porque la planilla de SharePoint se edita a mano y sus encabezados han ido
 * cambiando: tildes, parentesis, y nombres que se renombraron entre ciclos. Antes el
 * parser leia `fila['Nombre visible']` por coincidencia EXACTA, asi que el dia que la
 * columna paso a llamarse «Nombre visible (artefactos)» el catalogo entero dejo de
 * leerse en silencio. */
const ENCABEZADOS = {
  estado: ['Estado'],
  tipo: ['Tipo'],
  nombre: ['Nombre visible', 'Nombre visible (artefactos)'],
  extension: ['Extension'],
  unidad: ['Unidad'],
  di: ['DI (HH)'],
  dg: ['DG (HH)'],
  // «SOP (HH)» es el TOTAL de Soporte. En el catalogo v1 es una formula que suma «QA de
  // recursos» e «Implementacion»; se lee el total, nunca los componentes, para no
  // contarlos dos veces. «VOP (HH)» y «QA Final (HH)» son como se llamo antes.
  sop: ['SOP (HH)', 'VOP (HH)', 'QA Final (HH)'],
  id: ['ID tecnico'],
  fuente: ['Fuente'],
  observaciones: ['Observaciones', 'Alcance'],
} as const;

/** Normaliza un encabezado para compararlo: sin tildes, sin espacios (incluido el
 * espacio sin separacion U+00A0, que `\s` cubre) y en minusculas. Es lo que permite leer
 * «Extension» y «Extensión», o «Soporte(HH)» y «Soporte (HH)», sin depender de como se
 * haya tipeado la cabecera en la planilla compartida. */
function normalizarClave(clave: string): string {
  return clave
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** Busca el valor de una celda por cualquiera de los encabezados dados, comparando de
 * forma normalizada. undefined si ninguna columna del archivo coincide. */
function celda(fila: Record<string, unknown>, encabezados: readonly string[]): unknown {
  const buscados = encabezados.map(normalizarClave);
  for (const [clave, valor] of Object.entries(fila)) {
    if (buscados.includes(normalizarClave(clave))) return valor;
  }
  return undefined;
}

export type SeveridadAviso = 'bloqueante' | 'dato' | 'revision';

export interface AvisoCatalogo {
  severidad: SeveridadAviso;
  /** Fila del Excel, o null para un aviso sobre el archivo completo. */
  fila: number | null;
  mensaje: string;
}


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
  /** Filas sin Tipo o sin Nombre visible, que no entraron al catalogo. */
  filasDescartadas: number;
  duplicadosFusionados: number;
  /** CUALES IDs se repitieron, no solo cuantos: sin esto no hay como ir a buscarlos a la
   * planilla. */
  idsDuplicados: string[];
  avisos: AvisoCatalogo[];
  /** Se mantiene para no romper a quien ya lo usa: mismos textos que `avisos`. */
  erroresFila: string[];
}

function comoTexto(valor: unknown): string {
  return valor == null ? '' : String(valor).trim();
}

function comoNumero(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  // Se limpian TODOS los espacios (incluido U+00A0, el que deja Excel al pegar celdas) y
  // se acepta coma decimal: en la planilla compartida hay horas guardadas como texto en
  // formato es-CL, del tipo «0,30», que de otro modo se perderian.
  const limpio = String(valor).replace(/\s/g, '').replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
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
  const avisos: AvisoCatalogo[] = [];
  const idsDuplicados: string[] = [];
  let duplicadosFusionados = 0;
  let filasDescartadas = 0;

  filas.forEach((fila, indice) => {
    const numeroFilaExcel = indice + 2; // +1 por header, +1 por indice 0-based
    const tipo = comoTexto(celda(fila, ENCABEZADOS.tipo));
    const nombreVisible = comoTexto(celda(fila, ENCABEZADOS.nombre));
    if (!tipo || !nombreVisible) {
      filasDescartadas += 1;
      avisos.push({
        severidad: 'bloqueante',
        fila: numeroFilaExcel,
        mensaje: `Fila ${numeroFilaExcel}: falta Tipo o Nombre visible, se omite.`,
      });
      return;
    }

    const extension = comoTexto(celda(fila, ENCABEZADOS.extension));
    let estado = comoTexto(celda(fila, ENCABEZADOS.estado)) as EstadoCatalogo;
    if (!ESTADOS_VALIDOS.includes(estado)) {
      avisos.push({
        severidad: 'dato',
        fila: numeroFilaExcel,
        mensaje: `Fila ${numeroFilaExcel}: Estado "${estado || '(vacio)'}" invalido, se usa "Pendiente".`,
      });
      estado = 'Pendiente';
    }

    let id = comoTexto(celda(fila, ENCABEZADOS.id));
    if (!id) id = generarId(tipo, nombreVisible, extension, new Set(mapa.keys()));
    if (mapa.has(id)) {
      duplicadosFusionados += 1;
      if (!idsDuplicados.includes(id)) idsDuplicados.push(id);
      avisos.push({
        severidad: 'revision',
        fila: numeroFilaExcel,
        mensaje: `Fila ${numeroFilaExcel}: el ID tecnico "${id}" ya existe en el archivo. Se conserva esta fila y se descarta la anterior.`,
      });
    }

    mapa.set(id, {
      id,
      estado,
      tipo,
      nombreVisible,
      extension,
      unidad: comoTexto(celda(fila, ENCABEZADOS.unidad)),
      alcanceEntrega: alcanceDesdeId(id),
      di: comoNumero(celda(fila, ENCABEZADOS.di)),
      dg: comoNumero(celda(fila, ENCABEZADOS.dg)),
      sop: comoNumero(celda(fila, ENCABEZADOS.sop)),
      fuente: comoTexto(celda(fila, ENCABEZADOS.fuente)),
      observaciones: comoTexto(celda(fila, ENCABEZADOS.observaciones)),
    });
  });

  // Un archivo con filas donde NINGUNA entro es casi siempre un encabezado renombrado,
  // no 139 filas mal llenadas. Decirlo en esos terminos ahorra la busqueda.
  if (filas.length > 0 && mapa.size === 0) {
    avisos.unshift({
      severidad: 'bloqueante',
      fila: null,
      mensaje:
        `El archivo tiene ${filas.length} filas y ninguna pudo leerse. ` +
        'Revisa que la hoja se llame "Catalogo" y que existan las columnas "Tipo" y "Nombre visible".',
    });
  }

  return {
    catalogo: Array.from(mapa.values()),
    filasLeidas: filas.length,
    filasValidas: mapa.size,
    filasDescartadas,
    duplicadosFusionados,
    idsDuplicados,
    avisos,
    erroresFila: avisos.map((a) => a.mensaje),
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
  let resultado: ResultadoImportacionCatalogo;
  try {
    resultado = procesarLibroCatalogo(buffer);
  } catch {
    throw new Error(
      'El archivo recibido no se pudo leer como Excel. El catálogo actual se mantiene sin cambios; reintenta con «Actualizar catálogo» y si persiste, avisa a quien administra el Worker de catálogo.',
    );
  }

  // Un catálogo que se descarga bien pero queda VACÍO es peor que uno que falla: la app
  // sigue andando y quien cubica no tiene cómo saber que está calculando sobre nada. Se
  // trata igual que una falla de descarga para que CatalogContext conserve el catálogo
  // anterior en vez de reemplazarlo por cero filas.
  if (resultado.filasLeidas > 0 && resultado.filasValidas === 0) {
    throw new Error(
      `El catálogo se descargó pero ninguna de sus ${resultado.filasLeidas} filas pudo leerse. ` +
        'Suele ser un encabezado renombrado en la planilla: revisa que existan las columnas "Tipo" y "Nombre visible". ' +
        'El catálogo actual se mantiene sin cambios.',
    );
  }

  return resultado;
}
