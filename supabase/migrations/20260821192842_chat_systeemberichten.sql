-- Plaatst een systeembericht in de familiechat van een netwerk. Faalt nooit
-- hard: een mislukt chatbericht mag de onderliggende actie niet breken.
create or replace function chat_systeembericht(
  p_net uuid, p_text text, p_type chat_message_type, p_ref uuid
) returns void
language plpgsql security definer set search_path = public
as $$
declare room uuid;
begin
  select id into room from chat_rooms
    where network_id = p_net and type = 'familie' limit 1;
  if room is null then return; end if;
  insert into chat_messages (room_id, sender_id, message_text, message_type, reference_id)
    values (room, null, p_text, p_type, p_ref);
exception when others then
  null;
end $$;

-- Nieuw familielid (iemand claimt zijn profiel / treedt toe).
create or replace function trg_chat_nieuw_lid() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if OLD.claimed_by is null and NEW.claimed_by is not null then
      perform chat_systeembericht(
        NEW.network_id,
        '👋 ' || NEW.first_name || ' heeft zich aangesloten bij de familie. Welkom!',
        'systeem', null);
    end if;
  exception when others then null;
  end;
  return NEW;
end $$;
drop trigger if exists chat_nieuw_lid on persons;
create trigger chat_nieuw_lid after update on persons
  for each row execute function trg_chat_nieuw_lid();

-- Collecte gestart (waar dan ook aangemaakt) -> collecte-kaartje in de chat.
create or replace function trg_chat_collecte() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    perform chat_systeembericht(
      NEW.network_id, coalesce(NEW.title, 'Nieuwe collecte'),
      'collecte_link', NEW.id);
  exception when others then null;
  end;
  return NEW;
end $$;
drop trigger if exists chat_collecte on collections;
create trigger chat_collecte after insert on collections
  for each row execute function trg_chat_collecte();

-- Droom bereikt (status wordt 'vervuld').
create or replace function trg_chat_droom() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if NEW.status = 'vervuld' and OLD.status is distinct from 'vervuld' then
      perform chat_systeembericht(
        NEW.network_id,
        '🌟 ' || coalesce((select first_name from persons where id = NEW.person_id), 'Een familielid')
          || ' heeft de droom bereikt: ' || coalesce(NEW.title, '')
          || '. De familie heeft dit mogelijk gemaakt.',
        'systeem', null);
    end if;
  exception when others then null;
  end;
  return NEW;
end $$;
drop trigger if exists chat_droom on dreams;
create trigger chat_droom after update on dreams
  for each row execute function trg_chat_droom();

-- Rad-winnaar bekend.
create or replace function trg_chat_rad() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if NEW.winner_person_id is not null
       and (TG_OP = 'INSERT' or OLD.winner_person_id is null) then
      perform chat_systeembericht(
        NEW.network_id,
        '🎡 ' || coalesce((select first_name from persons where id = NEW.winner_person_id), 'Een familielid')
          || ' heeft het Rad gewonnen! Gefeliciteerd van de hele familie.',
        'systeem', null);
    end if;
  exception when others then null;
  end;
  return NEW;
end $$;
drop trigger if exists chat_rad on rad_draws;
create trigger chat_rad after insert or update on rad_draws
  for each row execute function trg_chat_rad();
