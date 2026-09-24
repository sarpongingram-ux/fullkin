-- ============================================================================
-- FULLKIN — deterministische TEST-familie "Carter"
-- ----------------------------------------------------------------------------
-- Laadt (of reset) de Carter-testfamilie via de gedeelde fixture-functie, zodat
-- seed én geautomatiseerde tests exact dezelfde data gebruiken.
--
-- ⚠️  Draai ALLEEN op een staging/branch-database — nooit op productie met echte
--     families. Zie TESTING_SETUP.md. Resetbaar: opnieuw draaien = verse seed.
--
-- Structuur (17 personen, 3 generaties): George+Helen → Daniel+Anita,
-- Michael+Sophia, Sarah(+Peter); Gen 3: James+Nadia→Leah, Rebecca, Tom (halfbroer
-- via Daniel+Linda), Michelle, David, Emma. Bevat gewijzigde achternaam, maiden
-- name, half-sibling en een former partner (Daniel ↔ Linda, kind=former_partner).
--
-- Dekt: parent, child, sibling, half-sibling, grandparent, grandchild,
-- great-grandparent, uncle/aunt, cousin, partner.
-- ============================================================================

select public.laad_testfamilie('TEST — Carter') as netwerk_id;

-- Verwijderen:  select public.verwijder_testnetwerk('TEST — Carter');
