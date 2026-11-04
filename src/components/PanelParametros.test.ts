import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// PanelParametros consume dos contextos cuyos Provider no se exportan (y CatalogProvider
// ademas sale a la red al montarse). Se sustituyen sus hooks en vez de exportar los
// contextos solo para el test: este archivo prueba el markup del panel, no el catalogo.
vi.mock('../CatalogContext', () => ({ useCatalog: () => ({ catalogo: [] }) }));
vi.mock('../ConfirmModal', () => ({ useConfirm: () => async () => true }));
import { PARAMETROS_DEFAULT } from '../data/plantilla';
import type { ParametrosCurso } from '../types';
import { PanelParametros } from './PanelParametros';

/**
 * El control «N° unidades» que Matías pidió "en la parte superior" vive en este panel,
 * junto a N° cursos y N° semanas. Se renderiza con `renderToStaticMarkup` (sin DOM), que
 * corre en el mismo environment 'node' que el resto de la suite.
 */
const noop = () => {};

const renderizar = (parametros: ParametrosCurso = PARAMETROS_DEFAULT): string =>
  renderToStaticMarkup(
    createElement(PanelParametros, {
      parametros,
      onChange: noop,
      onReset: noop,
      onExport: noop,
      exportando: false,
      gestionActual: [],
      produccionActual: [],
      onImportado: noop,
      mostrarAcciones: true,
    }),
  );

/** El `<label>` completo de un campo, para mirar su input sin confundirlo con otros. */
const campo = (html: string, etiqueta: string): string => {
  const i = html.indexOf(etiqueta);
  expect(i, `no se encontró el campo "${etiqueta}"`).toBeGreaterThan(-1);
  return html.slice(i, html.indexOf('</label>', i));
};

describe('PanelParametros — control «N° unidades»', () => {
  it('aparece en el panel superior, junto a N° cursos y N° semanas', () => {
    const html = renderizar();
    expect(html).toContain('N° unidades');
    // Va después de N° semanas y antes de Modalidad: en el mismo bloque de parámetros.
    expect(html.indexOf('N° semanas')).toBeLessThan(html.indexOf('N° unidades'));
    expect(html.indexOf('N° unidades')).toBeLessThan(html.indexOf('Modalidad'));
  });

  it('es un campo numérico con mínimo 1 y arranca en 1', () => {
    const unidades = campo(renderizar(), 'N° unidades');
    expect(unidades).toContain('type="number"');
    expect(unidades).toContain('min="1"');
    expect(unidades).toContain('value="1"');
  });

  it('muestra el valor declarado', () => {
    expect(campo(renderizar({ ...PARAMETROS_DEFAULT, nUnidades: 8 }), 'N° unidades')).toContain('value="8"');
  });

  it('la ayuda explica que es el Factor de «Por unidad» y de dónde sale en el catálogo', () => {
    const html = renderizar();
    expect(html).toContain('«Por unidad»');
    expect(html).toContain('<code>unidad</code>');
    expect(html).toContain('Con «N° unidades» en 1 los totales son los mismos de siempre.');
  });

  it('no toca N° cursos ni N° semanas', () => {
    const html = renderizar();
    expect(campo(html, 'N° cursos')).toContain('value="1"');
    expect(campo(html, 'N° semanas')).toContain('value="4"');
  });
});
