import { describe, expect, it } from 'vitest';
import { calcularGestion, calcularProduccion, calcularResumen, totalRecursosCurso, type ProduccionCalculada } from './calc';
import { CARGOS_BASE_GESTION, gestionDefault, nuevaFilaGestion, reconciliarGestionBase } from './data/plantilla';
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

const filaGestionPorcentaje = (cargo: string, porcentaje: number, over: Partial<GestionRow> = {}): GestionRow => ({
  rowId: `g-${cargo}`,
  cargo,
  tipo: 'porcentaje',
  cantidad: 1,
  frecuencia: 'Fijo',
  hhUnitaria: 0,
  porcentaje,
  removable: true,
  activa: true,
  ...over,
});

const filaGestionFija = (cargo: string, cantidad: number, hhUnitaria: number, over: Partial<GestionRow> = {}): GestionRow => ({
  rowId: `g-${cargo}`,
  cargo,
  tipo: 'fijo',
  cantidad,
  frecuencia: 'Fijo',
  hhUnitaria,
  porcentaje: 0,
  removable: true,
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

describe('calcularGestion — cargos tipo porcentaje', () => {
  it('calcula HH como porcentaje de la base, ignorando cantidad/frecuencia/hhUnitaria', () => {
    const base = 100;
    const [calculada] = calcularGestion([filaGestionPorcentaje('Gestion JP', 30)], 4, base);
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
});

describe('calcularGestion — cargos tipo fijo (agregados a mano)', () => {
  it('usa cantidad x factor x hhUnitaria, sin importar la base', () => {
    const filas = [filaGestionFija('Cargo fijo de prueba', 1, 12)];
    const conBaseChica = calcularGestion(filas, 4, 10)[0].total;
    const conBaseGrande = calcularGestion(filas, 4, 10000)[0].total;
    expect(conBaseChica).toBe(12);
    expect(conBaseGrande).toBe(12);
  });

  it('sí depende de nSemanas cuando la Frecuencia es "Por semana"', () => {
    const filas = [filaGestionFija('Cargo fijo TL', 1, 1, { frecuencia: 'Por semana' })];
    expect(calcularGestion(filas, 4, 0)[0].total).toBe(4);
    expect(calcularGestion(filas, 12, 0)[0].total).toBe(12);
  });
});

describe('gestionDefault() / CARGOS_BASE_GESTION — los 7 cargos base', () => {
  it('gestionDefault() no incluye ningun cargo GE', () => {
    const cargos = gestionDefault().map((g) => g.cargo);
    expect(cargos.some((c) => /\bGE\b/i.test(c))).toBe(false);
  });

  it('gestionDefault() trae exactamente los 7 cargos base, en orden, tipo porcentaje y no removibles', () => {
    const filas = gestionDefault();
    expect(filas.map((g) => g.cargo)).toEqual([
      'Gestion JP',
      'Gestion DI Senior',
      'Gestion DG Senior',
      'Gestion Sop Senior',
      'Gestion DI TL',
      'Gestion DG TL',
      'Gestion Sop TL',
    ]);
    expect(filas.every((g) => g.tipo === 'porcentaje')).toBe(true);
    expect(filas.every((g) => g.removable === false)).toBe(true);
    expect(filas.every((g) => g.activa === true)).toBe(true);
  });

  it('los porcentajes de CARGOS_BASE_GESTION coinciden con lo definido por Matias (JP 30, Senior 20/5/5, TL 5/5/5)', () => {
    const porCargo = Object.fromEntries(CARGOS_BASE_GESTION.map((c) => [c.cargo, c.porcentaje]));
    expect(porCargo['Gestion JP']).toBe(30);
    expect(porCargo['Gestion DI Senior']).toBe(20);
    expect(porCargo['Gestion DG Senior']).toBe(5);
    expect(porCargo['Gestion Sop Senior']).toBe(5);
    expect(porCargo['Gestion DI TL']).toBe(5);
    expect(porCargo['Gestion DG TL']).toBe(5);
    expect(porCargo['Gestion Sop TL']).toBe(5);
  });

  it('los 7 cargos por defecto suman las HH de produccion proporcionalmente a sus porcentajes', () => {
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
  });

  it('nuevaFilaGestion() ("+ Agregar cargo") nace en modo % Proyecto, en 0%, editable y eliminable', () => {
    const fila = nuevaFilaGestion();
    expect(fila.cargo).toBe('');
    expect(fila.tipo).toBe('porcentaje');
    expect(fila.porcentaje).toBe(0);
    expect(fila.removable).toBe(true);
    expect(fila.activa).toBe(true);
  });
});

describe('reconciliarGestionBase — el bloqueo de los 7 cargos base', () => {
  it('fuerza el tipo/porcentaje del codigo aunque la fila traiga otro valor', () => {
    const manipulada: GestionRow = { ...gestionDefault()[0], tipo: 'fijo', porcentaje: 999, cantidad: 50, hhUnitaria: 50 };
    const [reconciliada] = reconciliarGestionBase([manipulada]);
    expect(reconciliada.tipo).toBe('porcentaje');
    expect(reconciliada.porcentaje).toBe(30); // Gestion JP siempre 30, sin importar lo manipulado
  });

  it('conserva rowId y activa de la fila existente en vez de generar una nueva', () => {
    const existente: GestionRow = { ...gestionDefault()[0], rowId: 'rowid-fijo-de-antes', activa: false };
    const [reconciliada] = reconciliarGestionBase([existente]);
    expect(reconciliada.rowId).toBe('rowid-fijo-de-antes');
    expect(reconciliada.activa).toBe(false);
  });

  it('agrega los 7 cargos base aunque no vengan en la lista de entrada (localStorage viejo, archivo incompleto)', () => {
    const resultado = reconciliarGestionBase([]);
    expect(resultado).toHaveLength(7);
    expect(resultado.map((g) => g.cargo)).toEqual(CARGOS_BASE_GESTION.map((c) => c.cargo));
  });

  it('conserva un cargo agregado a mano (no es uno de los 7 base) despues de los base, sin tocarlo', () => {
    const custom = filaGestionFija('Cargo especial del proyecto', 2, 3);
    const resultado = reconciliarGestionBase([custom]);
    expect(resultado).toHaveLength(8);
    expect(resultado[7]).toEqual(custom);
  });

  it('no elimina ni cambia un cargo agregado a mano cuyo nombre no coincide con ninguno base', () => {
    const custom = filaGestionPorcentaje('Refuerzo puntual', 15);
    const resultado = reconciliarGestionBase([custom]);
    const encontrado = resultado.find((g) => g.cargo === 'Refuerzo puntual');
    expect(encontrado).toEqual(custom);
  });
});

describe('calcularResumen — integracion con Gestion (base porcentual + cargo fijo agregado)', () => {
  it('hhGestionCurso suma los cargos base y uno fijo agregado a mano', () => {
    const produccionRows = [filaProduccion({ cantidad: 2 })]; // 14 HH de base
    const produccion = calcularProduccion(produccionRows, 1, [RECURSO]);
    const base = totalRecursosCurso(produccion);
    const gestion = calcularGestion(
      [filaGestionPorcentaje('Gestion JP', 30), filaGestionFija('Cargo fijo', 1, 2)],
      1,
      base,
    );
    const resumen = calcularResumen(produccion, gestion, 1, ['MODULO INICIAL (1 vez por curso)']);
    expect(resumen.totalRecursosCurso).toBe(14);
    expect(resumen.hhGestionCurso).toBeCloseTo(6.2); // 30% de 14 (4.2) + 2 HH fijas
    expect(resumen.totalGeneralCurso).toBeCloseTo(20.2);
  });

  it('una fila desactivada no suma al total de Gestion', () => {
    const produccion = calcularProduccion([filaProduccion({ cantidad: 2 })], 1, [RECURSO]);
    const base = totalRecursosCurso(produccion);
    const gestion = calcularGestion([filaGestionPorcentaje('Gestion JP', 30, { activa: false })], 1, base).filter(
      (r) => r.activa !== false,
    );
    const resumen = calcularResumen(produccion, gestion, 1, ['MODULO INICIAL (1 vez por curso)']);
    expect(resumen.hhGestionCurso).toBe(0);
  });
});
