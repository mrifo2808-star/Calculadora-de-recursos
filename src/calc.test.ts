import { describe, expect, it } from 'vitest';
import { calcularGestion, calcularProduccion, calcularResumen, totalRecursosCurso, type ProduccionCalculada } from './calc';
import { gestionDefault } from './data/plantilla';
import type { GestionRow, ProduccionRow, RecursoCatalogo } from './types';

const RECURSO: RecursoCatalogo = {
  id: 'Video|Video de contenido|3 min',
  estado: 'Validado',
  tipo: 'Video',
  nombreVisible: 'Video de contenido',
  extension: '3 min',
  unidad: 'minutos',
  di: 2.5,
  dg: 4,
  sop: 0.5, // total 7 HH por unidad
  fuente: 'test',
  observaciones: '',
};

const filaProduccion = (over: Partial<ProduccionRow> = {}): ProduccionRow => ({
  rowId: 'p-1',
  seccion: 'MODULO INICIAL (1 vez por curso)',
  tarea: 'Tarea',
  recursoId: RECURSO.id,
  cantidad: 1,
  frecuencia: 'Por curso',
  removable: false,
  ...over,
});

const filaGestionPorcentaje = (cargo: string, porcentaje: number): GestionRow => ({
  rowId: `g-${cargo}`,
  cargo,
  tipo: 'porcentaje',
  cantidad: 1,
  frecuencia: 'Fijo',
  hhUnitaria: 0,
  porcentaje,
  removable: false,
  activa: true,
});

const filaGestionFija = (cargo: string, cantidad: number, hhUnitaria: number): GestionRow => ({
  rowId: `g-${cargo}`,
  cargo,
  tipo: 'fijo',
  cantidad,
  frecuencia: 'Fijo',
  hhUnitaria,
  porcentaje: 0,
  removable: false,
  activa: true,
});

describe('totalRecursosCurso', () => {
  it('suma HH DI+DG+SOP de la produccion calculada', () => {
    const produccion: ProduccionCalculada[] = calcularProduccion([filaProduccion({ cantidad: 2 })], 1, [RECURSO]);
    // 2 unidades x 7 HH/unidad = 14
    expect(totalRecursosCurso(produccion)).toBe(14);
  });

  it('da 0 sobre una lista vacia (sin recursos, no debe romper el calculo de Gestion)', () => {
    expect(totalRecursosCurso([])).toBe(0);
  });
});

describe('calcularGestion — cargos tipo porcentaje', () => {
  it('calcula HH como porcentaje de la base, ignorando cantidad/frecuencia/hhUnitaria', () => {
    const base = 100;
    const filas = [filaGestionPorcentaje('Gestion JP', 30)];
    const [calculada] = calcularGestion(filas, 4, base);
    expect(calculada.total).toBe(30);
  });

  it('no depende de nSemanas (a diferencia de un cargo fijo Por semana)', () => {
    const base = 100;
    const filas = [filaGestionPorcentaje('Gestion JP', 30)];
    const conCuatroSemanas = calcularGestion(filas, 4, base)[0].total;
    const conDoceSemanas = calcularGestion(filas, 12, base)[0].total;
    expect(conCuatroSemanas).toBe(conDoceSemanas);
  });

  it('recalcula en vivo cuando cambia la base (total de produccion)', () => {
    const filas = [filaGestionPorcentaje('Gestion JP', 30)];
    expect(calcularGestion(filas, 4, 100)[0].total).toBe(30);
    expect(calcularGestion(filas, 4, 200)[0].total).toBe(60);
  });

  it('un cargo fijo sigue usando cantidad x factor x hhUnitaria, sin importar la base', () => {
    const filas = [filaGestionFija('Bases Plantillas DG', 1, 12)];
    const conBaseChica = calcularGestion(filas, 4, 10)[0].total;
    const conBaseGrande = calcularGestion(filas, 4, 10000)[0].total;
    expect(conBaseChica).toBe(12);
    expect(conBaseGrande).toBe(12);
  });

  it('los 7 cargos por defecto de Gestion suman las HH de produccion proporcionalmente a sus porcentajes', () => {
    const base = 200;
    const calculadas = calcularGestion(gestionDefault(), 4, base);
    const porCargo = Object.fromEntries(calculadas.map((c) => [c.cargo, c.total]));
    expect(porCargo['Gestion JP']).toBeCloseTo(60); // 30% de 200
    expect(porCargo['Gestion DI Senior']).toBeCloseTo(40); // 20%
    expect(porCargo['Gestion DG Senior']).toBeCloseTo(10); // 5%
    expect(porCargo['Gestion Sop Senior']).toBeCloseTo(10); // 5%
    expect(porCargo['Gestion DI TL']).toBeCloseTo(10); // 5%
    expect(porCargo['Gestion DG TL']).toBeCloseTo(10); // 5%
    expect(porCargo['Gestion Sop TL']).toBeCloseTo(10); // 5%
    expect(porCargo['Bases Plantillas DG']).toBe(12); // fijo, no depende de la base
  });
});

describe('el cargo GE ya no existe en la plantilla por defecto', () => {
  it('gestionDefault() no incluye ningun cargo GE', () => {
    const cargos = gestionDefault().map((g) => g.cargo);
    expect(cargos.some((c) => /\bGE\b/i.test(c))).toBe(false);
  });

  it('gestionDefault() trae exactamente los 8 cargos esperados', () => {
    const cargos = gestionDefault().map((g) => g.cargo);
    expect(cargos).toEqual([
      'Gestion JP',
      'Gestion DI Senior',
      'Gestion DG Senior',
      'Gestion Sop Senior',
      'Gestion DI TL',
      'Gestion DG TL',
      'Gestion Sop TL',
      'Bases Plantillas DG',
    ]);
  });
});

describe('calcularResumen — integracion con Gestion porcentual', () => {
  it('hhGestionCurso refleja los porcentajes aplicados sobre totalRecursosCurso', () => {
    const produccionRows = [filaProduccion({ cantidad: 2 })]; // 14 HH de base
    const produccion = calcularProduccion(produccionRows, 1, [RECURSO]);
    const base = totalRecursosCurso(produccion);
    const gestion = calcularGestion([filaGestionPorcentaje('Gestion JP', 30)], 1, base);
    const resumen = calcularResumen(produccion, gestion, 1, ['MODULO INICIAL (1 vez por curso)']);
    expect(resumen.totalRecursosCurso).toBe(14);
    expect(resumen.hhGestionCurso).toBeCloseTo(4.2); // 30% de 14
    expect(resumen.totalGeneralCurso).toBeCloseTo(18.2);
  });
});
