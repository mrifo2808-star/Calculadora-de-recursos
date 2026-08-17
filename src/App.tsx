import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { PanelParametros } from './components/PanelParametros';
import { TablaGestion } from './components/TablaGestion';
import { TablaCubicacion } from './components/TablaCubicacion';
import { PanelCatalogo } from './components/PanelCatalogo';
import { PanelResumen } from './components/PanelResumen';
import { PARAMETROS_DEFAULT, gestionDefault, nuevaFilaGestion, nuevaFilaProduccion, produccionDefault, SECCIONES } from './data/plantilla';
import { calcularGestion, calcularProduccion, calcularResumen } from './calc';
import type { GestionRow, ParametrosCurso, ProduccionRow } from './types';
import { useCatalog } from './CatalogContext';

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

type Vista = 'cubicacion' | 'catalogo' | 'resumen';

function App() {
  const { catalogo } = useCatalog();
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [vista, setVista] = useState<Vista>('cubicacion');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  }, [estado]);

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
      <header className="app__header">
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

      <footer className="app__footer">
        Datos guardados solo en este navegador (localStorage) — nada se envía a un servidor. Catálogo de tasas
        replicado desde WeLearn_Calculadora_Recursos_v1.3_RC7_EDITABLE.xlsx.
      </footer>
    </div>
  );
}

export default App;
