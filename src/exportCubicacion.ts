import * as XLSX from 'xlsx';
import type { ParametrosCurso } from './types';
import type { GestionCalculada, ProduccionCalculada, Resumen } from './calc';

interface DatosExport {
  parametros: ParametrosCurso;
  gestion: GestionCalculada[];
  produccion: ProduccionCalculada[];
  resumen: Resumen;
}

function sanitizarNombreArchivo(texto: string): string {
  const limpio = texto.trim().replace(/[\\/:*?"<>|]/g, '-');
  return limpio || 'proyecto';
}

export function descargarCubicacionExcel(datos: DatosExport): void {
  const { parametros, gestion, produccion, resumen } = datos;

  const hojaParametros = XLSX.utils.json_to_sheet([
    {
      Proyecto: parametros.proyecto,
      Cliente: parametros.cliente,
      'N° cursos': parametros.nCursos,
      'N° semanas': parametros.nSemanas,
      Modalidad: parametros.modalidad,
    },
  ]);
  hojaParametros['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];

  const hojaGestion = XLSX.utils.json_to_sheet(
    gestion.map((r) => ({
      Cargo: r.cargo,
      Cantidad: r.cantidad,
      Frecuencia: r.frecuencia,
      Factor: r.factor,
      'HH unitarias': r.hhUnitaria,
      'Total HH': r.total,
    })),
  );
  hojaGestion['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];

  const hojaCubicacion = XLSX.utils.json_to_sheet(
    produccion.map((r) => ({
      Sección: r.seccion,
      Tarea: r.tarea,
      'Tipo / Recurso': r.etiquetaRecurso,
      Cantidad: r.cantidad,
      Frecuencia: r.frecuencia,
      Factor: r.factor,
      'HH DI': r.hhDI,
      'HH DG': r.hhDG,
      'HH SOP': r.hhSOP,
      'Total HH': r.total,
      Estado: r.estado,
    })),
  );
  hojaCubicacion['!cols'] = [
    { wch: 30 },
    { wch: 32 },
    { wch: 36 },
    { wch: 10 },
    { wch: 14 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 10 },
    { wch: 22 },
  ];

  const filasResumen = [
    { Concepto: 'HH DI', 'Por curso': resumen.hhDICurso, Proyecto: resumen.hhDIProyecto },
    { Concepto: 'HH DG', 'Por curso': resumen.hhDGCurso, Proyecto: resumen.hhDGProyecto },
    { Concepto: 'HH SOP', 'Por curso': resumen.hhSOPCurso, Proyecto: resumen.hhSOPProyecto },
    { Concepto: 'Total HH recursos', 'Por curso': resumen.totalRecursosCurso, Proyecto: resumen.totalRecursosProyecto },
    { Concepto: 'HH gestión', 'Por curso': resumen.hhGestionCurso, Proyecto: resumen.hhGestionProyecto },
    { Concepto: 'TOTAL GENERAL HH', 'Por curso': resumen.totalGeneralCurso, Proyecto: resumen.totalGeneralProyecto },
    { Concepto: '', 'Por curso': '', Proyecto: '' },
    { Concepto: 'Recursos seleccionados', 'Por curso': resumen.recursosSeleccionados, Proyecto: '' },
    { Concepto: 'Recursos OK', 'Por curso': resumen.recursosOk, Proyecto: '' },
    { Concepto: 'Pendientes de catalogar', 'Por curso': resumen.pendientesDeCatalogar, Proyecto: '' },
    { Concepto: 'Cubicación completa', 'Por curso': resumen.cubicacionCompleta ? 'SÍ' : 'NO', Proyecto: '' },
    { Concepto: '', 'Por curso': '', Proyecto: '' },
    ...resumen.subtotalesPorSeccion.map((s) => ({ Concepto: `Subtotal — ${s.seccion}`, 'Por curso': s.total, Proyecto: '' })),
  ];
  const hojaResumen = XLSX.utils.json_to_sheet(filasResumen);
  hojaResumen['!cols'] = [{ wch: 36 }, { wch: 14 }, { wch: 14 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hojaParametros, 'Parametros');
  XLSX.utils.book_append_sheet(libro, hojaGestion, 'Gestion');
  XLSX.utils.book_append_sheet(libro, hojaCubicacion, 'Cubicacion');
  XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');

  const fecha = new Date().toISOString().slice(0, 10);
  const nombre = `${sanitizarNombreArchivo(parametros.proyecto)}_${fecha}.xlsx`;
  XLSX.writeFile(libro, nombre);
}
