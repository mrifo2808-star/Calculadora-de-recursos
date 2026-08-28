import { afterEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { procesarLibroCatalogo } from './excelCatalogo';

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

/**
 * `catalogoWorkerUrl` se mockea explicitamente en TODOS estos casos (en vez de confiar
 * en que el `.env` de este checkout no tenga VITE_CATALOGO_WORKER_URL) porque ese
 * archivo SI se commitea a este repo (ver README.md) y de hecho ya trae un valor real
 * en main — un test que dependiera del `.env` ambiente para simular "no configurado"
 * quedaria roto en cualquier checkout con `.env` completo, que es el caso normal.
 */
async function importarConUrl(url: string | undefined) {
  vi.resetModules();
  vi.doMock('./catalogoSharePoint', async () => {
    const real = await vi.importActual<typeof import('./catalogoSharePoint')>('./catalogoSharePoint');
    return { ...real, catalogoWorkerUrl: url };
  });
  return import('./excelCatalogo');
}

describe('obtenerCatalogoDesdeSharePoint — sin URL configurada', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('./catalogoSharePoint');
    vi.resetModules();
  });

  it('lanza un error claro si VITE_CATALOGO_WORKER_URL no esta configurado', async () => {
    const { obtenerCatalogoDesdeSharePoint: obtener } = await importarConUrl(undefined);
    await expect(obtener(false)).rejects.toThrow(/VITE_CATALOGO_WORKER_URL/);
  });

  it('nunca llega a llamar fetch si la URL no esta configurada', async () => {
    const { obtenerCatalogoDesdeSharePoint: obtener } = await importarConUrl(undefined);
    const fetchEspiado = vi.fn();
    vi.stubGlobal('fetch', fetchEspiado);
    await expect(obtener(false)).rejects.toThrow();
    expect(fetchEspiado).not.toHaveBeenCalled();
  });
});

/**
 * SharePoint es la UNICA via de actualizacion del catalogo (no hay carga manual de
 * Excel como respaldo): estos casos verifican que cada punto de falla de
 * obtenerCatalogoDesdeSharePoint da un mensaje accionable en vez de propagar el error
 * crudo de fetch/xlsx, y que la app nunca se queda sin saber que reintentar.
 */
describe('obtenerCatalogoDesdeSharePoint — mensajes de falla (URL configurada)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('./catalogoSharePoint');
    vi.resetModules();
  });

  const URL_PROXY = 'https://proxy.example.com/catalogo.xlsx';

  it('da un mensaje claro (no el error crudo) si fetch falla por conectividad', async () => {
    const { obtenerCatalogoDesdeSharePoint: obtener } = await importarConUrl(URL_PROXY);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(obtener(false)).rejects.toThrow(/no se pudo contactar.*conexión a internet/i);
  });

  it('da un mensaje claro y menciona reintentar si el Worker responde con un status de error', async () => {
    const { obtenerCatalogoDesdeSharePoint: obtener } = await importarConUrl(URL_PROXY);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('SharePoint respondio 403', { status: 502 })));
    await expect(obtener(false)).rejects.toThrow(/502/);
    await expect(obtener(false)).rejects.toThrow(/reintenta/i);
  });

  it('da un mensaje claro si la respuesta no se puede leer como Excel (ej. una pagina HTML de error/login)', async () => {
    const { obtenerCatalogoDesdeSharePoint: obtener } = await importarConUrl(URL_PROXY);
    const html = '<!DOCTYPE html><html><body>Inicia sesion para continuar</body></html>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(html, { status: 200 })));
    await expect(obtener(false)).rejects.toThrow(/no se pudo leer como excel/i);
  });
});
