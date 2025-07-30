> Context: [Patient and program transfers KDD](/decisions/2022-12-12_patient_and_program_transfer.md)

# Patients and Sync

> This documents changes made in 2.7 to support patient sync between stores, with patient data being between v5 and v6 sync, and patient data not always present on the OMS Central server.

Patient sync is complex. Patients do not just belong to one store - they can be treated at multiple stores, and thus may have all of their related records synced between many sites. They can be created at any store, and also merged at any time!

Most patient records (e.g. enrolments, encounters...) are stored/synced via Legacy mSupply (v5 sync), but some (vaccination records) are stored in OMS Central server (v6 sync).

2.7 adds the requirement to sync vaccination records between stores.

The key issue here is that because patients can exist or be created in remote stores, or on Legacy mSupply, its possible for patient record not to exist on Open mSupply Central. This leads to reference constraint failures when vaccination data is pushed, or when adding patient visibility (see more below). The future v7 sync will aim to resolve this (proxy all OMS remote site records through OMS Central) but we are not there yet. Current use cases and resolution strategies are outlined below.

## 2.7 changes

- Adds patient fetch to OMS central
  - This adds `name_store_join` record between the patient and the store on the remote site (to keep track of which sites to sync vaccination records to)
  - This has a reference constraint to the `name_link`/`name` table - so patient `name` will need to exist on OMS Central server
- Adds patient `name_link_id` to vaccination changelogs (for sync out from OMS Central - should send vaccinations to all remote sites that have visibility for this name)
  - Changelog `name_link_id` has a reference constraint to `name_link` table - the patient `name` will need to exist on OMS Central server for this too
- Adds `patient_link_id` to vaccination records --> used to populate changelog `name_link_id`. See the migration for more details.

## Existing patients when migrating a site to 2.7

Existing OMS remote sites may have patients, which may have related vaccination records. (Immunisation Programs/Vaccination Card feature hasn't been deployed before 2.7, but we should treat the data as if it has, just in case.) The patient record may not exist on OMS Central.

- Add a migration, which creates changelog records for each patient and their name_store_joins
  - These changes will already sync to Legacy mSupply (source of truth for these tables)
  - We'll add push to OMS Central as well
  - OMS Central receives and upserts name_store_join and name/name_link records for these patients
- Constraints on OMS Central should then be met for pushed vaccination records, and we have the name_store_join (between patient and remote site) to know to where to sync vaccination records for this patient.
- However, now patient `name` could exist on OMS central, without its related records. It also wouldn't get updated via sync (as Legacy mSupply doesn't know to sync patient data to OMS Central). Would be a problem if a central store is used as a dispensary.
  - So, we add a central only processor - sees name record has been upserted, and looks up whether that patient is visible on the Central site. If not - call Legacy mSupply to add name_store_join between OMS Central and the patient. This ensures patient data is all synced correctly to OMS Central going forward.

> Note: ideally, patients wouldn't be visible for a store on OMS Central, unless specifically set up to be. OMS Central should have a mechanism where data can exist there, be synced there, without it being visible in any of its own stores. This should either be as a central "ghost store" (would also resolve any risk of a store being moved off of OMS Central), or resolved via the v7 sync (where all data is synced through OMS Central).

## Fetching Legacy mSupply patients

This applies where:

- Patient was created on Legacy mSupply site, hasn't been synced to any OMS sites yet
- Patient is on an OMS remote site, but that site hasn't yet upgraded to 2.7 (so hasn't been pushed to OMS Central)

Patient fetch calls the [link_patient_to_store mutation](/server/graphql/programs/src/queries/link_patient_to_store.rs), which makes a call to Legacy mSupply to add name_store_join between the patient and the calling store. This queues all the related patient records for the next time the remote site syncs.

It then calls OMS Central `name_store_join`, which tries to add the same `name_store_join` to OMS Central (so OMS Central can also keep track of patient visibilty.) If patient `name` doesn't yet exist on OMS Central, we first need to fetch it from Legacy, to meet `name_store_join` reference constraint.

- OMS Central then makes its own call to Legacy name_store_join endpoint, to add patient visibility to OMS Central site
- Triggers a sync cycle (OMS Central to Legacy) to receive the patient records
- Only after this is the name_store_join record for the remote store inserted, and success response to the remote site

Risks: the `link_patient_to_store` is a one time mutation, and can't be done in a transaction. If there are connection issues, we might end up with name_store_join added on Legacy, but not OMS Central. This would not be apparent to the end user, would prevent v6 patient records from syncing between sites. Would be hard to diagnose... what to do?

- Both central servers are on same server, if can connect to one, should be able to connect to both, and shouldn't be a connectivity risk between the two central servers. This can't be guaranteed in all cases though.

OMS Central stores would need to be running in dispensary mode, in order to receive the synced patient records.

## New patient created in OMS remote site

Creating a new patient on OMS remote site will create new name and name_store_join records. We sync this to both Legacy mSupply Central and OMS Central. All future records will have constraints met.

Central only processor will see the new name record, and check if the patient is visible on the Central site. If not, it will call Legacy mSupply to add name_store_join between OMS Central and the patient. This ensures patient data is all synced correctly to OMS Central going forward.

> WARNING: As of v2.7, patients created on OMS remote sites may not have all their data visible on OMS Central, due to a race condition as described in [this issue](https://github.com/msupply-foundation/open-msupply/issues/7686#issuecomment-2896499858). Should be resolved once sync v7 is introduced. In the meantime, we mandate that OMS Central is NOT used as a dispensary.

## Re-initialising a site

After above migrations, patient `name` and `name_link` records should exist on OMS Central server, vaccination changelogs should have correct `name_link_id` set, and `name_store_join` record for remote store to patient should exist. When site re-initialises, vaccination records should be included via name_store_join.

There is a small use case - remote site is upgraded 2.7, but re-initialised before syncing. If there are vaccination records, they will be orphaned. (Per point 3 of 2.7 Changes, on OMS central the vaccination changelogs wouldn't have name_link_id, so wouldn't get re-fetched on initialisation.) Given low likelihood of existing vaccination records, and of reinitialising before a sync, we can ignore this case.

## Patient merge

Has not been tested - and it should be. I think this would all be fine though, as long and correct patient link ID has been used everywhere.

## Moving stores between sites

Beyond the scope of this change - patients are associated with a store, but accessible to all stores on a site. E.g.

- Patient visible on store A (on Site 1, which also has store B)
- Store B can see the patient
- We move store A to Site 2
- Site 1 no longer an active store with that patient visible, so stops receiving updates via sync
- Store B still has existing patient records, but won't receive updates: impact - could be unaware of treatment given

Probably should constrain patient list by name_store_join.

Bigger concern would be moving store off of OMS Central. Could end up with stale patient data on OMS Central.
