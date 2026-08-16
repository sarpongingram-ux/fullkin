-- Fullkin — Fase 3: De Stem (sectie 7.6)
--
-- Juni. De familie nomineert bewust één persoon, met één zin waarom. Alle
-- actieve leden stemmen anoniem. De meest gekozen persoon wint — erkenning en
-- warmte, geen toeval. De winnaar krijgt een speciale collecte van de familie.

create type stem_status as enum ('open', 'afgerond');

create table stem_rounds (
  id               uuid primary key default gen_random_uuid(),
  network_id       uuid not null references family_networks(id),
  year             int not null,
  status           stem_status not null default 'open',
  winner_person_id uuid references persons(id),
  created_at       timestamptz not null default now(),
  decided_at       timestamptz,
  unique (network_id, year)
);

create table stem_nominations (
  id                uuid primary key default gen_random_uuid(),
  round_id          uuid not null references stem_rounds(id) on delete cascade,
  nominee_person_id uuid not null references persons(id),
  nominated_by      uuid not null references persons(id),
  reason            text not null,
  created_at        timestamptz not null default now(),
  unique (round_id, nominee_person_id)
);
create index on stem_nominations (round_id);

create table stem_votes (
  id            uuid primary key default gen_random_uuid(),
  round_id      uuid not null references stem_rounds(id) on delete cascade,
  nomination_id uuid not null references stem_nominations(id) on delete cascade,
  voter_id      uuid not null references persons(id),
  created_at    timestamptz not null default now(),
  unique (round_id, voter_id)   -- één stem per persoon per ronde
);
create index on stem_votes (nomination_id);

alter table stem_rounds      enable row level security;
alter table stem_nominations enable row level security;
alter table stem_votes       enable row level security;

create policy sr_read on stem_rounds for select
  using (network_id in (select my_networks()));

create policy sn_read on stem_nominations for select
  using (round_id in (select id from stem_rounds where network_id in (select my_networks())));
create policy sn_write on stem_nominations for insert
  with check (
    nominated_by = me()
    and round_id in (select id from stem_rounds where network_id in (select my_networks()))
  );

-- Stemmen: je ziet alleen je eigen stem (anoniem). Tellingen via stem_uitslag.
create policy sv_read_own on stem_votes for select using (voter_id = me());
create policy sv_write on stem_votes for insert
  with check (
    voter_id = me()
    and round_id in (select id from stem_rounds where network_id in (select my_networks()))
  );

-- ---------------------------------------------------------------------------
-- stem_ronde — geeft de ronde van dit jaar voor mijn netwerk (maakt aan als
-- die nog niet bestaat).
-- ---------------------------------------------------------------------------

create or replace function stem_ronde()
returns stem_rounds
language plpgsql security definer set search_path = public as $$
declare net uuid; jaar int; r stem_rounds;
begin
  select network_id into net from persons where claimed_by = auth.uid() limit 1;
  if net is null then raise exception 'Geen netwerk gevonden'; end if;
  jaar := extract(year from now())::int;
  select * into r from stem_rounds where network_id = net and year = jaar;
  if not found then
    insert into stem_rounds (network_id, year) values (net, jaar) returning * into r;
  end if;
  return r;
end;
$$;

revoke execute on function stem_ronde() from public, anon;
grant execute on function stem_ronde() to authenticated;

-- ---------------------------------------------------------------------------
-- stem_uitslag — nominaties met stemtellingen (anoniem) + je eigen stem.
-- ---------------------------------------------------------------------------

create or replace function stem_uitslag(p_round uuid)
returns table (
  nomination_id uuid, nominee_id uuid, nominee_naam text,
  reason text, stemmen int, mijn_stem boolean
)
language sql stable security definer set search_path = public as $$
  select
    n.id, n.nominee_person_id, p.first_name || ' ' || p.last_name, n.reason,
    (select count(*) from stem_votes v where v.nomination_id = n.id)::int,
    exists (select 1 from stem_votes v where v.nomination_id = n.id and v.voter_id = me())
  from stem_nominations n
  join persons p on p.id = n.nominee_person_id
  where n.round_id = p_round
    and n.round_id in (select id from stem_rounds where network_id in (select my_networks()))
  order by (select count(*) from stem_votes v where v.nomination_id = n.id) desc, n.created_at;
$$;

revoke execute on function stem_uitslag(uuid) from public, anon;
grant execute on function stem_uitslag(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- sluit_stem — sluit de ronde: de meest gekozen genomineerde wint. Alleen een
-- Co-Founder sluit de stemming.
-- ---------------------------------------------------------------------------

create or replace function sluit_stem(p_round uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare net uuid; win uuid;
begin
  select network_id into net from stem_rounds where id = p_round;
  if net is null then raise exception 'Ronde niet gevonden'; end if;
  if not has_role(net, 'co_founder') then
    raise exception 'Alleen een Co-Founder sluit de stemming';
  end if;

  select n.nominee_person_id into win
  from stem_nominations n
  where n.round_id = p_round
  order by (select count(*) from stem_votes v where v.nomination_id = n.id) desc, n.created_at
  limit 1;

  update stem_rounds
    set status = 'afgerond', winner_person_id = win, decided_at = now()
    where id = p_round;
  return win;
end;
$$;

revoke execute on function sluit_stem(uuid) from public, anon;
grant execute on function sluit_stem(uuid) to authenticated;
