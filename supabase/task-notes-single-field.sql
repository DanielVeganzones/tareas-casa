-- Convierte las notas existentes a una única nota compartida por tarea.
-- Si ya había varias, se conservan juntas en el orden en que se crearon.
with latest_note as (
  select distinct on (task_id) id, task_id
  from public.task_notes
  order by task_id, created_at desc, id desc
), combined_notes as (
  select
    task_id,
    string_agg(body, E'\n\n' order by created_at asc, id asc) as body,
    max(updated_at) as updated_at
  from public.task_notes
  group by task_id
)
update public.task_notes note
set body = combined.body,
    updated_at = combined.updated_at
from latest_note latest
join combined_notes combined on combined.task_id = latest.task_id
where note.id = latest.id;

delete from public.task_notes note
using (
  select distinct on (task_id) id, task_id
  from public.task_notes
  order by task_id, created_at desc, id desc
) latest
where note.task_id = latest.task_id
  and note.id <> latest.id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'task_notes_task_id_key'
      and conrelid = 'public.task_notes'::regclass
  ) then
    alter table public.task_notes
      add constraint task_notes_task_id_key unique (task_id);
  end if;
end;
$$;

drop policy if exists "Cada autor edita sus notas" on public.task_notes;
drop policy if exists "Cada autor borra sus notas" on public.task_notes;
drop policy if exists "Los miembros editan las notas de su casa" on public.task_notes;
drop policy if exists "Los miembros borran las notas de su casa" on public.task_notes;

create policy "Los miembros editan las notas de su casa"
on public.task_notes for update to authenticated
using (private.can_access_task(task_id))
with check (private.can_access_task(task_id));

create policy "Los miembros borran las notas de su casa"
on public.task_notes for delete to authenticated
using (private.can_access_task(task_id));
