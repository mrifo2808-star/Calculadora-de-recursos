import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { PanelParametros } from './components/PanelParametros';
import { TablaCubicacion } from './components/TablaCubicacion';
import { PanelCatalogo } from './components/PanelCatalogo';
import { PanelResumen } from './components/PanelResumen';
import { PanelInstrucciones } from './components/PanelInstrucciones';
import {
  ETAPA_GESTION,
  etapasActivasDefault,
  PARAMETROS_DEFAULT,
  gestionDefault,
  nextId,
  nuevaFilaGestion,
  nuevaFilaProduccion,
  produccionDefault,
  reconciliarGestionBase,
  resetContadorId,
  SECCIONES,
} from './data/plantilla';
import { calcularGestion, calcularProduccion, calcularResumen, totalRecursosCurso } from './calc';
import type { GestionRow, ParametrosCurso, ProduccionRow } from './types';
import { useCatalog } from './CatalogContext';
import { useAccess } from './AccessGate';
import { useConfirm } from './ConfirmModal';
import { FooterWeLearn } from './components/FooterWeLearn';

const STORAGE_KEY = 'welearn-calculadora-v1';

/** Una etapa sin entrada explicita en el mapa se considera activa (compatibilidad con
 * estados guardados antes de esta funcionalidad). Funcion pura de modulo (no de
 * componente) para poder referenciarla dentro de un useMemo sin generar dependencias
 * inestables. */
const etapaActiva = (etapasActivas: Record<string, boolean>, etapa: string): boolean => etapasActivas[etapa] !== false;

/** Forma que podia tener una fila de Gestion guardada en localStorage en versiones
 * anteriores del modelo (27-08-2026, mismo dia, tres formas distintas): la original de
 * horas fijas (sin 'tipo' ni 'porcentaje', con cantidad/frecuencia/hhUnitaria reales),
 * la version "solo porcentaje" (sin 'tipo' NI cantidad/frecuencia/hhUnitaria, solo
 * 'porcentaje'), o ya la forma actual completa. Solo se usa para migrar lo que haya
 * guardado — la correccion real de los 7 cargos base la hace `reconciliarGestionBase`
 * despues, sin importar que trajera cada fila. */
type GestionRowGuardada = Partial<GestionRow>;

const migrarGestion = (gestion: GestionRowGuardada[] | undefined): GestionRow[] => {
  const mapeadas: GestionRow[] = (gestion ?? []).map((g) => {
    // Sin 'tipo': si trae cantidad (forma original, de horas fijas) es 'fijo'; si no
    // trae nada de eso (forma "solo porcentaje") es 'porcentaje' y su valor SI importa.
    const tipo = g.tipo ?? (g.cantidad !== undefined ? 'fijo' : 'porcentaje');
    return {
      rowId: g.rowId ?? nextId('g'),
      cargo: g.cargo ?? '',
      tipo,
      cantidad: g.cantidad ?? 1,
      frecuencia: g.frecuencia ?? 'Por semana',
      hhUnitaria: g.hhUnitaria ?? 0,
      porcentaje: g.porcentaje ?? 0,
      removable: g.removable ?? true,
      activa: g.activa !== false,
    };
  });
  // Fuerza los 7 cargos base a su tipo/porcentaje del codigo sin importar que traia la
  // fila migrada arriba (si un cargo base venia con otro valor, aca queda corregido).
  return reconciliarGestionBase(mapeadas);
};

interface Estado {
  parametros: ParametrosCurso;
  gestion: GestionRow[];
  produccion: ProduccionRow[];
  /** Etapa (seccion de Cubicacion o Gestion) -> activa. Ausente/undefined = activa. */
  etapasActivas: Record<string, boolean>;
}

function estadoInicial(): Estado {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const guardado = JSON.parse(raw) as Partial<Estado>;
      return {
        parametros: guardado.parametros ?? PARAMETROS_DEFAULT,
        gestion: migrarGestion(guardado.gestion as GestionRowGuardada[] | undefined),
        produccion: guardado.produccion ?? produccionDefault(),
        // Merge con el default: estados guardados antes de esta funcionalidad no tienen
        // etapasActivas, y una etapa nueva que se agregue a futuro debe nacer activa.
        etapasActivas: { ...etapasActivasDefault(), ...guardado.etapasActivas },
      };
    }
  } catch {
    // localStorage no disponible o dato corrupto: seguimos con la plantilla
  }
  return {
    parametros: PARAMETROS_DEFAULT,
    gestion: gestionDefault(),
    produccion: produccionDefault(),
    etapasActivas: etapasActivasDefault(),
  };
}

type Vista = 'cubicacion' | 'catalogo' | 'resumen' | 'instrucciones';

function App() {
  const { catalogo } = useCatalog();
  const { cerrarSesion } = useAccess();
  const confirmar = useConfirm();
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [vista, setVista] = useState<Vista>('cubicacion');
  const [exportando, setExportando] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  }, [estado]);

  // El header es sticky y la barra de tabs se pega justo debajo de el: se mide su
  // alto real (cambia con el ancho de pantalla y con textos mas largos) en vez de
  // hardcodear un offset, para que la barra de tabs no quede tapada ni deje un hueco.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const actualizarAlto = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    actualizarAlto();
    const observer = new ResizeObserver(actualizarAlto);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { produccionCalc, gestionCalc, resumen, baseGestionHH } = useMemo(() => {
    // Una etapa desactivada excluye TODAS sus filas del calculo y de la exportacion. En
    // Gestion ademas cada fila individual puede desactivarse (se mantiene visible en la
    // exportacion, para dejar registro, pero se excluye de los totales de Resumen). En
    // Cubicacion no existe ese toggle por fila: un recurso que no aplica se elimina.
    const produccionEnEtapasActivas = estado.produccion.filter((r) => etapaActiva(estado.etapasActivas, r.seccion));
    const gestionEnEtapaActiva = etapaActiva(estado.etapasActivas, ETAPA_GESTION) ? estado.gestion : [];
    const seccionesActivas = SECCIONES.filter((s) => etapaActiva(estado.etapasActivas, s));

    const produccionCalc = calcularProduccion(produccionEnEtapasActivas, estado.parametros.nSemanas, catalogo);
    // Base de los cargos de Gestion tipo 'porcentaje': el total de HH de produccion
    // (etapas activas, por curso) — se calcula ANTES de Gestion para que un cargo
    // porcentual nunca dependa de si mismo ni de otro cargo de Gestion.
    const baseGestionHH = totalRecursosCurso(produccionCalc);
    const gestionCalc = calcularGestion(gestionEnEtapaActiva, estado.parametros.nSemanas, baseGestionHH);

    const gestionParaTotales = gestionCalc.filter((r) => r.activa !== false);
    const resumen = calcularResumen(produccionCalc, gestionParaTotales, estado.parametros.nCursos, seccionesActivas);

    return { produccionCalc, gestionCalc, resumen, baseGestionHH };
  }, [estado, catalogo]);

  const resetPlantilla = async () => {
    const ok = await confirmar('Esto reemplaza todos los datos actuales por la plantilla original. ¿Continuar?', {
      titulo: 'Restaurar plantilla',
      textoConfirmar: 'Restaurar',
    });
    if (!ok) return;
    resetContadorId();
    setEstado({
      parametros: PARAMETROS_DEFAULT,
      gestion: gestionDefault(),
      produccion: produccionDefault(),
      etapasActivas: etapasActivasDefault(),
    });
  };

  const toggleEtapa = (etapa: string) =>
    setEstado((e) => ({ ...e, etapasActivas: { ...e.etapasActivas, [etapa]: !etapaActiva(e.etapasActivas, etapa) } }));

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const { descargarCubicacionExcel } = await import('./exportCubicacion');
      descargarCubicacionExcel({ parametros: estado.parametros, gestion: gestionCalc, produccion: produccionCalc, resumen });
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="app">
      <header className="app__header" ref={headerRef}>
        <div>
          <h1>WeLearn — Calculadora de Recursos</h1>
          <p className="app__subtitulo">Cubicación de horas DI / DG / SOP para proyectos de producción de cursos</p>
        </div>
        <div className="app__total">
          <span className="app__total-label">Total general HH proyecto</span>
          <span className="app__total-valor">{resumen.totalGeneralProyecto.toLocaleString('es-CL')}</span>
        </div>
      </header>

      <PanelParametros
        parametros={estado.parametros}
        onChange={(parametros) => setEstado((e) => ({ ...e, parametros }))}
        onReset={resetPlantilla}
        onExport={exportarExcel}
        exportando={exportando}
        gestionActual={estado.gestion}
        produccionActual={estado.produccion}
        onImportado={(datos) =>
          setEstado((e) => ({
            ...e,
            parametros: datos.parametros,
            gestion: datos.gestion,
            produccion: datos.produccion,
            // El Excel no guarda que etapas estaban desactivadas (no es una columna del
            // export): todas las etapas presentes vuelven a nacer activas, igual que en
            // "Restaurar plantilla".
            etapasActivas: etapasActivasDefault(),
          }))
        }
      />

      <nav className="tabs" role="tablist" aria-label="Secciones de la calculadora">
        <button
          id="tab-cubicacion"
          role="tab"
          aria-selected={vista === 'cubicacion'}
          aria-controls="panel-cubicacion"
          className={vista === 'cubicacion' ? 'tabs__btn tabs__btn--activo' : 'tabs__btn'}
          onClick={() => setVista('cubicacion')}
        >
          Cubicación
        </button>
        <button
          id="tab-catalogo"
          role="tab"
          aria-selected={vista === 'catalogo'}
          aria-controls="panel-catalogo"
          className={vista === 'catalogo' ? 'tabs__btn tabs__btn--activo' : 'tabs__btn'}
          onClick={() => setVista('catalogo')}
        >
          Catálogo
        </button>
        <button
          id="tab-resumen"
          role="tab"
          aria-selected={vista === 'resumen'}
          aria-controls="panel-resumen"
          className={vista === 'resumen' ? 'tabs__btn tabs__btn--activo' : 'tabs__btn'}
          onClick={() => setVista('resumen')}
        >
          Resumen
        </button>
        <button
          id="tab-instrucciones"
          role="tab"
          aria-selected={vista === 'instrucciones'}
          aria-controls="panel-instrucciones"
          className={vista === 'instrucciones' ? 'tabs__btn tabs__btn--activo' : 'tabs__btn'}
          onClick={() => setVista('instrucciones')}
        >
          Instrucciones
        </button>
      </nav>

      {/* Las 4 vistas quedan siempre montadas y se ocultan con display:none en vez de
          desmontarse: cambiar de tab no debe perder el scroll ni el estado interno
          (filtros del catalogo, etc.) de la vista que se deja de mostrar. */}
      <div id="panel-cubicacion" role="tabpanel" aria-labelledby="tab-cubicacion" style={{ display: vista === 'cubicacion' ? 'block' : 'none' }}>
        <TablaCubicacion
          rows={estado.produccion}
          nSemanas={estado.parametros.nSemanas}
          catalogo={catalogo}
          etapasActivas={estado.etapasActivas}
          onToggleEtapa={toggleEtapa}
          onChange={(produccion) => setEstado((e) => ({ ...e, produccion }))}
          onAdd={(seccion) => setEstado((e) => ({ ...e, produccion: [...e.produccion, nuevaFilaProduccion(seccion)] }))}
          gestionRows={estado.gestion}
          baseGestionHH={baseGestionHH}
          onChangeGestion={(gestion) => setEstado((e) => ({ ...e, gestion }))}
          onAddGestion={() => setEstado((e) => ({ ...e, gestion: [...e.gestion, nuevaFilaGestion()] }))}
        />
      </div>
      <div id="panel-catalogo" role="tabpanel" aria-labelledby="tab-catalogo" style={{ display: vista === 'catalogo' ? 'block' : 'none' }}>
        <PanelCatalogo />
      </div>
      <div id="panel-resumen" role="tabpanel" aria-labelledby="tab-resumen" style={{ display: vista === 'resumen' ? 'block' : 'none' }}>
        <PanelResumen resumen={resumen} nCursos={estado.parametros.nCursos} />
      </div>
      <div id="panel-instrucciones" role="tabpanel" aria-labelledby="tab-instrucciones" style={{ display: vista === 'instrucciones' ? 'block' : 'none' }}>
        <PanelInstrucciones />
      </div>

      <footer className="app__footer" role="contentinfo">
        <p className="app__footer-texto">
          Catálogo de tasas sincronizado en vivo con el equipo (Supabase). Cubicación, gestión y parámetros del
          proyecto se guardan solo en este navegador (localStorage) — nada de eso se envía a un servidor.
        </p>
        <button type="button" className="app__cerrar-sesion" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
        {/* standalone=false: ya estamos dentro de un <footer role="contentinfo">, dos
            landmarks contentinfo en la misma pagina no son validos (ver FooterWeLearn.tsx) */}
        <FooterWeLearn standalone={false} />
      </footer>
    </div>
  );
}

export default App;
