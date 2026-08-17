create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Los miembros ven suscripciones de su casa"
  on public.push_subscriptions;
drop policy if exists "Los miembros crean sus propias suscripciones"
  on public.push_subscriptions;
drop policy if exists "Los miembros actualizan sus propias suscripciones"
  on public.push_subscriptions;
drop policy if exists "Los miembros borran sus propias suscripciones"
  on public.push_subscriptions;

create policy "Los miembros ven suscripciones de su casa"
  on public.push_subscriptions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.household_members
      where household_members.household_id = push_subscriptions.household_id
        and household_members.user_id = auth.uid()
    )
  );

create policy "Los miembros crean sus propias suscripciones"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.household_members
      where household_members.household_id = push_subscriptions.household_id
        and household_members.user_id = auth.uid()
    )
  );

create policy "Los miembros actualizan sus propias suscripciones"
  on public.push_subscriptions
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.household_members
      where household_members.household_id = push_subscriptions.household_id
        and household_members.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.household_members
      where household_members.household_id = push_subscriptions.household_id
        and household_members.user_id = auth.uid()
    )
  );

create policy "Los miembros borran sus propias suscripciones"
  on public.push_subscriptions
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.household_members
      where household_members.household_id = push_subscriptions.household_id
        and household_members.user_id = auth.uid()
    )
  );
