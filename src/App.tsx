import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { PanelParametros } from './components/PanelParametros';
import { TablaGestion } from './components/TablaGestion';
import { TablaCubicacion } from './components/TablaCubicacion';
import { PanelCatalogo } from './components/PanelCatalogo';
import { PanelResumen } from './components/PanelResumen';
import { PanelInstrucciones } from './components/PanelInstrucciones';
import { PARAMETROS_DEFAULT, gestionDefault, nuevaFilaGestion, nuevaFilaProduccion, produccionDefault, resetContadorId, SECCIONES } from './data/plantilla';
import { calcularGestion, calcularProduccion, calcularResumen } from './calc';
import type { GestionRow, ParametrosCurso, ProduccionRow } from './types';
import { useCatalog } from './CatalogContext';
import { useAccess } from './AccessGate';
import { useConfirm } from './ConfirmModal';

const STORAGE_KEY = 'welearn-calculadora-v1';

interface Estado {
  parametros: ParametrosCurso;
  gestion: GestionRow[];
  produccion: ProduccionRow[];
}

function estadoInicial(): Estado {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Estado;
  } catch {
    // localStorage no disponible o dato corrupto: seguimos con la plantilla
  }
  return { parametros: PARAMETROS_DEFAULT, gestion: gestionDefault(), produccion: produccionDefault() };
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

  const { produccionCalc, gestionCalc, resumen } = useMemo(() => {
    const produccionCalc = calcularProduccion(estado.produccion, estado.parametros.nSemanas, catalogo);
    const gestionCalc = calcularGestion(estado.gestion, estado.parametros.nSemanas);
    const resumen = calcularResumen(produccionCalc, gestionCalc, estado.parametros.nCursos, SECCIONES);
    return { produccionCalc, gestionCalc, resumen };
  }, [estado, catalogo]);

  const resetPlantilla = async () => {
    const ok = await confirmar('Esto reemplaza todos los datos actuales por la plantilla original. ¿Continuar?', {
      titulo: 'Restaurar plantilla',
      textoConfirmar: 'Restaurar',
    });
    if (!ok) return;
    resetContadorId();
    setEstado({ parametros: PARAMETROS_DEFAULT, gestion: gestionDefault(), produccion: produccionDefault() });
  };

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
      />

      <TablaGestion
        rows={estado.gestion}
        nSemanas={estado.parametros.nSemanas}
        onChange={(gestion) => setEstado((e) => ({ ...e, gestion }))}
        onAdd={() => setEstado((e) => ({ ...e, gestion: [...e.gestion, nuevaFilaGestion()] }))}
      />

      <nav className="tabs">
        <button className={vista === 'cubicacion' ? 'tabs__btn tabs__btn--activo' : 'tabs__btn'} onClick={() => setVista('cubicacion')}>
          Cubicación
        </button>
        <button className={vista === 'catalogo' ? 'tabs__btn tabs__btn--activo' : 'tabs__btn'} onClick={() => setVista('catalogo')}>
          Catálogo
        </button>
        <button className={vista === 'resumen' ? 'tabs__btn tabs__btn--activo' : 'tabs__btn'} onClick={() => setVista('resumen')}>
          Resumen
        </button>
        <button className={vista === 'instrucciones' ? 'tabs__btn tabs__btn--activo' : 'tabs__btn'} onClick={() => setVista('instrucciones')}>
          Instrucciones
        </button>
      </nav>

      {/* Las 4 vistas quedan siempre montadas y se ocultan con display:none en vez de
          desmontarse: cambiar de tab no debe perder el scroll ni el estado interno
          (filtros del catalogo, etc.) de la vista que se deja de mostrar. */}
      <div style={{ display: vista === 'cubicacion' ? 'block' : 'none' }}>
        <TablaCubicacion
          rows={estado.produccion}
          nSemanas={estado.parametros.nSemanas}
          catalogo={catalogo}
          onChange={(produccion) => setEstado((e) => ({ ...e, produccion }))}
          onAdd={(seccion) => setEstado((e) => ({ ...e, produccion: [...e.produccion, nuevaFilaProduccion(seccion)] }))}
        />
      </div>
      <div style={{ display: vista === 'catalogo' ? 'block' : 'none' }}>
        <PanelCatalogo />
      </div>
      <div style={{ display: vista === 'resumen' ? 'block' : 'none' }}>
        <PanelResumen resumen={resumen} nCursos={estado.parametros.nCursos} />
      </div>
      <div style={{ display: vista === 'instrucciones' ? 'block' : 'none' }}>
        <PanelInstrucciones />
      </div>

      <footer className="app__footer">
        Catálogo de tasas sincronizado en vivo con el equipo (Supabase). Cubicación, gestión y parámetros del
        proyecto se guardan solo en este navegador (localStorage) — nada de eso se envía a un servidor.
        <button type="button" className="app__cerrar-sesion" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </footer>
    </div>
  );
}

export default App;
