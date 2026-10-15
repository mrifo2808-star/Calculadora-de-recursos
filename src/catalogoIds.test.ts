import { describe, expect, it } from 'vitest';
import { alcanceDesdeId } from './catalogoIds';

describe('alcanceDesdeId', () => {
  it('devuelve el cuarto segmento del ID compuesto', () => {
    expect(alcanceDesdeId('Actividad|Evaluacion|4-5 criterios|Entrega en carpeta')).toBe('Entrega en carpeta');
  });

  it('conserva las barras del alcance si el texto las trae', () => {
    expect(alcanceDesdeId('A|B|C|Entrega en carpeta|y carga')).toBe('Entrega en carpeta|y carga');
  });

  it('devuelve cadena vacia si el ID no trae cuarto segmento', () => {
    expect(alcanceDesdeId('Video|Video After|1 min')).toBe('');
    expect(alcanceDesdeId('')).toBe('');
  });

  it('recorta espacios del alcance', () => {
    expect(alcanceDesdeId('A|B|C|  Entrega en carpeta  ')).toBe('Entrega en carpeta');
  });
});
