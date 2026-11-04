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

/**
 * Catalogo v1 (validado por las jefaturas de area, octubre 2026). Estos casos fijan el
 * contrato con la planilla REAL de SharePoint: encabezados con tilde, con parentesis y
 * renombrados entre ciclos. Antes el parser leia la fila por coincidencia exacta de
 * clave y el dia que la columna paso a llamarse «Nombre visible (artefactos)» el
 * catalogo entero dejo de leerse sin que nada lo avisara.
 */
describe('procesarLibroCatalogo — catalogo v1 de SharePoint', () => {
  const FILA_V1 = {
    Estado: 'Validado',
    Tipo: 'Recursos multimediales',
    'Nombre visible (artefactos)': 'Video de bienvenida/cierre',
    Extensión: '1 min',
    Unidad: 'minutos',
    'DI (HH)': 0.5,
    'DG (HH)': 1.5,
    'SOP (HH)': 0.35,
    'ID técnico':
      'Recursos multimediales|Video de bienvenida/cierre|1 min|Entrega en carpeta y carga en LMS',
    Fuente: 'Catalogo v1',
    Alcance: 'Guion, produccion y carga',
  };

  it('lee la fila aunque el encabezado del nombre sea «Nombre visible (artefactos)»', () => {
    const r = procesarLibroCatalogo(libroDePrueba([FILA_V1]));
    expect(r.filasValidas).toBe(1);
    expect(r.catalogo[0].nombreVisible).toBe('Video de bienvenida/cierre');
  });

  it('lee encabezados con tilde: «Extensión», «ID técnico»', () => {
    const r = procesarLibroCatalogo(libroDePrueba([FILA_V1])).catalogo[0];
    expect(r.extension).toBe('1 min');
    expect(r.id).toContain('Entrega en carpeta y carga en LMS');
  });

  it('acepta «Alcance» como el campo de observaciones', () => {
    const r = procesarLibroCatalogo(libroDePrueba([FILA_V1])).catalogo[0];
    expect(r.observaciones).toBe('Guion, produccion y carga');
  });

  it('expone el alcance de entrega, que es lo unico que distingue dos filas iguales', () => {
    const enCarpeta = {
      ...FILA_V1,
      'ID técnico': 'Recursos multimediales|Video de bienvenida/cierre|1 min|Entrega en carpeta',
    };
    const r = procesarLibroCatalogo(libroDePrueba([FILA_V1, enCarpeta]));
    expect(r.filasValidas).toBe(2);
    expect(r.duplicadosFusionados).toBe(0);
    expect(r.catalogo.map((x) => x.alcanceEntrega).sort()).toEqual([
      'Entrega en carpeta',
      'Entrega en carpeta y carga en LMS',
    ]);
  });

  it('convierte una hora guardada como texto con coma y espacio sin separacion', () => {
    const sucia = { ...FILA_V1, 'SOP (HH)': ' 0,30' };
    expect(procesarLibroCatalogo(libroDePrueba([sucia])).catalogo[0].sop).toBeCloseTo(0.3);
  });

  it('nombra los IDs duplicados y cuenta las filas descartadas', () => {
    const sinNombre = { ...FILA_V1 } as Record<string, unknown>;
    delete sinNombre['Nombre visible (artefactos)'];
    const r = procesarLibroCatalogo(libroDePrueba([FILA_V1, { ...FILA_V1, 'DI (HH)': 9 }, sinNombre]));
    expect(r.duplicadosFusionados).toBe(1);
    expect(r.idsDuplicados).toHaveLength(1);
    expect(r.filasDescartadas).toBe(1);
    expect(r.catalogo[0].di).toBe(9);
  });

  it('avisa de forma explicita cuando NINGUNA fila se pudo leer', () => {
    const sinNombre = { ...FILA_V1 } as Record<string, unknown>;
    delete sinNombre['Nombre visible (artefactos)'];
    const r = procesarLibroCatalogo(libroDePrueba([sinNombre, sinNombre]));
    expect(r.filasValidas).toBe(0);
    // El aviso global va al final: `avisos` esta ordenado por fila y la prioridad la
    // lleva la severidad, no la posicion.
    expect(r.avisos.every((a) => a.severidad === 'bloqueante')).toBe(true);
    expect(r.avisos.some((a) => /ninguna pudo leerse/i.test(a.mensaje))).toBe(true);
  });

  it('clasifica los avisos por severidad y mantiene erroresFila', () => {
    const r = procesarLibroCatalogo(libroDePrueba([{ ...FILA_V1, Estado: 'Quien sabe' }]));
    expect(r.avisos.some((a) => a.severidad === 'dato')).toBe(true);
    expect(r.erroresFila).toEqual(r.avisos.map((a) => a.mensaje));
  });
});

describe('obtenerCatalogoDesdeSharePoint — catalogo vacio', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('./catalogoSharePoint');
    vi.resetModules();
  });

  it('falla en vez de devolver un catalogo en blanco cuando el archivo se lee pero no deja filas', async () => {
    const { obtenerCatalogoDesdeSharePoint: obtener } = await importarConUrl('https://proxy.example.com/c.xlsx');
    // Un libro con filas que el parser descarta: sin Tipo ni Nombre visible.
    const libro = libroDePrueba([{ Estado: 'Validado', Unidad: 'minutos' }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(libro, { status: 200 })));
    await expect(obtener(false)).rejects.toThrow(/ninguna de sus 1 filas pudo leerse/i);
  });
});
