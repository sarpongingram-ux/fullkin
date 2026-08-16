-- Fullkin — Mijlpalen / Levenslijn
--
-- De warme kern die alles verbindt: verjaardagen (automatisch uit born_on),
-- geboortes, afstuderen, huwelijken en diaspora-mijlpalen. De familie ziet wat
-- eraan komt en wat er net was, en kan met één klik een collecte of een moment
-- van erkenning starten. life_events bestond al (voor collectes); dit maakt het
-- zichtbaar en zelfstandig registreerbaar.

-- Meldingen mogen nu ook over een mijlpaal gaan.
alter type notification_kind add value if not exists 'mijlpaal';

-- ---------------------------------------------------------------------------
-- komende_verjaardagen — de eerstvolgende verjaardagen in mijn netwerk (levende
-- leden), binnen 60 dagen. Automatisch uit born_on; niets hoeft ingevoerd.
-- ---------------------------------------------------------------------------

create or replace function komende_verjaardagen()
returns table (
  person_id uuid, naam text, born_on date, volgende date, wordt int, dagen_tot int
)
language sql stable security definer set search_path = public as $$
  with net as (
    select network_id as id from persons where claimed_by = auth.uid() limit 1
  ),
  b as (
    select p.id, p.first_name || ' ' || p.last_name as naam, p.born_on,
      extract(month from p.born_on)::int as mo,
      extract(day from p.born_on)::int as dy
    from persons p
    where p.network_id = (select id from net)
      and p.born_on is not null and p.died_on is null
  ),
  c as (
    select id, naam, born_on,
      make_date(
        extract(year from current_date)::int, mo,
        case when mo = 2 and dy = 29 then 28 else dy end
      ) as dit_jaar
    from b
  ),
  d as (
    select id, naam, born_on,
      case when dit_jaar >= current_date then dit_jaar
        else (dit_jaar + interval '1 year')::date end as volgende
    from c
  )
  select id, naam, born_on, volgende,
    extract(year from age(volgende, born_on))::int as wordt,
    (volgende - current_date)::int as dagen_tot
  from d
  where volgende - current_date <= 60
  order by volgende;
$$;

revoke execute on function komende_verjaardagen() from public, anon;
grant execute on function komende_verjaardagen() to authenticated;

-- ---------------------------------------------------------------------------
-- mijlpalen_tijdlijn — de geregistreerde mijlpalen van mijn netwerk, met de
-- naam van de persoon en de eventueel gekoppelde collecte.
-- ---------------------------------------------------------------------------

create or replace function mijlpalen_tijdlijn()
returns table (
  id uuid, person_id uuid, naam text,
  kind life_event_kind, title text, occurs_on date, collection_id uuid
)
language sql stable security definer set search_path = public as $$
  select
    e.id, e.person_id, p.first_name || ' ' || p.last_name,
    e.kind, e.title, e.occurs_on, c.id
  from life_events e
  join persons p on p.id = e.person_id
  left join collections c on c.life_event_id = e.id
  where e.network_id in (select my_networks())
  order by e.occurs_on desc;
$$;

revoke execute on function mijlpalen_tijdlijn() from public, anon;
grant execute on function mijlpalen_tijdlijn() to authenticated;
