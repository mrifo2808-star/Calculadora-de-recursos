import type { RecursoCatalogo } from '../types';

/**
 * Fuente base: WeLearn_Calculadora_Recursos_v1.3_RC7_EDITABLE.xlsx, hoja "Catalogo"
 * (veredicto APROBADO RC7, ver outputs/reporte_QA_RC7.txt), ampliado el 2026-08-17 con
 * hallazgos de una auditoria de solo lectura contra tareas reales en varios espacios de
 * Wrike (P2026, UNAB, INACAP Diplomado). Solo Estado="Validado" es seleccionable en la
 * cascada Tipo -> Recurso; Pendiente/Historico quedan visibles en el catalogo de
 * referencia pero no calculan. Catálogo incorporado en el código (punto de partida /
 * "restaurar original").
 */
export const CATALOGO_BASE: RecursoCatalogo[] = [
  { id: 'Actividad|Actividad formativa Word|1 pag', estado: 'Pendiente', tipo: 'Actividad', nombreVisible: 'Actividad formativa Word', extension: '1 pag', unidad: 'paginas', di: 0.75, dg: null, sop: null, fuente: 'O2027 Flujo por Recurso', observaciones: 'DI=0:45h (guion word). Sin DG ni Sop porque es actividad de autoria docente sin produccion multimedia.' },
  { id: 'Actividad|Actividad formativa Rise|1 ud', estado: 'Validado', tipo: 'Actividad', nombreVisible: 'Actividad formativa Rise', extension: '1 ud', unidad: 'unidad', di: 0.75, dg: 0.25, sop: null, fuente: 'Wrike INACAP Diplomado (real)', observaciones: 'Agregado tras revision Wrike (curso "Liderazgo organizacional estrategico", U1). Distinta de "Actividad formativa Word" (esta usa Rise, no Word). QA sin esfuerzo registrado en la muestra.' },
  { id: 'Animacion|Animacion T1|1 min', estado: 'Validado', tipo: 'Animacion', nombreVisible: 'Animacion', extension: '1 min', unidad: 'minutos', di: null, dg: null, sop: 0.2, fuente: 'v1.2 Catalogo + UCT', observaciones: 'Solo Sop registrado. DI y DG con tiempo 0.' },
  { id: 'Animacion|Animacion T2|2 min', estado: 'Validado', tipo: 'Animacion', nombreVisible: 'Animacion', extension: '2 min', unidad: 'minutos', di: 2, dg: 3.5, sop: 0.3, fuente: 'v1.2 Catalogo + UCT', observaciones: 'Tiempo consistente entre v1.2 y UCT Catalogo.' },
  { id: 'Cuestionario|Evaluacion de modulo|20 preg', estado: 'Historico', tipo: 'Cuestionario', nombreVisible: 'Evaluacion de modulo', extension: '20 preg', unidad: 'preguntas', di: 2, dg: null, sop: null, fuente: 'UCT Cubicacion-Full', observaciones: 'Solo DI registrado (2h por 20 preguntas). DG y Sop en 0.' },
  { id: 'Cuestionario|Evaluacion sumativa con IA|1 ud', estado: 'Validado', tipo: 'Cuestionario', nombreVisible: 'Evaluacion sumativa con IA', extension: '1 ud', unidad: 'unidad', di: 2, dg: null, sop: 0.25, fuente: 'Wrike INACAP Diplomado (real)', observaciones: 'Agregado tras revision Wrike. Instrumento elaborado con apoyo de IA; solo tiene DI (elaboracion, 2h) y un paso de ajuste posterior (0.25h) registrado como SOP. Sin DG separado en la muestra.' },
  { id: 'Documento|Apunte|diagramacion', estado: 'Validado', tipo: 'Documento', nombreVisible: 'Apunte', extension: 'diagramacion', unidad: 'documento', di: 0.5, dg: 0.5, sop: 0.5, fuente: 'Wrike UNAB (real)', observaciones: 'Agregado tras revision Wrike (proyecto UNAB, U2/S2 Hito 2-3). Tipo "Documento" nuevo, no existia categoria similar en el catalogo previo.' },
  { id: 'Imagen|Imagen Compleja|menor 4 form', estado: 'Validado', tipo: 'Imagen', nombreVisible: 'Imagen Compleja', extension: 'menor 4 form', unidad: 'formatos', di: 0.5, dg: 0.5, sop: null, fuente: 'v1.2 Catalogo + UCT', observaciones: 'Sin Sop (no pasa por QA).' },
  { id: 'Interactivo|Dinamica Interactiva|1 ud', estado: 'Validado', tipo: 'Interactivo', nombreVisible: 'Dinamica Interactiva', extension: '1 ud', unidad: 'unidad', di: 2.5, dg: 4, sop: 0.5, fuente: 'Wrike UNAB (real)', observaciones: 'Agregado tras revision Wrike (proyecto UNAB, U2/S2 Hito 2-3). Tipo "Interactivo" nuevo, no existia categoria similar en el catalogo previo.' },
  { id: 'Imagen|Imagen Simple|menor 2 form', estado: 'Validado', tipo: 'Imagen', nombreVisible: 'Imagen Simple', extension: 'menor 2 form', unidad: 'formatos', di: 0.25, dg: 0.5, sop: null, fuente: 'v1.2 Catalogo + UCT', observaciones: 'Sin Sop (no pasa por QA).' },
  { id: 'Infografia|Infografia Interactiva|1 pag', estado: 'Validado', tipo: 'Infografia', nombreVisible: 'Infografia Interactiva', extension: '1 pag', unidad: 'paginas', di: 1.5, dg: 2, sop: 0.5, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Infografia|Infografia Plana|1 pag', estado: 'Validado', tipo: 'Infografia', nombreVisible: 'Infografia Plana', extension: '1 pag', unidad: 'paginas', di: 1, dg: 1.5, sop: 0.25, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Infografia+PDF|Infografia+PDF T1|1 pag', estado: 'Validado', tipo: 'Infografia+PDF', nombreVisible: 'Infografia+PDF', extension: '1 pag', unidad: 'paginas', di: 1, dg: 1.25, sop: 0.25, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Infografia+PDF|Infografia+PDF T2|2 pag', estado: 'Validado', tipo: 'Infografia+PDF', nombreVisible: 'Infografia+PDF', extension: '2 pag', unidad: 'paginas', di: 2, dg: 2.5, sop: 0.25, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Microjuego|Microjuego T1|5 sl', estado: 'Validado', tipo: 'Microjuego', nombreVisible: 'Microjuego', extension: '5 sl', unidad: 'slides', di: 0.2, dg: 0.35, sop: 0.05, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Microjuego|Microjuego T2|10 sl', estado: 'Validado', tipo: 'Microjuego', nombreVisible: 'Microjuego', extension: '10 sl', unidad: 'slides', di: 1, dg: 1.75, sop: 0.25, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Microjuego|Microjuego T3|15 sl', estado: 'Validado', tipo: 'Microjuego', nombreVisible: 'Microjuego', extension: '15 sl', unidad: 'slides', di: 2, dg: 3.5, sop: 0.5, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Podcast|Podcast T1|3 min', estado: 'Validado', tipo: 'Podcast', nombreVisible: 'Podcast', extension: '3 min', unidad: 'minutos', di: 2, dg: 0.5, sop: 0.083, fuente: 'v1.2 Catalogo + UCT', observaciones: 'DI incluye solo guion breve (grabacion por docente).' },
  { id: 'Podcast|Podcast T2|5 min', estado: 'Validado', tipo: 'Podcast', nombreVisible: 'Podcast T2', extension: '5 min', unidad: 'minutos', di: null, dg: 1, sop: 0.167, fuente: 'v1.2 Catalogo + UCT', observaciones: 'Sin DI (docente entrega audio directo).' },
  { id: 'Podcast|Podcast T3|8 min', estado: 'Validado', tipo: 'Podcast', nombreVisible: 'Podcast T3', extension: '8 min', unidad: 'minutos', di: null, dg: 1, sop: 0.25, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Podcast|Podcast T5|5 min', estado: 'Validado', tipo: 'Podcast', nombreVisible: 'Podcast T5', extension: '5 min', unidad: 'minutos', di: null, dg: 2.5, sop: 0.33, fuente: 'v1.2 Catalogo + UCT', observaciones: 'DG mayor por postproduccion compleja.' },
  { id: 'Podcast|Podcast T8|8 min', estado: 'Validado', tipo: 'Podcast', nombreVisible: 'Podcast T8', extension: '8 min', unidad: 'minutos', di: null, dg: 3.5, sop: 0.33, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'PPT|PPT|slides', estado: 'Pendiente', tipo: 'PPT', nombreVisible: 'PPT', extension: 'slides', unidad: 'slides', di: 1.5, dg: null, sop: null, fuente: 'O2027 Flujo por Recurso', observaciones: 'Propuesto: DI=guion 1:30h DG=produccion 2:00h Sop=QA 0:15h. Priorizar validacion.' },
  { id: 'Rise|Rise interactivo nativo + PDF (glosario)|conceptos', estado: 'Historico', tipo: 'Rise', nombreVisible: 'Rise interactivo nativo + PDF (glosario)', extension: 'conceptos', unidad: 'conceptos', di: 0.5, dg: null, sop: 0.25, fuente: 'UCT Cubicacion-Full', observaciones: 'Recurso de nicho (glosario).' },
  { id: 'Rise|Rise mediatizacion + carga|5 pag', estado: 'Validado', tipo: 'Rise', nombreVisible: 'Rise mediatizacion + carga', extension: '5 pag', unidad: 'paginas', di: 1.5, dg: 1.5, sop: 0.5, fuente: 'v1.2 Catalogo + UCT', observaciones: 'Tiempos respaldados por historico UCT y P2026.' },
  { id: 'Simulacion|Simulacion Storyline T1|5 sl', estado: 'Validado', tipo: 'Simulacion', nombreVisible: 'Simulacion Storyline', extension: '5 sl', unidad: 'slides', di: 0.2, dg: 0.35, sop: 0.05, fuente: 'v1.2 Catalogo + UCT', observaciones: 'Cambio de tipo no afecta tiempos.' },
  { id: 'Simulacion|Simulacion Storyline T2|10 sl', estado: 'Validado', tipo: 'Simulacion', nombreVisible: 'Simulacion Storyline', extension: '10 sl', unidad: 'slides', di: 1, dg: 1.75, sop: 0.25, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Simulacion|Simulacion Storyline T3|15 sl', estado: 'Validado', tipo: 'Simulacion', nombreVisible: 'Simulacion Storyline', extension: '15 sl', unidad: 'slides', di: 2, dg: 3.5, sop: 0.5, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Storyline|Storyline T1|10 sl', estado: 'Validado', tipo: 'Storyline', nombreVisible: 'Storyline T1', extension: '10 sl', unidad: 'slides', di: 0.2, dg: 0.35, sop: 0.05, fuente: 'v1.2 Catalogo + UCT', observaciones: 'Extension referencia: 10 slides base.' },
  { id: 'Storyline|Storyline T2|5 sl', estado: 'Validado', tipo: 'Storyline', nombreVisible: 'Storyline', extension: '5 sl', unidad: 'slides', di: 1, dg: 1.75, sop: 0.25, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Storyline|Storyline T3|10 sl', estado: 'Validado', tipo: 'Storyline', nombreVisible: 'Storyline T3', extension: '10 sl', unidad: 'slides', di: 2, dg: 3.5, sop: 0.5, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Storyline Int|Storyline Interactivo T1|5 sl', estado: 'Validado', tipo: 'Storyline Int', nombreVisible: 'Storyline Interactivo', extension: '5 sl', unidad: 'slides', di: 2, dg: 2, sop: 0.5, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Storyline Int|Storyline Interactivo T2|10 sl', estado: 'Validado', tipo: 'Storyline Int', nombreVisible: 'Storyline Interactivo', extension: '10 sl', unidad: 'slides', di: 2.5, dg: 3.5, sop: 0.5, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Video|Video After T1|1 min', estado: 'Validado', tipo: 'Video', nombreVisible: 'Video After', extension: '1 min', unidad: 'minutos', di: 1.5, dg: 2.05, sop: 0.2, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Video|Video After T2|2 min', estado: 'Validado', tipo: 'Video', nombreVisible: 'Video After', extension: '2 min', unidad: 'minutos', di: 2, dg: 3.25, sop: 0.3, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Video|Video After T3|3 min', estado: 'Validado', tipo: 'Video', nombreVisible: 'Video After', extension: '3 min', unidad: 'minutos', di: 2.5, dg: 4.5, sop: 0.5, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Video|Video 2D|1 ud', estado: 'Validado', tipo: 'Video', nombreVisible: 'Video 2D', extension: '1 ud', unidad: 'unidad', di: 1, dg: 3, sop: 0.5, fuente: 'Wrike UNAB (real)', observaciones: 'Agregado tras revision Wrike (proyecto UNAB, U2/S2 Hito 2-3). Tiene ademas un paso "Ajuste" de 0.5h no capturado en el esquema DI/DG/SOP actual.' },
  { id: 'Video|Capsula video Docente|1 ud', estado: 'Validado', tipo: 'Video', nombreVisible: 'Capsula video Docente', extension: '1 ud', unidad: 'unidad', di: 0.25, dg: 1, sop: 0.5, fuente: 'Wrike UNAB (real)', observaciones: 'Agregado tras revision Wrike (proyecto UNAB, U2/S2 Hito 2-3). DI atipico (0.25h "Revisar", no "Elaborar guion"): el docente entrega el video ya grabado.' },
  { id: 'Video|Video caso aplicado|min', estado: 'Pendiente', tipo: 'Video', nombreVisible: 'Video caso aplicado', extension: 'min', unidad: 'minutos', di: 2, dg: null, sop: null, fuente: 'O2027 Flujo por Recurso', observaciones: 'Propuesto: DI=2:00h DG=3:00h Sop=0:30h. Presente en cursos INACAP (no en diplomados).' },
  { id: 'Video|Video de contenido|3 min', estado: 'Validado', tipo: 'Video', nombreVisible: 'Video de contenido', extension: '3 min', unidad: 'minutos', di: 2.5, dg: 4, sop: 0.5, fuente: 'O2027 Flujo por Recurso + Wrike P2026 (real)', observaciones: 'Confirmado contra tarea real en Wrike (P2026 CGGE41, U1S1, "H3.8 Recurso Audiovisual - Video de contenido"): DI=2:30h DG=4:00h SOP=0:30h, identico a lo propuesto. Recurso central de curso INACAP.' },
  { id: 'Video|Video de contenido (IA Fliki)|3 min', estado: 'Pendiente', tipo: 'Video', nombreVisible: 'Video de contenido (IA Fliki)', extension: '3 min', unidad: 'minutos', di: null, dg: 2.5, sop: 0.5, fuente: 'Wrike INACAP Diplomado (real)', observaciones: 'Detectado tras revision Wrike: mismo nombre que "Video de contenido" pero producido con herramienta de IA (Fliki), con DG notablemente menor (2.5h vs 4h) mas un paso extra "Ajuste DG" de 0.83h. No se confirma si amerita ser un recurso separado o es una anomalia puntual de este curso; queda Pendiente hasta que el equipo lo confirme. DI no capturado en la muestra.' },
  { id: 'Video|Video animado|min', estado: 'Validado', tipo: 'Video', nombreVisible: 'Video animado', extension: 'min', unidad: 'minutos', di: 2, dg: 3, sop: 0.5, fuente: 'Wrike P2026 (real)', observaciones: 'Agregado tras revision Wrike: no existia en el catalogo. Tarea real "H3.3 Video animado" (P2026 CGGE41, U1S1): DI=2:00h DG=3:00h SOP=0:30h. Muestreado de un solo curso/semana; confirmar si se repite en otros cursos antes de fijar como tarifa definitiva.' },
  { id: 'Video|Video Interactivo T1|1 min', estado: 'Validado', tipo: 'Video', nombreVisible: 'Video Interactivo', extension: '1 min', unidad: 'minutos', di: 1.5, dg: 3.55, sop: 0.2, fuente: 'v1.2 Catalogo + UCT', observaciones: 'DG mayor por interactividad.' },
  { id: 'Video|Video Interactivo T2|2 min', estado: 'Validado', tipo: 'Video', nombreVisible: 'Video Interactivo', extension: '2 min', unidad: 'minutos', di: 2, dg: 4.75, sop: 0.3, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Video|Video Interactivo T3|3 min', estado: 'Validado', tipo: 'Video', nombreVisible: 'Video Interactivo', extension: '3 min', unidad: 'minutos', di: 2.5, dg: 6, sop: 0.5, fuente: 'v1.2 Catalogo + UCT', observaciones: '—' },
  { id: 'Video|Video introductorio|min', estado: 'Pendiente', tipo: 'Video', nombreVisible: 'Video introductorio', extension: 'min', unidad: 'minutos', di: 1, dg: null, sop: null, fuente: 'O2027 Flujo por Recurso', observaciones: 'Propuesto: DI=1:00h DG=2:00h Sop=0:15h. Exclusivo de Diplomados INACAP.' },
  { id: 'Video|Video Synthesia T3|3 min', estado: 'Validado', tipo: 'Video', nombreVisible: 'Video Synthesia', extension: '3 min', unidad: 'minutos', di: 2.5, dg: 2, sop: 0.5, fuente: 'v1.2 Catalogo + UCT', observaciones: 'DG 1.5h menor que After T3 (4h). Diferencia validada.' },
];

export const recursoPorId = (catalogo: RecursoCatalogo[], id: string | null): RecursoCatalogo | undefined =>
  id ? catalogo.find((r) => r.id === id) : undefined;

export const etiquetaRecurso = (r: RecursoCatalogo): string => `${r.nombreVisible} — ${r.extension}`;

/** Tipos con al menos un recurso Validado, orden alfabetico (coincide con la cascada del Excel). */
export const tiposDisponibles = (catalogo: RecursoCatalogo[]): string[] => {
  const set = new Set(
    catalogo.filter((r) => r.estado === 'Validado').map((r) => r.tipo),
  );
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
};

/** Recursos Validados de un Tipo, ordenados por etiqueta visible. */
export const recursosPorTipo = (catalogo: RecursoCatalogo[], tipo: string): RecursoCatalogo[] =>
  catalogo.filter((r) => r.estado === 'Validado' && r.tipo === tipo).sort((a, b) =>
    etiquetaRecurso(a).localeCompare(etiquetaRecurso(b), 'es'),
  );
