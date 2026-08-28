import { afterEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { obtenerCatalogoDesdeSharePoint, procesarLibroCatalogo } from './excelCatalogo';

/** Arma un .xlsx en memoria con las mismas columnas que descargarCatalogoExcel, para
 * probar procesarLibroCatalogo sin pasar por el DOM (File) — mismo patron que
 * importCubicacion.test.ts. */
function libroDePrueba(filas: Record<string, unknown>[], nombreHoja = 'Catalogo'): ArrayBuffer {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), nombreHoja);
  return XLSX.write(libro, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

const FILA_VALIDA = {
  Estado: 'Validado',
  Tipo: 'Video',
  'Nombre visible': 'Video After',
  Extension: '1 min',
  Unidad: 'minutos',
  'DI (HH)': 1.5,
  'DG (HH)': 2,
  'SOP (HH)': 0.2,
  'ID tecnico': 'Video|Video After|1 min',
  Fuente: 'test',
  Observaciones: '',
};

describe('procesarLibroCatalogo — estructura', () => {
  it('lee la hoja "Catalogo" y devuelve las filas validas', () => {
    const resultado = procesarLibroCatalogo(libroDePrueba([FILA_VALIDA]));
    expect(resultado.filasLeidas).toBe(1);
    expect(resultado.filasValidas).toBe(1);
    expect(resultado.catalogo[0].nombreVisible).toBe('Video After');
    expect(resultado.catalogo[0].di).toBe(1.5);
  });

  it('si no hay hoja "Catalogo" usa la primera hoja del libro (tolerante a un archivo renombrado)', () => {
    const resultado = procesarLibroCatalogo(libroDePrueba([FILA_VALIDA], 'Hoja1'));
    expect(resultado.filasValidas).toBe(1);
  });
});

describe('procesarLibroCatalogo — filas', () => {
  it('descarta una fila sin Tipo o sin Nombre visible, con aviso', () => {
    const resultado = procesarLibroCatalogo(libroDePrueba([{ ...FILA_VALIDA, Tipo: '' }]));
    expect(resultado.filasValidas).toBe(0);
    expect(resultado.erroresFila[0]).toContain('falta Tipo o Nombre visible');
  });

  it('un Estado invalido cae a "Pendiente" con aviso, sin perder la fila', () => {
    const resultado = procesarLibroCatalogo(libroDePrueba([{ ...FILA_VALIDA, Estado: 'Quien sabe' }]));
    expect(resultado.catalogo[0].estado).toBe('Pendiente');
    expect(resultado.erroresFila.some((e) => e.includes('Estado'))).toBe(true);
  });

  it('genera un ID tecnico si la fila no trae uno', () => {
    const sinId: Record<string, unknown> = { ...FILA_VALIDA };
    delete sinId['ID tecnico'];
    const resultado = procesarLibroCatalogo(libroDePrueba([sinId]));
    expect(resultado.catalogo[0].id).toBe('Video|Video After|1 min');
  });

  it('fusiona IDs repetidos quedandose con la ULTIMA fila del archivo', () => {
    const primera = { ...FILA_VALIDA, 'DI (HH)': 1 };
    const segunda = { ...FILA_VALIDA, 'DI (HH)': 99 };
    const resultado = procesarLibroCatalogo(libroDePrueba([primera, segunda]));
    expect(resultado.filasValidas).toBe(1);
    expect(resultado.duplicadosFusionados).toBe(1);
    expect(resultado.catalogo[0].di).toBe(99);
  });

  it('acepta un numero con coma decimal (formato es-CL)', () => {
    const resultado = procesarLibroCatalogo(libroDePrueba([{ ...FILA_VALIDA, 'DI (HH)': '1,5' }]));
    expect(resultado.catalogo[0].di).toBeCloseTo(1.5);
  });

  it('una celda DI/DG/SOP vacia queda null (recurso sin ese dato, no 0)', () => {
    const resultado = procesarLibroCatalogo(libroDePrueba([{ ...FILA_VALIDA, 'DI (HH)': '' }]));
    expect(resultado.catalogo[0].di).toBeNull();
  });
});

describe('obtenerCatalogoDesdeSharePoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lanza un error claro si VITE_CATALOGO_WORKER_URL no esta configurado (estado real de este build de pruebas, sin .env)', async () => {
    await expect(obtenerCatalogoDesdeSharePoint(false)).rejects.toThrow(/VITE_CATALOGO_WORKER_URL/);
  });

  it('nunca llega a llamar fetch si la URL no esta configurada', async () => {
    const fetchEspiado = vi.fn();
    vi.stubGlobal('fetch', fetchEspiado);
    await expect(obtenerCatalogoDesdeSharePoint(false)).rejects.toThrow();
    expect(fetchEspiado).not.toHaveBeenCalled();
  });
});
