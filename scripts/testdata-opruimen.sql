-- Fullkin: testdata opruimen.
-- Verwijdert alle personen die NIET verbonden zijn met jouw profiel (Ingram),
-- inclusief bijbehorende gegevens en relaties. Je echte familie (12 personen)
-- blijft volledig staan. Draai dit in de Supabase SQL Editor.
--
-- Veilig: alles gebeurt in één transactie. Klopt de telling onderaan niet
-- (bijv. minder dan 12 personen over), draai dan NIET door — meld het.

begin;

create temp table doomed on commit drop as
with recursive verbonden as (
  select '594b9de3-de6a-4d3b-b938-cfa765d9cfcc'::uuid as pid   -- Ingram
  union
  select case when r.from_person = v.pid then r.to_person else r.from_person end
  from verbonden v
  join relationships r on r.from_person = v.pid or r.to_person = v.pid
)
select id from persons where id not in (select pid from verbonden);

delete from album_comments   where person_id in (select id from doomed);
delete from album_reactions  where person_id in (select id from doomed);
delete from album_tags       where person_id in (select id from doomed) or tagged_by in (select id from doomed);
delete from album_items      where uploaded_by in (select id from doomed);
delete from business_votes   where voter_id in (select id from doomed);
delete from business_questions where asker_id in (select id from doomed);
delete from business_dreams  where person_id in (select id from doomed);
delete from contributions    where contributor_id in (select id from doomed);
delete from collections      where beneficiary_id in (select id from doomed) or started_by in (select id from doomed);
delete from contact_log      where person_a in (select id from doomed) or person_b in (select id from doomed);
delete from contact_states   where person_a in (select id from doomed) or person_b in (select id from doomed) or set_by in (select id from doomed);
delete from dreams           where person_id in (select id from doomed);
delete from invites          where invited_by in (select id from doomed) or person_id in (select id from doomed);
delete from life_events      where person_id in (select id from doomed) or created_by in (select id from doomed);
delete from memberships      where person_id in (select id from doomed);
delete from notifications    where actor_person_id in (select id from doomed) or recipient_person_id in (select id from doomed);
delete from payout_accounts  where person_id in (select id from doomed);
delete from pot_ledger       where person_id in (select id from doomed);
delete from pot_subscriptions where person_id in (select id from doomed);
delete from rad_draws        where recipient_person_id in (select id from doomed) or winner_person_id in (select id from doomed);
delete from stem_nominations where nominee_person_id in (select id from doomed) or nominated_by in (select id from doomed);
delete from stem_votes       where voter_id in (select id from doomed);
delete from stem_rounds      where winner_person_id in (select id from doomed);

alter table relationships disable rule relationships_no_delete;
delete from relationships where from_person in (select id from doomed) or to_person in (select id from doomed);
alter table relationships enable rule relationships_no_delete;

update persons set managed_by = null where managed_by in (select id from doomed);
delete from persons where id in (select id from doomed);

commit;

-- Controle: hoort ~12 personen te zijn.
select (select count(*) from persons)       as personen_over,
       (select count(*) from relationships) as relaties_over;
