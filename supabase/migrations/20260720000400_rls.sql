-- Fullkin — Row Level Security
--
-- Uitgangspunt: je ziet alleen je eigen familienetwerk, en binnen dat netwerk
-- zie je nooit wat iemand heeft bijgedragen.

-- ---------------------------------------------------------------------------
-- Hulpfuncties
-- ---------------------------------------------------------------------------

-- Welke persoon ben ik in dit systeem?
create or replace function me()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from persons where claimed_by = auth.uid() limit 1;
$$;

-- Tot welke netwerken heb ik toegang? (Eigen profiel + profielen die ik beheer.)
create or replace function my_networks()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct network_id from persons
  where claimed_by = auth.uid()
     or managed_by in (select id from persons where claimed_by = auth.uid());
$$;

create or replace function has_role(net uuid, r family_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    join persons p on p.id = m.person_id
    where m.network_id = net and m.role = r and m.revoked_at is null
      and p.claimed_by = auth.uid()
  );
$$;

alter table family_networks   enable row level security;
alter table persons           enable row level security;
alter table relationships     enable row level security;
alter table contact_states    enable row level security;
alter table contact_log       enable row level security;
alter table memberships       enable row level security;
alter table invites           enable row level security;
alter table life_events       enable row level security;
alter table collections       enable row level security;
alter table contributions     enable row level security;
alter table transaction_splits enable row level security;

-- ---------------------------------------------------------------------------
-- Netwerk en personen
-- ---------------------------------------------------------------------------

create policy net_read on family_networks for select
  using (id in (select my_networks()));

create policy persons_read on persons for select
  using (network_id in (select my_networks()));

-- Iedereen mag familie toevoegen. Zo groeit de kaart vanzelf.
create policy persons_insert on persons for insert
  with check (network_id in (select my_networks()));

-- Je bewerkt jezelf, of iemand wiens profiel jij beheert (opa zonder telefoon).
create policy persons_update on persons for update
  using (
    claimed_by = auth.uid()
    or managed_by = me()
    or has_role(network_id, 'co_founder')
  );

-- Geen delete-policy op persons. Dat is opzet.

-- ---------------------------------------------------------------------------
-- Relaties
-- ---------------------------------------------------------------------------

create policy rel_read on relationships for select
  using (network_id in (select my_networks()));

create policy rel_insert on relationships for insert
  with check (network_id in (select my_networks()));

-- Geen update, geen delete. Een verkeerd ingevoerde relatie wordt door een
-- Co-Founder gecorrigeerd via een aparte, gelogde procedure — niet stilletjes.

-- ---------------------------------------------------------------------------
-- Contactstatus — hier zit de menselijke kant van de Wet van Fullkin
-- ---------------------------------------------------------------------------

create policy contact_read on contact_states for select
  using (network_id in (select my_networks()));

-- Je mag alleen de afstand instellen tussen jou en iemand anders. Niet tussen
-- twee andere mensen. Niemand mag voor een ander bepalen wie er stil is.
create policy contact_write on contact_states for insert
  with check (me() in (person_a, person_b));

create policy contact_change on contact_states for update
  using (me() in (person_a, person_b));

create policy log_read on contact_log for select
  using (me() in (person_a, person_b));

create policy log_write on contact_log for insert
  with check (me() in (person_a, person_b));

-- ---------------------------------------------------------------------------
-- Rollen en uitnodigingen
-- ---------------------------------------------------------------------------

create policy memberships_read on memberships for select
  using (network_id in (select my_networks()));

create policy memberships_write on memberships for insert
  with check (has_role(network_id, 'co_founder'));

create policy invites_read on invites for select
  using (network_id in (select my_networks()));

create policy invites_write on invites for insert
  with check (network_id in (select my_networks()) and invited_by = me());

-- ---------------------------------------------------------------------------
-- Collectes
-- ---------------------------------------------------------------------------

create policy events_read on life_events for select
  using (network_id in (select my_networks()));

create policy events_write on life_events for insert
  with check (network_id in (select my_networks()));

create policy collections_read on collections for select
  using (network_id in (select my_networks()));

-- Een collecte starten mag de Co-Founder, de Events Manager, of iemand voor
-- zijn eigen directe familie.
create policy collections_write on collections for insert
  with check (
    network_id in (select my_networks())
    and started_by = me()
    and (has_role(network_id, 'co_founder') or has_role(network_id, 'events_manager')
         or beneficiary_id in (
              select person_id from family_map(me())
              where label in ('ouder','kind','partner','broer of zus')
            )
         or beneficiary_id = me())
  );

create policy collections_update on collections for update
  using (
    started_by = me()
    or has_role(network_id, 'co_founder')
    or has_role(network_id, 'events_manager')
  );

-- ---------------------------------------------------------------------------
-- Bijdragen — de anonimiteitsregel
--
-- Dit is de belangrijkste policy in de applicatie. Een SELECT op contributions
-- geeft alleen je eigen rijen terug. Er is geen manier waarop een familielid
-- het bedrag van een ander leest, ook niet via een join of een aggregatie.
--
-- De familie leest bijdragen van anderen uitsluitend via de views
-- collection_contributors (namen) en collection_totals (som).
-- ---------------------------------------------------------------------------

create policy contributions_read_own on contributions for select
  using (contributor_id = me());

create policy contributions_write_own on contributions for insert
  with check (
    contributor_id = me()
    and collection_id in (
      select id from collections
      where network_id in (select my_networks()) and status = 'open'
    )
  );

-- Bedragen worden nooit door de client bijgewerkt. Alleen de Stripe-webhook,
-- die met de service role draait en RLS omzeilt, zet status op 'betaald'.

-- De views draaien met de rechten van de eigenaar (security_invoker = false),
-- dus ze omzeilen bovenstaande policy bewust — maar ze selecteren het bedrag
-- niet. Toegang beperken we tot ingelogde gebruikers.
revoke all on collection_contributors from anon, authenticated;
revoke all on collection_totals       from anon, authenticated;
grant select on collection_contributors to authenticated;
grant select on collection_totals       to authenticated;

-- ---------------------------------------------------------------------------
-- Verdeling — leesbaar voor wie eraan verdient
-- ---------------------------------------------------------------------------

create policy splits_read on transaction_splits for select
  using (
    has_role(network_id, 'co_founder') or has_role(network_id, 'pot_beheerder')
  );
