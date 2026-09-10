import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AVISO_GESTION_DOCENTE_PROYECTO_LARGO, AYUDA_GESTION_DOCENTE, calcularGestionDocente } from '../calc';
import { etapasActivasDefault, gestionDefault, PARAMETROS_DEFAULT } from '../data/plantilla';
import { TablaCubicacion } from './TablaCubicacion';

/**
 * Render del toggle «Incluir gestión docente (DI)» de la pestaña Cubicación. Usa
 * `renderToStaticMarkup` (HTML en string, sin DOM), así que corre en el mismo
 * environment 'node' que el resto de la suite — no hace falta jsdom. Verifica lo que ve
 * quien cubica: el botón, la explicación al lado y en el tooltip, el desglose y el aviso.
 */
const noop = () => {};

const renderizar = (activa: boolean, nCursos: number, nSemanas: number): string =>
  renderToStaticMarkup(
    createElement(TablaCubicacion, {
      rows: [],
      nSemanas,
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
