create or replace function public.start_familie(p_naam text, p_land text, p_voornaam text, p_achternaam text, p_stad text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare net uuid; pid uuid; room uuid;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn om een familie te starten.';
  end if;

  if exists (select 1 from persons where claimed_by = auth.uid()) then
    raise exception 'Je bent al onderdeel van een familie.';
  end if;

  if length(trim(coalesce(p_naam, ''))) = 0
     or length(trim(coalesce(p_voornaam, ''))) = 0
     or length(trim(coalesce(p_achternaam, ''))) = 0 then
    raise exception 'Vul de familienaam en je eigen naam in.';
  end if;

  insert into family_networks (name, home_country)
    values (trim(p_naam), nullif(trim(coalesce(p_land, '')), ''))
    returning id into net;

  insert into persons (network_id, first_name, last_name, city, claimed_by, created_by)
    values (
      net, trim(p_voornaam), trim(p_achternaam),
      nullif(trim(coalesce(p_stad, '')), ''), auth.uid(), auth.uid()
    )
    returning id into pid;

  insert into memberships (network_id, person_id, role)
    values (net, pid, 'co_founder');

  -- Familiechat + warm welkomstbericht
  insert into chat_rooms (network_id, type, name)
    values (net, 'familie', 'Familie ' || trim(p_naam))
    returning id into room;

  insert into chat_messages (room_id, sender_id, message_text, message_type)
    values (room, null,
      'Welkom in de familiechat. Dit is jullie eigen veilige ruimte — alleen voor familie. 💛',
      'systeem');

  return net;
end;
$function$;
