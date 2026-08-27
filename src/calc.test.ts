import { describe, expect, it } from 'vitest';
import { calcularGestion, calcularProduccion, calcularResumen, totalRecursosCurso, type ProduccionCalculada } from './calc';
import { gestionDefault, nuevaFilaGestion } from './data/plantilla';
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

const filaGestion = (cargo: string, porcentaje: number, over: Partial<GestionRow> = {}): GestionRow => ({
  rowId: `g-${cargo}`,
  cargo,
  porcentaje,
  removable: false,
  activa: true,
  ...over,
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

describe('calcularGestion — todo cargo es un porcentaje de la base', () => {
  it('calcula HH como porcentaje de la base', () => {
    const base = 100;
    const [calculada] = calcularGestion([filaGestion('Gestion JP', 30)], base);
    expect(calculada.total).toBe(30);
  });

  it('recalcula en vivo cuando cambia la base (total de produccion)', () => {
    const filas = [filaGestion('Gestion JP', 30)];
    expect(calcularGestion(filas, 100)[0].total).toBe(30);
    expect(calcularGestion(filas, 200)[0].total).toBe(60);
  });

  it('porcentaje 0 (cargo recien agregado, aun sin completar) da 0 HH sin importar la base', () => {
    const filas = [nuevaFilaGestion()];
    expect(calcularGestion(filas, 500)[0].total).toBe(0);
  });

  it('un porcentaje invalido (NaN/negativo) no rompe el calculo, se trata como 0', () => {
    const filas = [filaGestion('Cargo raro', Number.NaN), filaGestion('Cargo negativo', -10)];
    const calculadas = calcularGestion(filas, 100);
    expect(calculadas[0].total).toBe(0);
    expect(calculadas[1].total).toBe(0);
  });

  it('los 7 cargos por defecto de Gestion suman las HH de produccion proporcionalmente a sus porcentajes', () => {
    const base = 200;
    const calculadas = calcularGestion(gestionDefault(), base);
    const porCargo = Object.fromEntries(calculadas.map((c) => [c.cargo, c.total]));
    expect(porCargo['Gestion JP']).toBeCloseTo(60); // 30% de 200
    expect(porCargo['Gestion DI Senior']).toBeCloseTo(40); // 20%
    expect(porCargo['Gestion DG Senior']).toBeCloseTo(10); // 5%
    expect(porCargo['Gestion Sop Senior']).toBeCloseTo(10); // 5%
    expect(porCargo['Gestion DI TL']).toBeCloseTo(10); // 5%
    expect(porCargo['Gestion DG TL']).toBeCloseTo(10); // 5%
    expect(porCargo['Gestion Sop TL']).toBeCloseTo(10); // 5%
  });
});

describe('Gestion queda exclusivamente en modo porcentaje (ajuste 27-08-2026)', () => {
  it('gestionDefault() no incluye ningun cargo GE', () => {
    const cargos = gestionDefault().map((g) => g.cargo);
    expect(cargos.some((c) => /\bGE\b/i.test(c))).toBe(false);
  });

  it('gestionDefault() no incluye "Bases Plantillas DG" ni ningun otro cargo de horas fijas', () => {
    const cargos = gestionDefault().map((g) => g.cargo);
    expect(cargos).not.toContain('Bases Plantillas DG');
  });

  it('gestionDefault() trae exactamente los 7 cargos porcentuales esperados', () => {
    const cargos = gestionDefault().map((g) => g.cargo);
    expect(cargos).toEqual([
      'Gestion JP',
      'Gestion DI Senior',
      'Gestion DG Senior',
      'Gestion Sop Senior',
      'Gestion DI TL',
      'Gestion DG TL',
      'Gestion Sop TL',
    ]);
  });

  it('GestionRow ya no tiene campos de horas fijas (cantidad/frecuencia/hhUnitaria/tipo)', () => {
    const fila = gestionDefault()[0];
    expect(fila).not.toHaveProperty('cantidad');
    expect(fila).not.toHaveProperty('frecuencia');
    expect(fila).not.toHaveProperty('hhUnitaria');
    expect(fila).not.toHaveProperty('tipo');
  });

  it('nuevaFilaGestion() ("+ Agregar cargo") nace en 0%, editable, sin cargo aun', () => {
    const fila = nuevaFilaGestion();
    expect(fila.cargo).toBe('');
    expect(fila.porcentaje).toBe(0);
    expect(fila.removable).toBe(true);
    expect(fila.activa).toBe(true);
  });
});

describe('calcularResumen — integracion con Gestion porcentual', () => {
  it('hhGestionCurso refleja los porcentajes aplicados sobre totalRecursosCurso', () => {
    const produccionRows = [filaProduccion({ cantidad: 2 })]; // 14 HH de base
    const produccion = calcularProduccion(produccionRows, 1, [RECURSO]);
    const base = totalRecursosCurso(produccion);
    const gestion = calcularGestion([filaGestion('Gestion JP', 30)], base);
    const resumen = calcularResumen(produccion, gestion, 1, ['MODULO INICIAL (1 vez por curso)']);
    expect(resumen.totalRecursosCurso).toBe(14);
    expect(resumen.hhGestionCurso).toBeCloseTo(4.2); // 30% de 14
    expect(resumen.totalGeneralCurso).toBeCloseTo(18.2);
  });

  it('una fila desactivada no suma al total de Gestion', () => {
    const produccion = calcularProduccion([filaProduccion({ cantidad: 2 })], 1, [RECURSO]);
    const base = totalRecursosCurso(produccion);
    const gestion = calcularGestion([filaGestion('Gestion JP', 30, { activa: false })], base).filter((r) => r.activa !== false);
    const resumen = calcularResumen(produccion, gestion, 1, ['MODULO INICIAL (1 vez por curso)']);
    expect(resumen.hhGestionCurso).toBe(0);
  });
});
