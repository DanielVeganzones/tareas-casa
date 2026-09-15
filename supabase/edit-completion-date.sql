-- Permite que cualquier miembro de la casa corrija la fecha de un completado.
-- La aplicación solo actualiza completed_at; no cambia quién la realizó ni la tarea.

drop policy if exists "Los miembros editan los completados de su casa" on public.task_completions;

create policy "Los miembros editan los completados de su casa"
on public.task_completions for update to authenticated
using (private.can_access_task(task_id))
with check (private.can_access_task(task_id));
