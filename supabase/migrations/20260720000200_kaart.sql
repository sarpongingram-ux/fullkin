-- Fullkin — De afgeleide familiekaart
create or replace function siblings_of(p uuid)
returns table (person_id uuid, shared_parents int)
language sql stable as $$
  select mine.to_person, count(*)::int
  from relationships me
  join relationships mine
    on mine.from_person = me.from_person
   and mine.kind = 'parent'
  where me.to_person = p
    and me.kind = 'parent'
    and mine.to_person <> p
  group by mine.to_person;
$$;

create or replace function ancestors_of(p uuid, max_depth int default 6)
returns table (person_id uuid, generations int)
language sql stable as $$
  with recursive up as (
    select from_person as person_id, 1 as generations
    from relationships where kind = 'parent' and to_person = p
    union all
    select r.from_person, up.generations + 1
    from up
    join relationships r on r.kind = 'parent' and r.to_person = up.person_id
    where up.generations < max_depth
  )
  select person_id, min(generations)::int from up group by person_id;
$$;

create or replace function descendants_of(p uuid, max_depth int default 6)
returns table (person_id uuid, generations int)
language sql stable as $$
  with recursive down as (
    select to_person as person_id, 1 as generations
    from relationships where kind = 'parent' and from_person = p
    union all
    select r.to_person, down.generations + 1
    from down
    join relationships r on r.kind = 'parent' and r.from_person = down.person_id
    where down.generations < max_depth
  )
  select person_id, min(generations)::int from down group by person_id;
$$;

create or replace function relation_label(me uuid, other uuid)
returns text
language plpgsql stable as $$
declare
  up_gen int; down_gen int;
begin
  if me = other then return 'jij'; end if;

  if exists (
    select 1 from relationships
    where kind = 'partner'
      and ((from_person = me and to_person = other)
        or (from_person = other and to_person = me))
  ) then
    return 'partner';
  end if;

  select generations into up_gen from ancestors_of(me) where person_id = other;
  if up_gen is not null then
    return case up_gen
      when 1 then 'ouder' when 2 then 'grootouder' when 3 then 'overgrootouder'
      else repeat('over', up_gen - 2) || 'grootouder' end;
  end if;

  select generations into down_gen from descendants_of(me) where person_id = other;
  if down_gen is not null then
    return case down_gen
      when 1 then 'kind' when 2 then 'kleinkind' when 3 then 'achterkleinkind'
      else repeat('achter', down_gen - 2) || 'kleinkind' end;
  end if;

  select a.generations, b.generations into up_gen, down_gen
  from ancestors_of(me) a
  join ancestors_of(other) b on a.person_id = b.person_id
  order by a.generations + b.generations, abs(a.generations - b.generations)
  limit 1;

  if up_gen is null then return 'familie'; end if;

  if up_gen = down_gen then
    return case up_gen
      when 1 then 'broer of zus'
      when 2 then 'neef of nicht'
      else 'achterneef of achternicht' end;
  end if;

  if up_gen > down_gen then
    return case
      when down_gen = 1 and up_gen = 2 then 'oom of tante'
      when down_gen = 1 then 'oudoom of oudtante'
      else 'neef of nicht' end;
  end if;

  return case
    when up_gen = 1 and down_gen = 2 then 'neef of nicht'
    else 'achterneef of achternicht' end;
end;
$$;

create or replace function family_map(me uuid)
returns table (
  person_id uuid, first_name text, last_name text, city text, country text,
  photo_url text, is_claimed boolean, label text, status contact_status,
  last_contact timestamptz
)
language sql stable as $$
  select
    p.id, p.first_name, p.last_name, p.city, p.country, p.photo_url,
    p.claimed_by is not null,
    relation_label(me, p.id),
    coalesce(cs.status, 'verbonden'::contact_status),
    (select max(occurred_at) from contact_log cl
      where cl.person_a = least(me, p.id) and cl.person_b = greatest(me, p.id))
  from persons p
  left join contact_states cs
    on cs.person_a = least(me, p.id)
   and cs.person_b = greatest(me, p.id)
  where p.network_id = (select network_id from persons where id = me)
    and p.id <> me;
$$;

create or replace function family_stats(me uuid)
returns table (total int, known int, silent int, out_of_touch int)
language sql stable as $$
  select
    count(*)::int,
    count(*) filter (where status = 'verbonden' and last_contact is not null)::int,
    count(*) filter (where status = 'stil')::int,
    count(*) filter (
      where last_contact is null or last_contact < now() - interval '1 year'
    )::int
  from family_map(me);
$$;
