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

      <h3>2. Gestión del proyecto</h3>
      <p className="panel__texto">
        Cargos fijos del proyecto (JP, GE, TLs, etc.), separados de la producción. Ajusta Cantidad, Frecuencia y HH
        unitarias directamente — no dependen del catálogo de recursos.
      </p>

      <h3>3. Cubicación</h3>
      <p className="panel__texto">
        Por cada tarea: elige <strong>Tipo</strong> y luego <strong>Recurso</strong> (el recurso ya incluye la
        duración/extensión, ej. «Video After — 1 min»). Si el Tipo tiene un solo recurso válido se autocompleta. Sin
        selección completa, la fila queda <span className="pill pill--pendiente">PENDIENTE DE CATALOGAR</span> y no
        suma horas. Usa «+ Agregar fila» para sumar recursos en cualquier sección.
      </p>
      <p className="panel__texto">
        Cada etapa (las secciones de Cubicación e igual «Gestión del proyecto») tiene un interruptor «Etapa activa» /
        «Etapa desactivada» en su encabezado. Un curso que no necesita, por ejemplo, Implementación o Demostración
        puede desactivar esa etapa completa: sus recursos dejan de sumar horas en Resumen y en el Excel exportado, sin
        perder los datos — se pueden reactivar en cualquier momento.
      </p>
      <p className="panel__texto">
        Dentro de una etapa activa, cada fila tiene además su propio interruptor pequeño (al final de la fila, junto a
        «✕»): desactiva una sola fila sin desactivar toda la etapa. La fila queda visible pero atenuada y no suma
        horas; en el Excel exportado se mantiene con la columna <strong>Activa = No</strong> para dejar registro de
        que existió pero se excluyó del cálculo.
      </p>

      <h3>4. Catálogo</h3>
      <p className="panel__texto">
        Solo los recursos <span className="pill pill--ok">Validado</span> son seleccionables en Cubicación;{' '}
        <span className="pill pill--vacia">Pendiente</span>/<span className="pill pill--vacia">Histórico</span>{' '}
        quedan como referencia. El catálogo se sincroniza en vivo para todo el equipo: si descargas el Excel, lo
        corriges y lo vuelves a cargar, el cambio lo ven todos al instante — «Restaurar catálogo original» revierte
        eso para todo el equipo, no solo para ti.
      </p>

      <h3>5. Resumen</h3>
      <p className="panel__texto">
        Totales por curso y por proyecto (HH DI/DG/SOP, subtotales por sección) y el estado de la cubicación
        (cuántas filas faltan por catalogar).
      </p>

      <h3>6. Acceso</h3>
      <p className="panel__texto">
        La clave de acceso es compartida por todo el equipo. La sesión queda guardada en el dispositivo hasta usar
        «Cerrar sesión» (al final de la página).
      </p>
    </section>
  );
}
