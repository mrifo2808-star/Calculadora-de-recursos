import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AVISO_GESTION_DOCENTE_PROYECTO_LARGO, AYUDA_GESTION_DOCENTE, calcularGestionDocente } from '../calc';
import type { ProduccionRow, RecursoCatalogo } from '../types';
import { AVISO_RECURSO_POR_UNIDAD } from './TablaCubicacion';
import { etapasActivasDefault, gestionDefault, PARAMETROS_DEFAULT } from '../data/plantilla';
import { TablaCubicacion } from './TablaCubicacion';

/**
 * Render del toggle «Incluir gestión docente (DI)» de la pestaña Cubicación. Usa
 * `renderToStaticMarkup` (HTML en string, sin DOM), así que corre en el mismo
 * environment 'node' que el resto de la suite — no hace falta jsdom. Verifica lo que ve
 * quien cubica: el botón, la explicación al lado y en el tooltip, el desglose y el aviso.
 */
const noop = () => {};

const renderizar = (activa: boolean, nCursos: number, nSemanas: number, nUnidades = 1): string =>
  renderToStaticMarkup(
    createElement(TablaCubicacion, {
      rows: [],
      nSemanas,
      nUnidades,
      catalogo: [],
      etapasActivas: etapasActivasDefault(),
      onToggleEtapa: noop,
      onChange: noop,
      onAdd: noop,
      gestionRows: gestionDefault(),
      baseGestionHH: 0,
      onChangeGestion: noop,
      onAddGestion: noop,
      gestionDocente: calcularGestionDocente(activa, nCursos, nSemanas),
      onToggleGestionDocente: noop,
    }),
  );

/** El checkbox del toggle, aislado del resto del HTML (hay otros checkboxes: los de etapa). */
const inputDelToggle = (html: string): string => {
  const inicio = html.indexOf('<input', html.indexOf('gestion-docente__toggle'));
  return html.slice(inicio, html.indexOf('>', inicio) + 1);
};

describe('TablaCubicacion — toggle «Incluir gestión docente (DI)»', () => {
  it('con los parametros por defecto el toggle aparece APAGADO y sin desglose', () => {
    const html = renderizar(PARAMETROS_DEFAULT.gestionDocente, PARAMETROS_DEFAULT.nCursos, PARAMETROS_DEFAULT.nSemanas);
    expect(html).toContain('Incluir gestión docente (DI)');
    expect(inputDelToggle(html)).not.toContain('checked');
    expect(html).not.toContain('× 0,5 HH =');
  });

  it('la explicacion esta al lado del boton Y como tooltip (title) al pasar el mouse', () => {
    const html = renderizar(false, 1, 4);
    expect(html).toContain(`title="${AYUDA_GESTION_DOCENTE}"`);
    expect(html).toContain(`>${AYUDA_GESTION_DOCENTE}</p>`);
  });

  it('activo, muestra el toggle encendido y el desglose junto al resultado', () => {
    const html = renderizar(true, 12, 16);
    expect(inputDelToggle(html)).toContain('checked');
    expect(html).toContain('12 cursos × 16 semanas × 0,5 HH = 96 HH');
    expect(html).toContain('8 HH por curso');
  });

  it('a 16 semanas no muestra el aviso de proyecto largo', () => {
    expect(renderizar(true, 12, 16)).not.toContain('supera las 16 semanas');
  });

  it('sobre 16 semanas muestra el aviso junto al desglose, sin bloquear el toggle', () => {
    const html = renderizar(true, 12, 17);
    expect(html).toContain(AVISO_GESTION_DOCENTE_PROYECTO_LARGO);
    expect(html).toContain('12 cursos × 17 semanas × 0,5 HH = 102 HH');
    expect(inputDelToggle(html)).not.toContain('disabled');
  });

  it('apagado en un proyecto largo no muestra ni desglose ni aviso', () => {
    const html = renderizar(false, 69, 69);
    expect(html).not.toContain('supera las 16 semanas');
    expect(html).not.toContain('× 0,5 HH =');
  });
});

/* ============================================================================
 * Recursos «por unidad» (04-11-2026): el desplegable ya ofrecia «Por unidad» pero no
 * multiplicaba por nada. Ahora multiplica por el N° de unidades de Parametros, y la
 * tabla avisa si el catalogo marca el recurso como por unidad y la fila quedo en otra
 * Frecuencia.
 * ========================================================================== */
const RECURSO_POR_UNIDAD: RecursoCatalogo = {
  id: 'Video|Video 2D|1 ud',
  estado: 'Validado',
  tipo: 'Video',
  nombreVisible: 'Video 2D',
  extension: '1 min',
  unidad: 'unidad', // <- el marcador del catalogo
  di: 1,
  dg: 1.5,
  sop: 0.5,
  fuente: 'catalogo v1',
  observaciones: '',
};

const RECURSO_NORMAL: RecursoCatalogo = { ...RECURSO_POR_UNIDAD, id: 'Video|Video After|3 min', unidad: 'minutos' };

const fila = (recursoId: string, frecuencia: ProduccionRow['frecuencia']): ProduccionRow => ({
  rowId: 'p-1',
  seccion: 'MODULO INICIAL (1 vez por curso)',
  tarea: 'Tarea',
  recursoId,
  cantidad: 1,
  frecuencia,
  removable: false,
});

const renderizarFilas = (rows: ProduccionRow[], nUnidades: number): string =>
  renderToStaticMarkup(
    createElement(TablaCubicacion, {
      rows,
      nSemanas: 4,
      nUnidades,
      catalogo: [RECURSO_POR_UNIDAD, RECURSO_NORMAL],
      etapasActivas: etapasActivasDefault(),
      onToggleEtapa: noop,
      onChange: noop,
      onAdd: noop,
      gestionRows: gestionDefault(),
      baseGestionHH: 0,
      onChangeGestion: noop,
      onAddGestion: noop,
      gestionDocente: calcularGestionDocente(false, 1, 4),
      onToggleGestionDocente: noop,
    }),
  );

describe('TablaCubicacion — recursos «por unidad»', () => {
  it('la ayuda dice cuantas unidades se estan aplicando', () => {
    expect(renderizarFilas([], 3)).toContain('<strong>3 unidades</strong>');
    expect(renderizarFilas([], 1)).toContain('<strong>1 unidad</strong>');
  });

  it('avisa si el recurso es por unidad y la fila quedo en otra Frecuencia', () => {
    const html = renderizarFilas([fila(RECURSO_POR_UNIDAD.id, 'Por curso')], 3);
    expect(html).toContain('⚠ por unidad');
    expect(html).toContain(AVISO_RECURSO_POR_UNIDAD);
  });

  it('no avisa cuando la fila YA esta en «Por unidad» (el aviso es para corregir, no ruido)', () => {
    expect(renderizarFilas([fila(RECURSO_POR_UNIDAD.id, 'Por unidad')], 3)).not.toContain('⚠ por unidad');
  });

  it('no avisa en un recurso que no es por unidad', () => {
    expect(renderizarFilas([fila(RECURSO_NORMAL.id, 'Por curso')], 3)).not.toContain('⚠ por unidad');
  });

  it('«Por unidad» con 3 unidades muestra el triple de HH que con 1', () => {
    // 1 x 3 HH/ud = 3 HH con 1 unidad; 9 HH con 3 unidades.
    expect(renderizarFilas([fila(RECURSO_POR_UNIDAD.id, 'Por unidad')], 1)).toContain('>3</td>');
    expect(renderizarFilas([fila(RECURSO_POR_UNIDAD.id, 'Por unidad')], 3)).toContain('>9</td>');
  });
});
