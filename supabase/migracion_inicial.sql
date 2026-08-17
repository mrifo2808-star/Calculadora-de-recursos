-- Migracion inicial: catalogo de recursos compartido de la Calculadora WeLearn.
-- Correr UNA VEZ en Supabase -> SQL Editor -> New query -> pegar todo -> Run.
-- Es seguro volver a correrlo (usa IF NOT EXISTS / ON CONFLICT), no duplica filas.

create table if not exists public.catalogo_recursos (
  id text primary key,
  estado text not null check (estado in ('Validado', 'Pendiente', 'Historico')),
  tipo text not null,
  nombre_visible text not null,
  extension text not null default '',
  unidad text not null default '',
  di numeric,
  dg numeric,
  sop numeric,
  fuente text not null default '',
  observaciones text not null default '',
  actualizado_en timestamptz not null default now()
);

alter table public.catalogo_recursos enable row level security;

drop policy if exists "catalogo_select_autenticados" on public.catalogo_recursos;
create policy "catalogo_select_autenticados"
  on public.catalogo_recursos for select
  to authenticated
  using (true);

drop policy if exists "catalogo_insert_autenticados" on public.catalogo_recursos;
create policy "catalogo_insert_autenticados"
  on public.catalogo_recursos for insert
  to authenticated
  with check (true);

drop policy if exists "catalogo_update_autenticados" on public.catalogo_recursos;
create policy "catalogo_update_autenticados"
  on public.catalogo_recursos for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "catalogo_delete_autenticados" on public.catalogo_recursos;
create policy "catalogo_delete_autenticados"
  on public.catalogo_recursos for delete
  to authenticated
  using (true);

-- Mantiene actualizado_en al dia en cada UPDATE, sin depender de que el cliente lo mande.
create or replace function public.set_actualizado_en()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_catalogo_actualizado_en on public.catalogo_recursos;
create trigger trg_catalogo_actualizado_en
before update on public.catalogo_recursos
for each row execute function public.set_actualizado_en();

-- Datos iniciales: los 47 recursos vigentes de src/data/catalogo.ts al momento de esta
-- migracion (generados automaticamente, ver README de la seccion "Backend / Supabase").
insert into public.catalogo_recursos
  (id, estado, tipo, nombre_visible, extension, unidad, di, dg, sop, fuente, observaciones)
values
  ('Actividad|Actividad formativa Word|1 pag', 'Pendiente', 'Actividad', 'Actividad formativa Word', '1 pag', 'paginas', 0.75, null, null, 'O2027 Flujo por Recurso', 'DI=0:45h (guion word). Sin DG ni Sop porque es actividad de autoria docente sin produccion multimedia.'),
  ('Actividad|Actividad formativa Rise|1 ud', 'Validado', 'Actividad', 'Actividad formativa Rise', '1 ud', 'unidad', 0.75, 0.25, null, 'Wrike INACAP Diplomado (real)', 'Agregado tras revision Wrike (curso "Liderazgo organizacional estrategico", U1). Distinta de "Actividad formativa Word" (esta usa Rise, no Word). QA sin esfuerzo registrado en la muestra.'),
  ('Animacion|Animacion T1|1 min', 'Validado', 'Animacion', 'Animacion', '1 min', 'minutos', null, null, 0.2, 'v1.2 Catalogo + UCT', 'Solo Sop registrado. DI y DG con tiempo 0.'),
  ('Animacion|Animacion T2|2 min', 'Validado', 'Animacion', 'Animacion', '2 min', 'minutos', 2, 3.5, 0.3, 'v1.2 Catalogo + UCT', 'Tiempo consistente entre v1.2 y UCT Catalogo.'),
  ('Cuestionario|Evaluacion de modulo|20 preg', 'Historico', 'Cuestionario', 'Evaluacion de modulo', '20 preg', 'preguntas', 2, null, null, 'UCT Cubicacion-Full', 'Solo DI registrado (2h por 20 preguntas). DG y Sop en 0.'),
  ('Cuestionario|Evaluacion sumativa con IA|1 ud', 'Validado', 'Cuestionario', 'Evaluacion sumativa con IA', '1 ud', 'unidad', 2, null, 0.25, 'Wrike INACAP Diplomado (real)', 'Agregado tras revision Wrike. Instrumento elaborado con apoyo de IA; solo tiene DI (elaboracion, 2h) y un paso de ajuste posterior (0.25h) registrado como SOP. Sin DG separado en la muestra.'),
  ('Documento|Apunte|diagramacion', 'Validado', 'Documento', 'Apunte', 'diagramacion', 'documento', 0.5, 0.5, 0.5, 'Wrike UNAB (real)', 'Agregado tras revision Wrike (proyecto UNAB, U2/S2 Hito 2-3). Tipo "Documento" nuevo, no existia categoria similar en el catalogo previo.'),
  ('Imagen|Imagen Compleja|menor 4 form', 'Validado', 'Imagen', 'Imagen Compleja', 'menor 4 form', 'formatos', 0.5, 0.5, null, 'v1.2 Catalogo + UCT', 'Sin Sop (no pasa por QA).'),
  ('Interactivo|Dinamica Interactiva|1 ud', 'Validado', 'Interactivo', 'Dinamica Interactiva', '1 ud', 'unidad', 2.5, 4, 0.5, 'Wrike UNAB (real)', 'Agregado tras revision Wrike (proyecto UNAB, U2/S2 Hito 2-3). Tipo "Interactivo" nuevo, no existia categoria similar en el catalogo previo.'),
  ('Imagen|Imagen Simple|menor 2 form', 'Validado', 'Imagen', 'Imagen Simple', 'menor 2 form', 'formatos', 0.25, 0.5, null, 'v1.2 Catalogo + UCT', 'Sin Sop (no pasa por QA).'),
  ('Infografia|Infografia Interactiva|1 pag', 'Validado', 'Infografia', 'Infografia Interactiva', '1 pag', 'paginas', 1.5, 2, 0.5, 'v1.2 Catalogo + UCT', '—'),
  ('Infografia|Infografia Plana|1 pag', 'Validado', 'Infografia', 'Infografia Plana', '1 pag', 'paginas', 1, 1.5, 0.25, 'v1.2 Catalogo + UCT', '—'),
  ('Infografia+PDF|Infografia+PDF T1|1 pag', 'Validado', 'Infografia+PDF', 'Infografia+PDF', '1 pag', 'paginas', 1, 1.25, 0.25, 'v1.2 Catalogo + UCT', '—'),
  ('Infografia+PDF|Infografia+PDF T2|2 pag', 'Validado', 'Infografia+PDF', 'Infografia+PDF', '2 pag', 'paginas', 2, 2.5, 0.25, 'v1.2 Catalogo + UCT', '—'),
  ('Microjuego|Microjuego T1|5 sl', 'Validado', 'Microjuego', 'Microjuego', '5 sl', 'slides', 0.2, 0.35, 0.05, 'v1.2 Catalogo + UCT', '—'),
  ('Microjuego|Microjuego T2|10 sl', 'Validado', 'Microjuego', 'Microjuego', '10 sl', 'slides', 1, 1.75, 0.25, 'v1.2 Catalogo + UCT', '—'),
  ('Microjuego|Microjuego T3|15 sl', 'Validado', 'Microjuego', 'Microjuego', '15 sl', 'slides', 2, 3.5, 0.5, 'v1.2 Catalogo + UCT', '—'),
  ('Podcast|Podcast T1|3 min', 'Validado', 'Podcast', 'Podcast', '3 min', 'minutos', 2, 0.5, 0.083, 'v1.2 Catalogo + UCT', 'DI incluye solo guion breve (grabacion por docente).'),
  ('Podcast|Podcast T2|5 min', 'Validado', 'Podcast', 'Podcast T2', '5 min', 'minutos', null, 1, 0.167, 'v1.2 Catalogo + UCT', 'Sin DI (docente entrega audio directo).'),
  ('Podcast|Podcast T3|8 min', 'Validado', 'Podcast', 'Podcast T3', '8 min', 'minutos', null, 1, 0.25, 'v1.2 Catalogo + UCT', '—'),
  ('Podcast|Podcast T5|5 min', 'Validado', 'Podcast', 'Podcast T5', '5 min', 'minutos', null, 2.5, 0.33, 'v1.2 Catalogo + UCT', 'DG mayor por postproduccion compleja.'),
  ('Podcast|Podcast T8|8 min', 'Validado', 'Podcast', 'Podcast T8', '8 min', 'minutos', null, 3.5, 0.33, 'v1.2 Catalogo + UCT', '—'),
  ('PPT|PPT|slides', 'Pendiente', 'PPT', 'PPT', 'slides', 'slides', 1.5, null, null, 'O2027 Flujo por Recurso', 'Propuesto: DI=guion 1:30h DG=produccion 2:00h Sop=QA 0:15h. Priorizar validacion.'),
  ('Rise|Rise interactivo nativo + PDF (glosario)|conceptos', 'Historico', 'Rise', 'Rise interactivo nativo + PDF (glosario)', 'conceptos', 'conceptos', 0.5, null, 0.25, 'UCT Cubicacion-Full', 'Recurso de nicho (glosario).'),
  ('Rise|Rise mediatizacion + carga|5 pag', 'Validado', 'Rise', 'Rise mediatizacion + carga', '5 pag', 'paginas', 1.5, 1.5, 0.5, 'v1.2 Catalogo + UCT', 'Tiempos respaldados por historico UCT y P2026.'),
  ('Simulacion|Simulacion Storyline T1|5 sl', 'Validado', 'Simulacion', 'Simulacion Storyline', '5 sl', 'slides', 0.2, 0.35, 0.05, 'v1.2 Catalogo + UCT', 'Cambio de tipo no afecta tiempos.'),
  ('Simulacion|Simulacion Storyline T2|10 sl', 'Validado', 'Simulacion', 'Simulacion Storyline', '10 sl', 'slides', 1, 1.75, 0.25, 'v1.2 Catalogo + UCT', '—'),
  ('Simulacion|Simulacion Storyline T3|15 sl', 'Validado', 'Simulacion', 'Simulacion Storyline', '15 sl', 'slides', 2, 3.5, 0.5, 'v1.2 Catalogo + UCT', '—'),
  ('Storyline|Storyline T1|10 sl', 'Validado', 'Storyline', 'Storyline T1', '10 sl', 'slides', 0.2, 0.35, 0.05, 'v1.2 Catalogo + UCT', 'Extension referencia: 10 slides base.'),
  ('Storyline|Storyline T2|5 sl', 'Validado', 'Storyline', 'Storyline', '5 sl', 'slides', 1, 1.75, 0.25, 'v1.2 Catalogo + UCT', '—'),
  ('Storyline|Storyline T3|10 sl', 'Validado', 'Storyline', 'Storyline T3', '10 sl', 'slides', 2, 3.5, 0.5, 'v1.2 Catalogo + UCT', '—'),
  ('Storyline Int|Storyline Interactivo T1|5 sl', 'Validado', 'Storyline Int', 'Storyline Interactivo', '5 sl', 'slides', 2, 2, 0.5, 'v1.2 Catalogo + UCT', '—'),
  ('Storyline Int|Storyline Interactivo T2|10 sl', 'Validado', 'Storyline Int', 'Storyline Interactivo', '10 sl', 'slides', 2.5, 3.5, 0.5, 'v1.2 Catalogo + UCT', '—'),
  ('Video|Video After T1|1 min', 'Validado', 'Video', 'Video After', '1 min', 'minutos', 1.5, 2.05, 0.2, 'v1.2 Catalogo + UCT', '—'),
  ('Video|Video After T2|2 min', 'Validado', 'Video', 'Video After', '2 min', 'minutos', 2, 3.25, 0.3, 'v1.2 Catalogo + UCT', '—'),
  ('Video|Video After T3|3 min', 'Validado', 'Video', 'Video After', '3 min', 'minutos', 2.5, 4.5, 0.5, 'v1.2 Catalogo + UCT', '—'),
  ('Video|Video 2D|1 ud', 'Validado', 'Video', 'Video 2D', '1 ud', 'unidad', 1, 3, 0.5, 'Wrike UNAB (real)', 'Agregado tras revision Wrike (proyecto UNAB, U2/S2 Hito 2-3). Tiene ademas un paso "Ajuste" de 0.5h no capturado en el esquema DI/DG/SOP actual.'),
  ('Video|Capsula video Docente|1 ud', 'Validado', 'Video', 'Capsula video Docente', '1 ud', 'unidad', 0.25, 1, 0.5, 'Wrike UNAB (real)', 'Agregado tras revision Wrike (proyecto UNAB, U2/S2 Hito 2-3). DI atipico (0.25h "Revisar", no "Elaborar guion"): el docente entrega el video ya grabado.'),
  ('Video|Video caso aplicado|min', 'Pendiente', 'Video', 'Video caso aplicado', 'min', 'minutos', 2, null, null, 'O2027 Flujo por Recurso', 'Propuesto: DI=2:00h DG=3:00h Sop=0:30h. Presente en cursos INACAP (no en diplomados).'),
  ('Video|Video de contenido|3 min', 'Validado', 'Video', 'Video de contenido', '3 min', 'minutos', 2.5, 4, 0.5, 'O2027 Flujo por Recurso + Wrike P2026 (real)', 'Confirmado contra tarea real en Wrike (P2026 CGGE41, U1S1, "H3.8 Recurso Audiovisual - Video de contenido"): DI=2:30h DG=4:00h SOP=0:30h, identico a lo propuesto. Recurso central de curso INACAP.'),
  ('Video|Video de contenido (IA Fliki)|3 min', 'Pendiente', 'Video', 'Video de contenido (IA Fliki)', '3 min', 'minutos', null, 2.5, 0.5, 'Wrike INACAP Diplomado (real)', 'Detectado tras revision Wrike: mismo nombre que "Video de contenido" pero producido con herramienta de IA (Fliki), con DG notablemente menor (2.5h vs 4h) mas un paso extra "Ajuste DG" de 0.83h. No se confirma si amerita ser un recurso separado o es una anomalia puntual de este curso; queda Pendiente hasta que el equipo lo confirme. DI no capturado en la muestra.'),
  ('Video|Video animado|min', 'Validado', 'Video', 'Video animado', 'min', 'minutos', 2, 3, 0.5, 'Wrike P2026 (real)', 'Agregado tras revision Wrike: no existia en el catalogo. Tarea real "H3.3 Video animado" (P2026 CGGE41, U1S1): DI=2:00h DG=3:00h SOP=0:30h. Muestreado de un solo curso/semana; confirmar si se repite en otros cursos antes de fijar como tarifa definitiva.'),
  ('Video|Video Interactivo T1|1 min', 'Validado', 'Video', 'Video Interactivo', '1 min', 'minutos', 1.5, 3.55, 0.2, 'v1.2 Catalogo + UCT', 'DG mayor por interactividad.'),
  ('Video|Video Interactivo T2|2 min', 'Validado', 'Video', 'Video Interactivo', '2 min', 'minutos', 2, 4.75, 0.3, 'v1.2 Catalogo + UCT', '—'),
  ('Video|Video Interactivo T3|3 min', 'Validado', 'Video', 'Video Interactivo', '3 min', 'minutos', 2.5, 6, 0.5, 'v1.2 Catalogo + UCT', '—'),
  ('Video|Video introductorio|min', 'Pendiente', 'Video', 'Video introductorio', 'min', 'minutos', 1, null, null, 'O2027 Flujo por Recurso', 'Propuesto: DI=1:00h DG=2:00h Sop=0:15h. Exclusivo de Diplomados INACAP.'),
  ('Video|Video Synthesia T3|3 min', 'Validado', 'Video', 'Video Synthesia', '3 min', 'minutos', 2.5, 2, 0.5, 'v1.2 Catalogo + UCT', 'DG 1.5h menor que After T3 (4h). Diferencia validada.')
on conflict (id) do nothing;
