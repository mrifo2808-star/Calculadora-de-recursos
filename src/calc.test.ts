import { describe, expect, it } from 'vitest';
import {
  calcularGestion,
  calcularProduccion,
  calcularResumen,
  factorDuracionGestion,
  PARTE_POR_CALENDARIO_GESTION,
  PARTE_POR_TAMANO_GESTION,
  SEMANAS_REFERENCIA_GESTION,
  totalRecursosCurso,
  type ProduccionCalculada,
} from './calc';
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

/** Un cargo BASE tal como lo deja `reconciliarGestionBase`: tipo 'porcentaje' y
 * `removable === false`, que es lo que activa el ajuste por duracion. */
const filaGestionBase = (cargo: string, porcentaje: number, over: Partial<GestionRow> = {}): GestionRow =>
  filaGestionPorcentaje(cargo, porcentaje, { removable: false, ...over });

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

  /**
   * Los porcentajes salen del modelo de estimacion institucional
   * (MODELO_ESTIMACION_v02.00.xlsx): HH del rol / 3.121,61 HH de trabajo productivo de
   * su proyecto de referencia. Este test deja escrita esa derivacion, para que un
   * cambio de porcentaje tenga que justificarse contra el modelo y no "a ojo" — que es
   * exactamente como se habian fijado los valores anteriores (75 % en total).
   */
  it('los porcentajes de CARGOS_BASE_GESTION derivan del modelo institucional (HH del rol / 3.121,61)', () => {
    const HH_TRABAJO_MODELO = 3121.61;
    const HH_POR_ROL: Record<string, number> = {
      'Gestion JP': 108.75,
      'Gestion DI Senior': 161.25,
      'Gestion DG Senior': 56.25,
      'Gestion Sop Senior': 56.25,
      'Gestion DI TL': 39.375,
      'Gestion DG TL': 30,
      'Gestion Sop TL': 30,
    };
    const porCargo = Object.fromEntries(CARGOS_BASE_GESTION.map((c) => [c.cargo, c.porcentaje]));

    expect(porCargo['Gestion JP']).toBe(3.48);
    expect(porCargo['Gestion DI Senior']).toBe(5.17);
    expect(porCargo['Gestion DG Senior']).toBe(1.8);
    expect(porCargo['Gestion Sop Senior']).toBe(1.8);
    expect(porCargo['Gestion DI TL']).toBe(1.26);
    expect(porCargo['Gestion DG TL']).toBe(0.96);
    expect(porCargo['Gestion Sop TL']).toBe(0.96);

    // Cada porcentaje es exactamente HH_del_rol / 3.121,61, redondeado a 2 decimales.
    for (const [cargo, hh] of Object.entries(HH_POR_ROL)) {
      expect(porCargo[cargo]).toBe(Math.round((hh / HH_TRABAJO_MODELO) * 100 * 100) / 100);
    }
  });

  /**
   * Salvaguarda contra una regresion al modelo anterior: los 7 cargos sumaban 75 % de
   * las HH de produccion (JP 30 + Senior 20/5/5 + TL 5/5/5), casi 5x el modelo
   * institucional. Si alguien los devuelve a esos valores, este test falla.
   */
  it('los 7 cargos base suman ~15,43 % de la produccion, no el 75 % del modelo anterior', () => {
    const suma = CARGOS_BASE_GESTION.reduce((a, c) => a + c.porcentaje, 0);
    expect(suma).toBeCloseTo(15.43, 2);
    expect(suma).toBeLessThan(20); // nunca mas cerca del 75 % viejo que del modelo
  });

  it('los 7 cargos por defecto reparten las HH de gestion proporcionalmente a sus porcentajes', () => {
    const base = 1000;
    // 16 semanas = proyecto de referencia del modelo: el factor de duracion vale 1 y
    // cada cargo sale exactamente en su porcentaje.
    const calculadas = calcularGestion(gestionDefault(), 16, base);
    const porCargo = Object.fromEntries(calculadas.map((c) => [c.cargo, c.total]));
    expect(porCargo['Gestion JP']).toBeCloseTo(34.8); // 3,48 % de 1000
    expect(porCargo['Gestion DI Senior']).toBeCloseTo(51.7); // 5,17 %
    expect(porCargo['Gestion DG Senior']).toBeCloseTo(18); // 1,80 %
    expect(porCargo['Gestion Sop Senior']).toBeCloseTo(18); // 1,80 %
    expect(porCargo['Gestion DI TL']).toBeCloseTo(12.6); // 1,26 %
    expect(porCargo['Gestion DG TL']).toBeCloseTo(9.6); // 0,96 %
    expect(porCargo['Gestion Sop TL']).toBeCloseTo(9.6); // 0,96 %
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

/* ============================================================================
 * Factor de duracion de los cargos base (10-09-2026). Antes, un cargo base era un %
 * plano de la produccion y la formula era ciega al calendario: 8 o 32 semanas daban
 * las mismas horas de jefatura.
 * ========================================================================== */
describe('factorDuracionGestion — ajuste por duracion del proyecto', () => {
  it('vale exactamente 1 a 16 semanas (el proyecto de referencia queda intacto)', () => {
    expect(factorDuracionGestion(16)).toBe(1);
  });

  it('reproduce la formula 0,56 + 0,44 x (semanas / 16)', () => {
    expect(factorDuracionGestion(32)).toBeCloseTo(1.44, 10); // el doble de duracion: +44 %
    expect(factorDuracionGestion(8)).toBeCloseTo(0.78, 10); // la mitad
    expect(factorDuracionGestion(4)).toBeCloseTo(0.67, 10);
  });

  it('nunca baja del piso de 0,56 (la parte que depende del tamaño, no del calendario)', () => {
    expect(factorDuracionGestion(0)).toBeCloseTo(0.56, 10);
    expect(factorDuracionGestion(-5)).toBeCloseTo(0.56, 10); // negativo se trata como 0
    expect(factorDuracionGestion(Number.NaN)).toBeCloseTo(0.56, 10);
  });

  it('las dos partes del modelo suman 1, que es lo que hace que 16 semanas de exactamente 1', () => {
    expect(PARTE_POR_TAMANO_GESTION + PARTE_POR_CALENDARIO_GESTION).toBeCloseTo(1, 10);
    expect(SEMANAS_REFERENCIA_GESTION).toBe(16);
  });
});

describe('calcularGestion — el factor de duracion aplica SOLO a los cargos base', () => {
  it('un cargo base escala con las semanas', () => {
    const fila = [filaGestionBase('Gestion JP', 3.48)];
    const base = 1000;
    expect(calcularGestion(fila, 16, base)[0].total).toBeCloseTo(34.8); // factor 1
    expect(calcularGestion(fila, 32, base)[0].total).toBeCloseTo(34.8 * 1.44);
    expect(calcularGestion(fila, 8, base)[0].total).toBeCloseTo(34.8 * 0.78);
  });

  it('un cargo % agregado a mano NO escala: sigue siendo un % plano de la produccion', () => {
    // Su porcentaje lo escribio quien cubica para ESTE proyecto, con su duracion ya en
    // mente — aplicarle el ajuste seria contarla dos veces.
    const fila = [filaGestionPorcentaje('Refuerzo puntual', 10)]; // removable: true
    expect(calcularGestion(fila, 8, 1000)[0].total).toBeCloseTo(100);
    expect(calcularGestion(fila, 16, 1000)[0].total).toBeCloseTo(100);
    expect(calcularGestion(fila, 32, 1000)[0].total).toBeCloseTo(100);
  });

  it('un cargo fijo sigue usando su factor de frecuencia, no el de duracion', () => {
    const fila = [filaGestionFija('Cargo fijo TL', 1, 1, { frecuencia: 'Por semana', removable: false })];
    // Aunque sea removable:false, es tipo 'fijo': su factor son las semanas crudas (4),
    // no el 0,67 del ajuste de duracion.
    const calculada = calcularGestion(fila, 4, 0)[0];
    expect(calculada.factor).toBe(4);
    expect(calculada.total).toBe(4);
  });

  it('expone el factor de duracion en `factor`, para la columna Factor del Excel exportado', () => {
    const [calculada] = calcularGestion([filaGestionBase('Gestion JP', 3.48)], 32, 1000);
    expect(calculada.factor).toBeCloseTo(1.44, 10);
  });
});

/**
 * Casos de prueba pedidos por Matias al encargar el cambio (10-09-2026), anclados en el
 * proyecto de referencia del modelo institucional.
 *
 * OJO CON LA BASE: el encargo enunciaba estos casos como "3.500 HH de produccion ->
 * ~481,9 HH de gestion", pero las 481,875 HH del modelo se cubican contra sus 3.121,61
 * HH de TRABAJO PRODUCTIVO, no contra las 3.500 HH nominales del proyecto (que incluyen
 * la gestion misma). Los porcentajes se derivaron dividiendo por 3.121,61, asi que la
 * referencia correcta es 3.121,61 HH de produccion -> ~481,7 HH de gestion. Con 3.500
 * HH de produccion el resultado son ~540 HH, que es lo correcto para una cubicacion mas
 * grande. Lo que si se cumple exacto es todo lo demas: factor 1 a 16 semanas,
 * proporcionalidad con la produccion, y los factores 1,44 y 0,78.
 */
describe('Gestion base — casos de prueba del encargo (proyecto de referencia del modelo)', () => {
  const HH_PRODUCCION_MODELO = 3121.61;
  const HH_GESTION_MODELO = 481.875;

  const gestionTotal = (baseHH: number, nSemanas: number): number =>
    calcularGestion(gestionDefault(), nSemanas, baseHH).reduce((a, r) => a + r.total, 0);

  it('3.121,61 HH de produccion / 16 semanas reproduce las 481,875 HH de gestion del modelo', () => {
    // 0,2 HH de tolerancia: los 7 porcentajes van redondeados a 2 decimales (suman
    // 15,43 % en vez del 15,4367 % exacto del modelo).
    expect(gestionTotal(HH_PRODUCCION_MODELO, 16)).toBeCloseTo(HH_GESTION_MODELO, 0);
    expect(Math.abs(gestionTotal(HH_PRODUCCION_MODELO, 16) - HH_GESTION_MODELO)).toBeLessThan(0.25);
  });

  it('el doble de produccion, mismas semanas, da el doble de gestion (es proporcional)', () => {
    expect(gestionTotal(2 * HH_PRODUCCION_MODELO, 16)).toBeCloseTo(2 * gestionTotal(HH_PRODUCCION_MODELO, 16), 6);
  });

  it('32 semanas (factor 1,44) suma 44 % de gestion sobre la referencia', () => {
    expect(gestionTotal(HH_PRODUCCION_MODELO, 32)).toBeCloseTo(gestionTotal(HH_PRODUCCION_MODELO, 16) * 1.44, 6);
  });

  it('8 semanas (factor 0,78) baja la gestion a 78 % de la referencia', () => {
    expect(gestionTotal(HH_PRODUCCION_MODELO, 8)).toBeCloseTo(gestionTotal(HH_PRODUCCION_MODELO, 16) * 0.78, 6);
  });

  it('a 16 semanas la gestion es el 15,43 % de la produccion, sea cual sea la cubicacion', () => {
    for (const baseHH of [500, 3121.61, 3500, 7000]) {
      expect(gestionTotal(baseHH, 16) / baseHH).toBeCloseTo(0.1543, 6);
    }
  });

  /** El cambio de fondo: la gestion baja de 75 % a 15,43 % de la produccion. */
  it('la gestion del modelo anterior (75 %) era casi 5x la actual', () => {
    const actual = gestionTotal(HH_PRODUCCION_MODELO, 16);
    const anterior = HH_PRODUCCION_MODELO * 0.75;
    expect(anterior / actual).toBeCloseTo(4.86, 1);
  });
});

describe('reconciliarGestionBase — el bloqueo de los 7 cargos base', () => {
  it('fuerza el tipo/porcentaje del codigo aunque la fila traiga otro valor', () => {
    const manipulada: GestionRow = { ...gestionDefault()[0], tipo: 'fijo', porcentaje: 999, cantidad: 50, hhUnitaria: 50 };
    const [reconciliada] = reconciliarGestionBase([manipulada]);
    expect(reconciliada.tipo).toBe('porcentaje');
    expect(reconciliada.porcentaje).toBe(3.48); // Gestion JP siempre 3,48 %, sin importar lo manipulado
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

  it('descarta un cargo base huerfano de un nombre anterior (no removable, sin coincidir con ningun nombre actual)', () => {
    // Caso real reportado por Matias: localStorage de antes de un rename de cargo base
    // (ej. "Gestion QA TL" -> "Gestion Sop TL", o "Gestion JP" renombrado a mano a
    // "Gestión Jefe de proyecto" cuando el nombre todavia era editable) deja una fila
    // removable:false que ya no calza con ningun cargo de CARGOS_BASE_GESTION — sin
    // este descarte, quedaba duplicada para siempre y sin boton "✕" para sacarla.
    const huerfanoRenombrado: GestionRow = { ...gestionDefault()[0], cargo: 'Gestión Jefe de proyecto' };
    const huerfanoViejo = filaGestionFija('Gestion QA TL', 1, 0.1, { removable: false });
    const resultado = reconciliarGestionBase([huerfanoRenombrado, huerfanoViejo]);
    expect(resultado).toHaveLength(7); // solo los 7 base — ningun huerfano sobrevive
    expect(resultado.some((g) => g.cargo === 'Gestión Jefe de proyecto')).toBe(false);
    expect(resultado.some((g) => g.cargo === 'Gestion QA TL')).toBe(false);
  });

  it('SI conserva un cargo agregado a mano (removable:true) aunque su nombre se parezca a uno base', () => {
    const parecidoPeroRemovible = filaGestionFija('Gestion QA TL', 1, 0.1); // removable:true por defecto del helper
    const resultado = reconciliarGestionBase([parecidoPeroRemovible]);
    expect(resultado).toHaveLength(8); // 7 base + este, porque SI es removable
    expect(resultado.some((g) => g.cargo === 'Gestion QA TL' && g.removable === true)).toBe(true);
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
