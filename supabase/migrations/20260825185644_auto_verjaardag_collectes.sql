create extension if not exists pg_cron;

-- Maakt automatisch een cadeaupot voor elk LEVEND familielid met een naderende
-- verjaardag (binnen p_dagen). Idempotent: één pot per verjaardag-editie. Ronde
-- verjaardagen (18, 21, veelvouden van 10) krijgen een hogere suggestie.
create or replace function public.maak_verjaardag_collectes(p_dagen int default 14)
returns int language plpgsql security definer set search_path to 'public' as $$
declare
  r record; ev uuid; keeper uuid; room uuid; sugg int;
  volgende date; wordt int; is_rond boolean; titel text; kind_use life_event_kind;
  aantal int := 0;
begin
  for r in
    select p.id, p.network_id, p.first_name, p.born_on
    from persons p
    where p.died_on is null and p.born_on is not null
  loop
    -- Eerstvolgende verjaardag vanaf vandaag (interval clampt 29 feb netjes).
    volgende := (r.born_on + make_interval(years =>
      extract(year from current_date)::int - extract(year from r.born_on)::int))::date;
    if volgende < current_date then
      volgende := (r.born_on + make_interval(years =>
        extract(year from current_date)::int - extract(year from r.born_on)::int + 1))::date;
    end if;

    continue when volgende > current_date + make_interval(days => p_dagen);

    -- Al een pot voor déze verjaardag-editie? Dan overslaan.
    if exists (
      select 1 from collections c
      join life_events le on le.id = c.life_event_id
      where c.beneficiary_id = r.id
        and le.kind in ('verjaardag','ronde_verjaardag')
        and le.occurs_on = volgende
    ) then continue; end if;

    wordt := extract(year from age(volgende, r.born_on))::int;
    is_rond := (wordt > 0 and wordt % 10 = 0) or wordt in (18, 21);
    kind_use := (case when is_rond then 'ronde_verjaardag' else 'verjaardag' end)::life_event_kind;
    select suggested_cents into sugg from event_suggestions where kind = kind_use;
    titel := 'Verjaardag ' || r.first_name || ' 🎂';

    -- Starter: de keeper van de familie, anders de jarige zelf.
    select m.person_id into keeper from memberships m
      where m.network_id = r.network_id and m.role = 'co_founder' and m.revoked_at is null
      limit 1;
    if keeper is null then keeper := r.id; end if;

    insert into life_events (network_id, person_id, kind, title, occurs_on, created_by)
      values (r.network_id, r.id, kind_use, titel, volgende, keeper)
      returning id into ev;

    insert into collections
      (network_id, life_event_id, beneficiary_id, title, suggested_cents, status, closes_at, started_by)
      values (r.network_id, ev, r.id, titel, coalesce(sugg, 200), 'open',
              (volgende + interval '3 days')::timestamptz, keeper);

    -- Kondig het aan in de familiechat (zichtbaar zetje om mee te doen).
    select id into room from chat_rooms
      where network_id = r.network_id and type = 'familie' order by created_at limit 1;
    if room is not null then
      insert into chat_messages (room_id, sender_id, message_text, message_type)
      values (room, null,
        '🎂 ' || r.first_name || ' is binnenkort jarig! Doe mee aan de cadeaupot.',
        'systeem');
    end if;

    aantal := aantal + 1;
  end loop;
  return aantal;
end;
$$;
revoke all on function public.maak_verjaardag_collectes(int) from public, authenticated, anon;
