import { describe, expect, it } from 'vitest';
import { chequearTamanoRazonable, sincronizacionAutomaticaDebida, urlConForzado } from './catalogoSharePoint';

describe('urlConForzado', () => {
  it('devuelve la URL tal cual si no se fuerza', () => {
    expect(urlConForzado('https://proxy.example.com/catalogo.xlsx', false)).toBe('https://proxy.example.com/catalogo.xlsx');
  });

  it('agrega ?actualizar=1 si se fuerza', () => {
    const url = urlConForzado('https://proxy.example.com/catalogo.xlsx', true);
    expect(url).toContain('actualizar=1');
  });

  it('agrega &actualizar=1 sin romper una query existente', () => {
    const url = urlConForzado('https://proxy.example.com/catalogo.xlsx?otro=valor', true);
    expect(url).toContain('otro=valor');
    expect(url).toContain('actualizar=1');
  });
});

describe('sincronizacionAutomaticaDebida', () => {
  const ahora = new Date('2026-08-28T12:00:00Z');

  it('es debida si nunca hubo una sincronizacion previa', () => {
    expect(sincronizacionAutomaticaDebida(ahora, null)).toBe(true);
  });

  it('no es debida si la ultima sincronizacion fue hace menos de 12h', () => {
    const hace6h = new Date('2026-08-28T06:00:01Z');
    expect(sincronizacionAutomaticaDebida(ahora, hace6h)).toBe(false);
  });

  it('es debida si la ultima sincronizacion fue hace mas de 12h', () => {
    const hace13h = new Date('2026-08-27T23:00:00Z');
    expect(sincronizacionAutomaticaDebida(ahora, hace13h)).toBe(true);
  });
});

describe('chequearTamanoRazonable', () => {
  it('rechaza un archivo con 0 filas validas', () => {
    const resultado = chequearTamanoRazonable(40, 0);
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toContain('no tiene filas válidas');
  });

  it('rechaza un archivo con muchas menos filas que el catalogo actual (< 50%)', () => {
    const resultado = chequearTamanoRazonable(40, 10);
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toContain('incompleto');
  });

  it('acepta un archivo con una cantidad de filas razonable (>= 50%)', () => {
    expect(chequearTamanoRazonable(40, 20).ok).toBe(true);
    expect(chequearTamanoRazonable(40, 41).ok).toBe(true);
  });

  it('acepta cualquier cantidad de filas validas si el catalogo actual esta vacio (primera carga)', () => {
    expect(chequearTamanoRazonable(0, 5).ok).toBe(true);
  });
});
