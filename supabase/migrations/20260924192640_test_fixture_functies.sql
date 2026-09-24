-- Test-fixtures: bouwen/opruimen van de deterministische Carter-testfamilie.
-- Afgeschermd tot netwerken met naam 'TEST — …' en alleen voor service_role.

create or replace function public.verwijder_testnetwerk(p_net_naam text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare net uuid;
begin
  if p_net_naam not like 'TEST — %' then
    raise exception 'Alleen TEST-netwerken mogen zo verwijderd worden.';
  end if;
  select id into net from family_networks where name = p_net_naam;
  if net is null then return; end if;
  delete from person_links
    where person_a in (select id from persons where network_id = net)
       or person_b in (select id from persons where network_id = net);
  alter table relationships disable rule relationships_no_delete;
  delete from relationships where network_id = net;
  alter table relationships enable rule relationships_no_delete;
  delete from persons where network_id = net;
  delete from family_networks where id = net;
end $$;

create or replace function public.laad_testfamilie(p_net_naam text)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare net uuid;
begin
  if p_net_naam not like 'TEST — %' then
    raise exception 'Testfamilie-naam moet met "TEST — " beginnen.';
  end if;
  perform verwijder_testnetwerk(p_net_naam);
  insert into family_networks (name, home_country) values (p_net_naam, 'UK') returning id into net;
  insert into persons (network_id, first_name, last_name, birth_name, born_on) values
    (net,'George','Carter',null,'1940-03-02'),(net,'Helen','Carter','Adams','1942-07-15'),
    (net,'Daniel','Carter',null,'1965-01-20'),(net,'Michael','Carter',null,'1967-11-05'),
    (net,'Sarah','Wilson','Carter','1970-09-30'),(net,'Anita','Carter','Brown','1966-05-12'),
    (net,'Sophia','Carter','Green','1968-02-18'),(net,'Peter','Wilson',null,'1969-06-24'),
    (net,'Linda','Brown',null,'1966-08-08'),(net,'James','Carter',null,'1990-04-10'),
    (net,'Rebecca','Carter',null,'1992-12-01'),(net,'Tom','Carter',null,'1988-03-03'),
    (net,'Michelle','Carter',null,'1991-10-22'),(net,'David','Carter',null,'1994-07-07'),
    (net,'Emma','Wilson',null,'1996-01-14'),(net,'Nadia','Carter','Osei','1991-02-02'),
    (net,'Leah','Carter',null,'2018-05-19');
  insert into relationships (network_id, kind, origin, from_person, to_person)
  select net,'partner','biological',least(a.id,b.id),greatest(a.id,b.id)
  from (values ('George','Carter','Helen','Carter'),('Daniel','Carter','Anita','Carter'),
      ('Michael','Carter','Sophia','Carter'),('Sarah','Wilson','Peter','Wilson'),
      ('James','Carter','Nadia','Carter')) v(f1,l1,f2,l2)
    join persons a on a.network_id=net and a.first_name=v.f1 and a.last_name=v.l1
    join persons b on b.network_id=net and b.first_name=v.f2 and b.last_name=v.l2;
  insert into relationships (network_id, kind, origin, from_person, to_person)
  select net,'parent','biological',p.id,c.id
  from (values ('George','Carter','Daniel','Carter'),('Helen','Carter','Daniel','Carter'),
      ('George','Carter','Michael','Carter'),('Helen','Carter','Michael','Carter'),
      ('George','Carter','Sarah','Wilson'),('Helen','Carter','Sarah','Wilson'),
      ('Daniel','Carter','James','Carter'),('Anita','Carter','James','Carter'),
      ('Daniel','Carter','Rebecca','Carter'),('Anita','Carter','Rebecca','Carter'),
      ('Daniel','Carter','Tom','Carter'),('Linda','Brown','Tom','Carter'),
      ('Michael','Carter','Michelle','Carter'),('Sophia','Carter','Michelle','Carter'),
      ('Michael','Carter','David','Carter'),('Sophia','Carter','David','Carter'),
      ('Sarah','Wilson','Emma','Wilson'),('Peter','Wilson','Emma','Wilson'),
      ('James','Carter','Leah','Carter'),('Nadia','Carter','Leah','Carter')) v(pf,pl,cf,cl)
    join persons p on p.network_id=net and p.first_name=v.pf and p.last_name=v.pl
    join persons c on c.network_id=net and c.first_name=v.cf and c.last_name=v.cl;
  return net;
end $$;

revoke execute on function public.verwijder_testnetwerk(text) from public, anon, authenticated;
revoke execute on function public.laad_testfamilie(text) from public, anon, authenticated;
grant execute on function public.verwijder_testnetwerk(text) to service_role;
grant execute on function public.laad_testfamilie(text) to service_role;
