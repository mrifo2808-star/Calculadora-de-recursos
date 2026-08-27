import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { compararGestion, compararProduccion, procesarLibroCubicacion } from './importCubicacion';
import type { GestionRow, ProduccionRow, RecursoCatalogo } from './types';
import { SECCIONES } from './data/plantilla';

const CATALOGO: RecursoCatalogo[] = [
  {
    id: 'Video|Video After T1|1 min',
    estado: 'Validado',
    tipo: 'Video',
    nombreVisible: 'Video After',
    extension: '1 min',
    unidad: 'minutos',
    di: 1.5,
    dg: 2.05,
    sop: 0.2,
    fuente: 'test',
    observaciones: '',
  },
];

/** Arma un .xlsx en memoria con las mismas hojas/columnas que exportCubicacion.ts, para
 * probar procesarLibroCubicacion sin pasar por el DOM (File/input) — el mismo objetivo
 * que ya separa `procesarLibroCubicacion` de `leerCubicacionExcel`. */
function libroDePrueba(hojas: {
  parametros?: Record<string, unknown>[];
  gestion?: Record<string, unknown>[];
  cubicacion?: Record<string, unknown>[];
  omitirHoja?: 'Parametros' | 'Gestion' | 'Cubicacion';
}): ArrayBuffer {
  const libro = XLSX.utils.book_new();
  const paramsDefault = [{ Proyecto: 'Curso demo', Cliente: 'Cliente demo', 'N° cursos': 1, 'N° semanas': 4, Modalidad: 'Full' }];
  const gestionDefault = [{ Cargo: 'Gestion JP', '% proyecto': 30, Activa: 'Sí' }];
  const cubicacionDefault = [
    { Sección: SECCIONES[0], Tarea: 'Tarea demo', 'Tipo / Recurso': '', Cantidad: 1, Frecuencia: 'Por curso' },
  ];

  if (hojas.omitirHoja !== 'Parametros') {
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(hojas.parametros ?? paramsDefault), 'Parametros');
  }
  if (hojas.omitirHoja !== 'Gestion') {
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(hojas.gestion ?? gestionDefault), 'Gestion');
  }
  if (hojas.omitirHoja !== 'Cubicacion') {
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(hojas.cubicacion ?? cubicacionDefault), 'Cubicacion');
  }

  // XLSX.write con type:'array' devuelve un ArrayBuffer ya (no un Uint8Array pese al
  // nombre de la opcion) — el mismo tipo que espera XLSX.read({type:'array'}).
  return XLSX.write(libro, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

describe('procesarLibroCubicacion — estructura', () => {
  it('parsea un archivo valido sin avisos ni rechazadas', () => {
    const resultado = procesarLibroCubicacion(libroDePrueba({}), CATALOGO);
    expect(resultado.parametros.proyecto).toBe('Curso demo');
    expect(resultado.gestion).toHaveLength(1);
    expect(resultado.produccion).toHaveLength(1);
    expect(resultado.avisos).toHaveLength(0);
    expect(resultado.rechazadas).toHaveLength(0);
  });

  it('rechaza el archivo si falta una hoja requerida, sin tocar datos', () => {
    const buffer = libroDePrueba({ omitirHoja: 'Gestion' });
    expect(() => procesarLibroCubicacion(buffer, CATALOGO)).toThrow(/falta.*hoja|Gestion/i);
  });

  it('rechaza el archivo si a una hoja le faltan columnas esperadas', () => {
    const buffer = libroDePrueba({ cubicacion: [{ Sección: SECCIONES[0], Tarea: 'x' }] }); // sin Cantidad/Frecuencia/Tipo-Recurso
    expect(() => procesarLibroCubicacion(buffer, CATALOGO)).toThrow(/columnas esperadas/i);
  });

  it('rechaza un archivo de Gestion del formato anterior (Cantidad/Frecuencia/HH unitarias, sin "% proyecto")', () => {
    // Gestion es exclusivamente porcentual desde el 27-08-2026: un archivo exportado
    // antes de ese cambio no tiene la columna "% proyecto" y ya no calza — error
    // estructural claro, no una importacion parcial silenciosa con horas mal migradas.
    const buffer = libroDePrueba({ gestion: [{ Cargo: 'Gestion JP', Cantidad: 1, Frecuencia: 'Por semana', 'HH unitarias': 0.25, Activa: 'Sí' }] });
    expect(() => procesarLibroCubicacion(buffer, CATALOGO)).toThrow(/columnas esperadas.*% proyecto|% proyecto.*columnas esperadas/is);
  });

  it('rechaza un buffer que no es un xlsx valido con un mensaje claro (no una excepcion cruda de la libreria)', () => {
    const basura = new TextEncoder().encode('esto no es un excel').buffer;
    // SheetJS es tolerante: para basura sin estructura de zip no siempre lanza, a veces
    // devuelve un libro sin hojas — cualquiera de los dos caminos debe terminar en un
    // error claro y entendible, nunca en una excepcion sin mensaje util para el usuario.
    expect(() => procesarLibroCubicacion(basura as ArrayBuffer, CATALOGO)).toThrow(/no se pudo leer el archivo|no tiene el formato esperado/i);
  });

  it('rechaza el archivo si la hoja Parametros tiene los encabezados pero cero filas de datos', () => {
    const libro = XLSX.utils.book_new();
    const soloEncabezados = XLSX.utils.json_to_sheet([], { header: ['Proyecto', 'Cliente', 'N° cursos', 'N° semanas', 'Modalidad'] });
    XLSX.utils.book_append_sheet(libro, soloEncabezados, 'Parametros');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet([{ Cargo: 'A', '% proyecto': 10, Activa: 'Sí' }]), 'Gestion');
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet([{ Sección: SECCIONES[0], Tarea: 'x', 'Tipo / Recurso': '', Cantidad: 1, Frecuencia: 'Por curso' }]),
      'Cubicacion',
    );
    const buffer = XLSX.write(libro, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    expect(() => procesarLibroCubicacion(buffer, CATALOGO)).toThrow(/Parametros.*datos/i);
  });
});

describe('procesarLibroCubicacion — filas de Gestion (exclusivamente porcentual)', () => {
  it('omite (rechaza) una fila sin Cargo y lo reporta', () => {
    const buffer = libroDePrueba({ gestion: [{ Cargo: '', '% proyecto': 10, Activa: 'Sí' }] });
    const resultado = procesarLibroCubicacion(buffer, CATALOGO);
    expect(resultado.gestion).toHaveLength(0);
    expect(resultado.rechazadas).toEqual([{ hoja: 'Gestion', fila: 2, motivo: expect.stringContaining('Cargo') }]);
  });

  it('interpreta variantes de "Activa" sin exigir el "Sí" exacto del export', () => {
    const buffer = libroDePrueba({
      gestion: [
        { Cargo: 'A', '% proyecto': 10, Activa: 'si' },
        { Cargo: 'B', '% proyecto': 10, Activa: 'No (excluida del total)' },
        { Cargo: 'C', '% proyecto': 10, Activa: '' },
      ],
    });
    const resultado = procesarLibroCubicacion(buffer, CATALOGO);
    expect(resultado.gestion.map((g) => g.activa)).toEqual([true, false, true]);
  });

  it('acepta un porcentaje con coma decimal (formato es-CL) sin aviso', () => {
    const buffer = libroDePrueba({ gestion: [{ Cargo: 'A', '% proyecto': '7,5', Activa: 'Sí' }] });
    const resultado = procesarLibroCubicacion(buffer, CATALOGO);
    expect(resultado.gestion[0].porcentaje).toBeCloseTo(7.5);
    expect(resultado.avisos).toHaveLength(0);
  });

  it('un porcentaje no reconocible cae a 0 con aviso (no se pierde la fila)', () => {
    const buffer = libroDePrueba({ gestion: [{ Cargo: 'A', '% proyecto': 'no-es-numero', Activa: 'Sí' }] });
    const resultado = procesarLibroCubicacion(buffer, CATALOGO);
    expect(resultado.gestion).toHaveLength(1);
    expect(resultado.gestion[0].porcentaje).toBe(0);
    expect(resultado.avisos.some((a) => a.includes('% proyecto'))).toBe(true);
  });

  it('un "% proyecto" vacio se importa como 0% sin aviso (cargo agregado a mano, aun sin completar)', () => {
    const buffer = libroDePrueba({ gestion: [{ Cargo: 'Cargo nuevo', '% proyecto': '', Activa: 'Sí' }] });
    const resultado = procesarLibroCubicacion(buffer, CATALOGO);
    expect(resultado.gestion[0].porcentaje).toBe(0);
    expect(resultado.avisos).toHaveLength(0);
  });
});

describe('procesarLibroCubicacion — filas de Cubicacion', () => {
  it('omite (rechaza) una fila sin Tarea ni Tipo/Recurso', () => {
    const buffer = libroDePrueba({ cubicacion: [{ Sección: SECCIONES[0], Tarea: '', 'Tipo / Recurso': '', Cantidad: 1, Frecuencia: 'Por curso' }] });
    const resultado = procesarLibroCubicacion(buffer, CATALOGO);
    expect(resultado.produccion).toHaveLength(0);
    expect(resultado.rechazadas[0].hoja).toBe('Cubicacion');
  });

  it('conserva una fila con Tarea pero sin recurso asignado (Pendiente de catalogar)', () => {
    const buffer = libroDePrueba({ cubicacion: [{ Sección: SECCIONES[0], Tarea: 'Solo tarea', 'Tipo / Recurso': '', Cantidad: 1, Frecuencia: 'Por curso' }] });
    const resultado = procesarLibroCubicacion(buffer, CATALOGO);
    expect(resultado.produccion).toHaveLength(1);
    expect(resultado.produccion[0].recursoId).toBeNull();
    expect(resultado.rechazadas).toHaveLength(0);
  });

  it('resuelve el recursoId a partir de la etiqueta "Tipo — Nombre — Extension"', () => {
    const buffer = libroDePrueba({
      cubicacion: [{ Sección: SECCIONES[0], Tarea: 'Con recurso', 'Tipo / Recurso': 'Video — Video After — 1 min', Cantidad: 1, Frecuencia: 'Por curso' }],
    });
    const resultado = procesarLibroCubicacion(buffer, CATALOGO);
    expect(resultado.produccion[0].recursoId).toBe('Video|Video After T1|1 min');
    expect(resultado.avisos).toHaveLength(0);
  });

  it('avisa y deja sin asignar un recurso que ya no existe en el catalogo actual', () => {
    const buffer = libroDePrueba({
      cubicacion: [{ Sección: SECCIONES[0], Tarea: 'Recurso viejo', 'Tipo / Recurso': 'Video — Recurso Descontinuado — 5 min', Cantidad: 1, Frecuencia: 'Por curso' }],
    });
    const resultado = procesarLibroCubicacion(buffer, CATALOGO);
    expect(resultado.produccion[0].recursoId).toBeNull();
    expect(resultado.avisos.some((a) => a.includes('Recurso Descontinuado'))).toBe(true);
  });

  it('corrige una Seccion desconocida a la primera seccion valida, con aviso', () => {
    const buffer = libroDePrueba({
      cubicacion: [{ Sección: 'SECCION QUE YA NO EXISTE', Tarea: 'x', 'Tipo / Recurso': '', Cantidad: 1, Frecuencia: 'Por curso' }],
    });
    const resultado = procesarLibroCubicacion(buffer, CATALOGO);
    expect(resultado.produccion[0].seccion).toBe(SECCIONES[0]);
    expect(resultado.avisos.some((a) => a.includes('sección'))).toBe(true);
  });

  it('corrige una Frecuencia desconocida a "Por curso", con aviso', () => {
    const buffer = libroDePrueba({
      cubicacion: [{ Sección: SECCIONES[0], Tarea: 'x', 'Tipo / Recurso': '', Cantidad: 1, Frecuencia: 'Cada luna llena' }],
    });
    const resultado = procesarLibroCubicacion(buffer, CATALOGO);
    expect(resultado.produccion[0].frecuencia).toBe('Por curso');
    expect(resultado.avisos.some((a) => a.includes('frecuencia'))).toBe(true);
  });
});

describe('compararProduccion / compararGestion', () => {
  const base: ProduccionRow = { rowId: 'p-1', seccion: SECCIONES[0], tarea: 'Tarea A', recursoId: null, cantidad: 1, frecuencia: 'Por curso', removable: true };

  it('cuenta nuevas, cambiadas, sin cambios y eliminadas', () => {
    const actuales: ProduccionRow[] = [
      { ...base, rowId: 'p-1', tarea: 'Tarea A', cantidad: 1 }, // se mantiene igual
      { ...base, rowId: 'p-2', tarea: 'Tarea B', cantidad: 2 }, // cambia de cantidad
      { ...base, rowId: 'p-3', tarea: 'Tarea C' }, // desaparece en el import
    ];
    const importadas: ProduccionRow[] = [
      { ...base, rowId: 'x-1', tarea: 'Tarea A', cantidad: 1 }, // sin cambios
      { ...base, rowId: 'x-2', tarea: 'Tarea B', cantidad: 5 }, // cambiada
      { ...base, rowId: 'x-3', tarea: 'Tarea D' }, // nueva
    ];
    expect(compararProduccion(actuales, importadas)).toEqual({ nuevas: 1, cambiadas: 1, sinCambios: 1, eliminadas: 1 });
  });

  it('gestion: compara por Cargo y detecta cambios en porcentaje/activa', () => {
    const g = (over: Partial<GestionRow>): GestionRow => ({
      rowId: 'g',
      cargo: 'JP',
      porcentaje: 30,
      removable: true,
      activa: true,
      ...over,
    });
    const actuales = [g({})];
    const sinCambios = compararGestion(actuales, [g({ rowId: 'otro' })]);
    expect(sinCambios).toEqual({ nuevas: 0, cambiadas: 0, sinCambios: 1, eliminadas: 0 });

    const cambiaActiva = compararGestion(actuales, [g({ rowId: 'otro', activa: false })]);
    expect(cambiaActiva).toEqual({ nuevas: 0, cambiadas: 1, sinCambios: 0, eliminadas: 0 });

    const cambiaPorcentaje = compararGestion(actuales, [g({ rowId: 'otro', porcentaje: 45 })]);
    expect(cambiaPorcentaje).toEqual({ nuevas: 0, cambiadas: 1, sinCambios: 0, eliminadas: 0 });
  });
});
