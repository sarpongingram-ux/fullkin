-- Fullkin — De voordeur: een nieuwe familie starten
--
-- Tot nu toe kon je alleen een BESTAANDE familie binnenkomen via een
-- uitnodiging. Er was geen manier om de eerste familie aan te maken (de
-- Sarpong-testfamilie is met SQL geseed). Deze functie is de voordeur: een
-- ingelogde gebruiker maakt een netwerk, wordt de eerste persoon én de
-- Co-Founder — in één transactie. SECURITY DEFINER, want een nieuwe gebruiker
-- is nog van geen enkel netwerk lid, dus de RLS-insertpolicies zouden dit
-- anders blokkeren.

create or replace function start_familie(
  p_naam text,
  p_land text,
  p_voornaam text,
  p_achternaam text,
  p_stad text
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare net uuid; pid uuid;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn om een familie te starten.';
  end if;

  -- Eén gebruiker hoort bij één persoon (claimed_by is uniek). Wie al een
  -- familie heeft, start er geen tweede.
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

  return net;
end;
$$;

revoke execute on function start_familie(text, text, text, text, text) from public, anon;
grant execute on function start_familie(text, text, text, text, text) to authenticated;
