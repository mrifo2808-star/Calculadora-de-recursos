import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { PanelParametros } from './components/PanelParametros';
import { TablaGestion } from './components/TablaGestion';
import { TablaCubicacion } from './components/TablaCubicacion';
import { PanelCatalogo } from './components/PanelCatalogo';
import { PanelResumen } from './components/PanelResumen';
import { PanelInstrucciones } from './components/PanelInstrucciones';
import { PARAMETROS_DEFAULT, gestionDefault, nuevaFilaGestion, nuevaFilaProduccion, produccionDefault, SECCIONES } from './data/plantilla';
import { calcularGestion, calcularProduccion, calcularResumen } from './calc';
import type { GestionRow, ParametrosCurso, ProduccionRow } from './types';
import { useCatalog } from './CatalogContext';
import { useAccess } from './AccessGate';

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
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [vista, setVista] = useState<Vista>('cubicacion');
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

  const resumen = useMemo(() => {
    const produccionCalc = calcularProduccion(estado.produccion, estado.parametros.nSemanas, catalogo);
    const gestionCalc = calcularGestion(estado.gestion, estado.parametros.nSemanas);
    return calcularResumen(produccionCalc, gestionCalc, estado.parametros.nCursos, SECCIONES);
  }, [estado, catalogo]);

  const resetPlantilla = () => {
    if (!confirm('Esto reemplaza todos los datos actuales por la plantilla original. ¿Continuar?')) return;
    setEstado({ parametros: PARAMETROS_DEFAULT, gestion: gestionDefault(), produccion: produccionDefault() });
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

      {vista === 'cubicacion' && (
        <TablaCubicacion
          rows={estado.produccion}
          nSemanas={estado.parametros.nSemanas}
          catalogo={catalogo}
          onChange={(produccion) => setEstado((e) => ({ ...e, produccion }))}
          onAdd={(seccion) => setEstado((e) => ({ ...e, produccion: [...e.produccion, nuevaFilaProduccion(seccion)] }))}
        />
      )}
      {vista === 'catalogo' && <PanelCatalogo />}
      {vista === 'resumen' && <PanelResumen resumen={resumen} nCursos={estado.parametros.nCursos} />}
      {vista === 'instrucciones' && <PanelInstrucciones />}

      <footer className="app__footer">
        Datos guardados solo en este navegador (localStorage) — nada se envía a un servidor. Catálogo de tasas
        replicado desde WeLearn_Calculadora_Recursos_v1.3_RC7_EDITABLE.xlsx.
        <button type="button" className="app__cerrar-sesion" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </footer>
    </div>
  );
}

export default App;
