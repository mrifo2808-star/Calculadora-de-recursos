export function PanelInstrucciones() {
  return (
    <section className="panel">
      <h2>Instrucciones de uso</h2>
      <p className="panel__hint">Guía rápida — no reemplaza el criterio de quien cubica, solo explica cómo se calcula cada número.</p>

      <h3>1. Parámetros del proyecto</h3>
      <p className="panel__texto">
        Define N° de cursos y N° de semanas antes de cargar recursos: el N° de semanas es el <strong>Factor</strong>{' '}
        que multiplica cualquier fila con Frecuencia «Por semana» (las demás frecuencias usan Factor = 1).
      </p>

      <h3>2. Cubicación</h3>
      <p className="panel__texto">
        Por cada tarea: elige <strong>Tipo</strong> y luego <strong>Recurso</strong> (el recurso ya incluye la
        duración/extensión, ej. «Video After — 1 min»). Si el Tipo tiene un solo recurso válido se autocompleta. Sin
        selección completa, la fila queda <span className="pill pill--pendiente">PENDIENTE DE CATALOGAR</span> y no
        suma horas. Usa «+ Agregar fila» para sumar recursos en cualquier sección. Como cada recurso es específico de
        esa cubicación (no se reutiliza entre proyectos), una fila que no aplica se elimina con 🗑 en vez de
        desactivarse.
      </p>
      <p className="panel__texto">
        La lista de secciones incluye, al final, <strong>«Gestión del proyecto»</strong> (cargos JP, Senior, Jefes de
        Área, etc.): es una sección más de Cubicación, no un bloque aparte. A diferencia de los recursos, estos
        cargos suelen reutilizarse entre proyectos, así que cada fila de Gestión tiene su propio interruptor «Activa»
        en vez de (o además de, según el cargo — ver el punto siguiente) un botón «✕» de eliminar: desactivarla la
        deja visible pero atenuada y sin sumar horas, sin perder los datos.
      </p>
      <p className="panel__texto">
        Los <strong>7 cargos base</strong> (JP, Senior DI/DG/Sop, Jefes de Área DI/DG/Sop TL) van siempre en el
        proyecto, con el porcentaje del total de HH de producción definido en el código — no son editables ni
        eliminables desde acá, solo se pueden activar/desactivar. «+ Agregar cargo» suma uno nuevo, ese sí totalmente
        editable: se elige si es «<strong>% Proyecto</strong>» (porcentaje fijo del total de HH de producción del
        proyecto) o «<strong>Fijo</strong>» (Cantidad × Frecuencia × HH unitaria, igual que un recurso de
        Cubicación) con el selector «Tipo» de su fila.
      </p>
      <p className="panel__texto">
        Además, cada sección (incluida «Gestión del proyecto») tiene un interruptor «Etapa activa» / «Etapa
        desactivada» en su encabezado. Un curso que no necesita, por ejemplo, Implementación o Demostración —o que no
        lleva Gestión propia— puede desactivar esa etapa completa: sus filas dejan de sumar horas en Resumen y en el
        Excel exportado, sin perder los datos — se pueden reactivar en cualquier momento.
      </p>

      <h3>3. Catálogo</h3>
      <p className="panel__texto">
        Solo los recursos <span className="pill pill--ok">Validado</span> son seleccionables en Cubicación;{' '}
        <span className="pill pill--vacia">Pendiente</span>/<span className="pill pill--vacia">Histórico</span>{' '}
        quedan como referencia. El catálogo se sincroniza en vivo para todo el equipo: si descargas el Excel, lo
        corriges y lo vuelves a cargar, el cambio lo ven todos al instante — «Restaurar catálogo original» revierte
        eso para todo el equipo, no solo para ti.
      </p>

      <h3>4. Resumen</h3>
      <p className="panel__texto">
        Totales por curso y por proyecto (HH DI/DG/SOP, subtotales por sección) y el estado de la cubicación
        (cuántas filas faltan por catalogar).
      </p>

      <h3>5. Cómo se calculan las horas de gestión</h3>
      <p className="panel__texto">
        Los siete cargos base —JP, y el Team Lead y el Senior de DI, DG y Soporte— no consumen catálogo: se calculan
        como un porcentaje de las horas de producción del proyecto, ajustado por su duración.
      </p>
      <p className="panel__formula">
        Horas de gestión = % del cargo × horas de producción × (0,56 + 0,44 × semanas ÷ 16)
      </p>
      <p className="panel__texto">
        Los porcentajes salen del modelo de estimación institucional, calibrado sobre un proyecto de 3.500 horas en
        16 semanas: JP 3,48 %, DI Senior 5,17 %, DI TL 1,26 %, DG Senior 1,80 %, DG TL 0,96 %, Soporte Senior
        1,80 %, Soporte TL 0,96 %. En total, 15,43 % de las horas de producción.
      </p>
      <p className="panel__texto">
        El ajuste por duración existe porque la gestión tiene dos partes: un 56 % que depende del tamaño del
        proyecto —arranque, arquitectura, piloto, implementación— y un 44 % que depende del calendario —comités,
        seguimiento, informes semanales—. A 16 semanas el ajuste vale 1 y no cambia nada; un proyecto de la misma
        envergadura pero de 32 semanas suma un 44 % más de gestión.
      </p>

      <h3>6. Acceso</h3>
      <p className="panel__texto">
        La clave de acceso es compartida por todo el equipo. La sesión queda guardada en el dispositivo hasta usar
        «Cerrar sesión» (al final de la página).
      </p>
    </section>
  );
}
