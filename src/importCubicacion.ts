import * as XLSX from 'xlsx';
import { etiquetaCompleta } from './calc';
import { nextId, SECCIONES } from './data/plantilla';
import { FRECUENCIAS, type Frecuencia, type GestionRow, type ParametrosCurso, type ProduccionRow, type RecursoCatalogo } from './types';

/**
 * Importación inversa del .xlsx que genera "⬇ Exportar a Excel" (exportCubicacion.ts):
 * mismas 3 hojas de entrada (Parametros, Gestion, Cubicacion — "Resumen" es solo salida,
 * no se lee) y mismas columnas. Reemplaza Cubicación/Gestión/Parámetros completos — no
 * hace un merge parcial — así que quien llama debe mostrar el resumen de `compararXxx`
 * antes de aplicar `ResultadoImportacion` al estado.
 */

const HOJAS_REQUERIDAS = ['Parametros', 'Gestion', 'Cubicacion'] as const;

const COLUMNAS_PARAMETROS = ['Proyecto', 'Cliente', 'N° cursos', 'N° semanas', 'Modalidad'] as const;
const COLUMNAS_GESTION = ['Cargo', 'Cantidad', 'Frecuencia', 'HH unitarias', 'Activa'] as const;
const COLUMNAS_CUBICACION = ['Sección', 'Tarea', 'Tipo / Recurso', 'Cantidad', 'Frecuencia'] as const;

export interface FilaRechazada {
  hoja: 'Gestion' | 'Cubicacion';
  fila: number;
  motivo: string;
}

export interface ResultadoImportacion {
  parametros: ParametrosCurso;
  gestion: GestionRow[];
  produccion: ProduccionRow[];
  /** Filas que sí se importaron pero con algún dato inválido corregido a un valor por
   * defecto (frecuencia desconocida, número mal formado, recurso ya no vigente, etc.). */
  avisos: string[];
  /** Filas descartadas por completo (no se importan) porque no tenían información
   * suficiente para ser útiles — ninguna se pierde en silencio: todas quedan listadas aquí. */
  rechazadas: FilaRechazada[];
}

function comoTexto(valor: unknown): string {
  return valor == null ? '' : String(valor).trim();
}

/** Acepta número JS directo (celda numérica de Excel) o texto en formato es-CL ("4,5")
 * o en-US ("4.5"), con o sin separador de miles ("1.234,5" / "1,234.5"). Si ambos
 * separadores aparecen, el que está más a la derecha es el decimal. Vacío -> null
 * (normal, sin aviso); no numérico -> null (el llamador decide el aviso). */
function parseNumeroLocal(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const texto = comoTexto(valor);
  if (!texto) return null;
  let normalizado = texto.replace(/\s/g, '');
  const iComa = normalizado.lastIndexOf(',');
  const iPunto = normalizado.lastIndexOf('.');
  if (iComa !== -1 && iPunto !== -1) {
    normalizado = iComa > iPunto ? normalizado.replace(/\./g, '').replace(',', '.') : normalizado.replace(/,/g, '');
  } else if (iComa !== -1) {
    normalizado = normalizado.replace(',', '.');
  }
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/** Redondea a 4 decimales: evita que artefactos de punto flotante (0.1 + 0.2, etc.) o
 * HH con muchos decimales generen avisos/diferencias falsas al comparar filas. */
const redondear = (n: number): number => Math.round(n * 10000) / 10000;

function comoNumero(valor: unknown, fallback: number, avisos: string[], contexto: string, campo: string): number {
  const texto = comoTexto(valor);
  if (!texto) return fallback; // celda vacia: normal, sin aviso
  const n = parseNumeroLocal(valor);
  if (n === null) {
    avisos.push(`${contexto}: "${campo}" tiene un valor no numérico ("${texto}"), se usó ${fallback}.`);
    return fallback;
  }
  return redondear(n);
}

function comoFrecuencia(valor: unknown, avisos: string[], contexto: string): Frecuencia {
  const texto = comoTexto(valor);
  if ((FRECUENCIAS as string[]).includes(texto)) return texto as Frecuencia;
  avisos.push(`${contexto}: frecuencia "${texto || '(vacía)'}" no reconocida, se usó "Por curso".`);
  return 'Por curso';
}

/** Cualquier texto que no diga explícitamente "no"/"false"/"0" se toma como activa —
 * tolerante a ediciones a mano ("Si", "SI", "activo", "x") sin exigir el "Sí" con tilde
 * exacto que escribe el export. */
function comoActiva(valor: unknown): boolean {
  const texto = comoTexto(valor).toLowerCase();
  if (!texto) return true;
  return !(texto.startsWith('no') || texto === 'false' || texto === '0');
}

function encabezadosHoja(hoja: XLSX.WorkSheet): Set<string> {
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1 });
  return new Set((filas[0] ?? []).map((c) => comoTexto(c)));
}

function validarColumnas(hoja: XLSX.WorkSheet, nombreHoja: string, requeridas: readonly string[]): void {
  const presentes = encabezadosHoja(hoja);
  const faltantes = requeridas.filter((c) => !presentes.has(c));
  if (faltantes.length > 0) {
    throw new Error(
      `La hoja "${nombreHoja}" no tiene las columnas esperadas (faltan: ${faltantes.join(', ')}). ` +
        'Usa un Excel exportado desde esta misma calculadora («⬇ Exportar a Excel») y no cambies los encabezados.',
    );
  }
}

/** Núcleo de la importación, separado de la lectura del File para poder probarlo con un
 * ArrayBuffer armado en memoria (ver importCubicacion.test.ts) sin depender del DOM. */
export function procesarLibroCubicacion(buffer: ArrayBuffer, catalogo: RecursoCatalogo[]): ResultadoImportacion {
  let libro: XLSX.WorkBook;
  try {
    libro = XLSX.read(buffer, { type: 'array' });
  } catch {
    throw new Error('No se pudo leer el archivo. Verifica que sea un .xlsx válido (no un .csv renombrado ni un archivo dañado).');
  }

  const faltantes = HOJAS_REQUERIDAS.filter((nombre) => !libro.SheetNames.includes(nombre));
  if (faltantes.length > 0) {
    throw new Error(
      `El archivo no tiene el formato esperado (faltan hojas: ${faltantes.join(', ')}). ` +
        'Usa un Excel exportado desde esta misma calculadora («⬇ Exportar a Excel»).',
    );
  }

  const hojaParametros = libro.Sheets['Parametros'];
  const hojaGestion = libro.Sheets['Gestion'];
  const hojaCubicacion = libro.Sheets['Cubicacion'];
  // Estructura ANTES que datos: si algo no calza se corta acá, sin tocar ninguna fila.
  validarColumnas(hojaParametros, 'Parametros', COLUMNAS_PARAMETROS);
  validarColumnas(hojaGestion, 'Gestion', COLUMNAS_GESTION);
  validarColumnas(hojaCubicacion, 'Cubicacion', COLUMNAS_CUBICACION);

  const avisos: string[] = [];
  const rechazadas: FilaRechazada[] = [];

  // ── Parametros ──────────────────────────────────────────────────────────────────
  const filaParametros = XLSX.utils.sheet_to_json<Record<string, unknown>>(hojaParametros, { defval: '' })[0];
  if (!filaParametros) throw new Error('La hoja "Parametros" no tiene datos.');
  const proyecto = comoTexto(filaParametros['Proyecto']);
  if (!proyecto) avisos.push('Parámetros: "Proyecto" está vacío en el archivo.');
  const parametros: ParametrosCurso = {
    proyecto,
    cliente: comoTexto(filaParametros['Cliente']),
    nCursos: Math.max(1, Math.round(comoNumero(filaParametros['N° cursos'], 1, avisos, 'Parámetros', 'N° cursos'))),
    nSemanas: Math.max(1, Math.round(comoNumero(filaParametros['N° semanas'], 1, avisos, 'Parámetros', 'N° semanas'))),
    modalidad: comoTexto(filaParametros['Modalidad']),
  };

  // ── Gestion ──────────────────────────────────────────────────────────────────────
  const filasGestion = XLSX.utils.sheet_to_json<Record<string, unknown>>(hojaGestion, { defval: '' });
  const gestion: GestionRow[] = [];
  filasGestion.forEach((f, i) => {
    const numeroFilaExcel = i + 2; // +1 encabezado, +1 indice 0-based
    const cargo = comoTexto(f['Cargo']);
    if (!cargo) {
      rechazadas.push({ hoja: 'Gestion', fila: numeroFilaExcel, motivo: 'Sin "Cargo": la fila no aporta información y se omitió.' });
      return;
    }
    const contexto = `Gestión, fila ${numeroFilaExcel} (${cargo})`;
    gestion.push({
      rowId: nextId('g'),
      cargo,
      cantidad: Math.max(0, comoNumero(f['Cantidad'], 0, avisos, contexto, 'Cantidad')),
      frecuencia: comoFrecuencia(f['Frecuencia'], avisos, contexto),
      hhUnitaria: Math.max(0, comoNumero(f['HH unitarias'], 0, avisos, contexto, 'HH unitarias')),
      removable: true,
      activa: comoActiva(f['Activa']),
    });
  });

  // ── Cubicacion ───────────────────────────────────────────────────────────────────
  // Mismo formato de etiqueta que calc.ts escribe en "Tipo / Recurso" al exportar
  // (etiquetaCompleta), para resolver el id original del catálogo — el Excel no guarda
  // el id interno, solo el texto visible.
  const mapaRecursos = new Map<string, string>();
  for (const r of catalogo) mapaRecursos.set(etiquetaCompleta(r), r.id);

  const filasCubicacion = XLSX.utils.sheet_to_json<Record<string, unknown>>(hojaCubicacion, { defval: '' });
  const produccion: ProduccionRow[] = [];
  filasCubicacion.forEach((f, i) => {
    const numeroFilaExcel = i + 2;
    const tarea = comoTexto(f['Tarea']);
    const etiqueta = comoTexto(f['Tipo / Recurso']);
    if (!tarea && !etiqueta) {
      rechazadas.push({
        hoja: 'Cubicacion',
        fila: numeroFilaExcel,
        motivo: 'Sin "Tarea" ni "Tipo / Recurso": la fila no aporta información y se omitió.',
      });
      return;
    }
    const contexto = `Cubicación, fila ${numeroFilaExcel} (${tarea || 'sin tarea'})`;

    let seccion = comoTexto(f['Sección']);
    if (!(SECCIONES as readonly string[]).includes(seccion)) {
      avisos.push(`${contexto}: sección "${seccion || '(vacía)'}" no reconocida, se movió a "${SECCIONES[0]}".`);
      seccion = SECCIONES[0];
    }

    let recursoId: string | null = null;
    if (etiqueta) {
      recursoId = mapaRecursos.get(etiqueta) ?? null;
      if (!recursoId) avisos.push(`${contexto}: recurso "${etiqueta}" no existe en el catálogo actual, quedó sin asignar (Pendiente de catalogar).`);
    }

    produccion.push({
      rowId: nextId('p'),
      seccion,
      tarea,
      recursoId,
      cantidad: Math.max(0, comoNumero(f['Cantidad'], 0, avisos, contexto, 'Cantidad')),
      frecuencia: comoFrecuencia(f['Frecuencia'], avisos, contexto),
      removable: true,
    });
  });

  return { parametros, gestion, produccion, avisos, rechazadas };
}

export async function leerCubicacionExcel(archivo: File, catalogo: RecursoCatalogo[]): Promise<ResultadoImportacion> {
  const buffer = await archivo.arrayBuffer();
  return procesarLibroCubicacion(buffer, catalogo);
}

// ── Comparación contra el estado actual (para el resumen previo a aplicar) ───────────

export interface ConteoDiff {
  nuevas: number;
  cambiadas: number;
  sinCambios: number;
  eliminadas: number;
}

function compararFilas<T>(actuales: T[], importadas: T[], clave: (r: T) => string, iguales: (a: T, b: T) => boolean): ConteoDiff {
  const mapaActuales = new Map(actuales.map((r) => [clave(r), r]));
  const vistas = new Set<string>();
  let nuevas = 0;
  let cambiadas = 0;
  let sinCambios = 0;
  for (const imp of importadas) {
    const k = clave(imp);
    vistas.add(k);
    const actual = mapaActuales.get(k);
    if (!actual) nuevas += 1;
    else if (iguales(actual, imp)) sinCambios += 1;
    else cambiadas += 1;
  }
  const eliminadas = actuales.filter((r) => !vistas.has(clave(r))).length;
  return { nuevas, cambiadas, sinCambios, eliminadas };
}

// Sin id estable entre export/import: se empareja por contenido (Sección+Tarea /
// Cargo). Varias filas en blanco o con el mismo nombre dentro de la misma sección
// colapsan a la misma clave — el conteo queda aproximado en ese caso, no exacto (no
// afecta la importación en sí, solo el resumen previo).
const claveProduccion = (r: ProduccionRow): string => `${r.seccion} ${r.tarea.trim().toLowerCase()}`;
const igualesProduccion = (a: ProduccionRow, b: ProduccionRow): boolean =>
  a.recursoId === b.recursoId && redondear(a.cantidad) === redondear(b.cantidad) && a.frecuencia === b.frecuencia;

export const compararProduccion = (actuales: ProduccionRow[], importadas: ProduccionRow[]): ConteoDiff =>
  compararFilas(actuales, importadas, claveProduccion, igualesProduccion);

const claveGestion = (r: GestionRow): string => r.cargo.trim().toLowerCase();
const igualesGestion = (a: GestionRow, b: GestionRow): boolean =>
  redondear(a.cantidad) === redondear(b.cantidad) &&
  a.frecuencia === b.frecuencia &&
  redondear(a.hhUnitaria) === redondear(b.hhUnitaria) &&
  a.activa === b.activa;

export const compararGestion = (actuales: GestionRow[], importadas: GestionRow[]): ConteoDiff =>
  compararFilas(actuales, importadas, claveGestion, igualesGestion);
