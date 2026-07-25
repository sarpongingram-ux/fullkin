-- Fullkin — Security hardening n.a.v. Supabase advisor
--
-- 1. De views collection_contributors/collection_totals draaiden als SECURITY
--    DEFINER en bypasten daarmee ALLE RLS — ook de netwerkgrens. Een ingelogde
--    gebruiker kon zo totalen van een vreemd netwerk opvragen. Vervangen door
--    functies die eerst controleren of de collecte in een eigen netwerk valt.
-- 2. RLS op de referentietabel event_suggestions.
-- 3. search_path pinnen op alle functies.
-- 4. anon execute intrekken op de helpers.

drop view if exists collection_contributors;
drop view if exists collection_totals;

create or replace function collection_contributors(col uuid)
returns table (
  contributor_id uuid, first_name text, last_name text,
  photo_url text, hide_name boolean, message text, paid_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    case when c.hide_name then null else c.contributor_id end,
    case when c.hide_name then null else p.first_name end,
    case when c.hide_name then null else p.last_name end,
    case when c.hide_name then null else p.photo_url end,
    c.hide_name, c.message, c.paid_at
  from contributions c
  join persons p on p.id = c.contributor_id
  where c.collection_id = col
    and c.status = 'betaald'
    and c.collection_id in (
      select id from collections where network_id in (select my_networks())
    );
$$;

create or replace function collection_total(col uuid)
returns table (total_cents bigint, contributor_count int)
language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(c.amount_cents) filter (where c.status = 'betaald'), 0)::bigint,
    count(*) filter (where c.status = 'betaald')::int
  from contributions c
  where c.collection_id = col
    and col in (
      select id from collections where network_id in (select my_networks())
    );
$$;

alter table event_suggestions enable row level security;
create policy suggestions_read on event_suggestions for select
  to authenticated using (true);

alter function siblings_of(uuid)            set search_path = public;
alter function ancestors_of(uuid, int)      set search_path = public;
alter function descendants_of(uuid, int)    set search_path = public;
alter function relation_label(uuid, uuid)   set search_path = public;
alter function family_map(uuid)             set search_path = public;
alter function family_stats(uuid)           set search_path = public;
alter function compute_split(int)           set search_path = public;
