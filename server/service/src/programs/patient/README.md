> Context: [Patient and program transfers KDD](/decisions/2022-12-12_patient_and_program_transfer.md)

# Patients and Sync

> Maybe this should be another KDD - but this documents changes made in 2.7 to support patient sync between stores, with patient data being between v5 and v6 sync, and patient data not always present on the OMS Central server.

Patient sync is complex. Patients do not just belong to one store - they can be treated at multiple stores, and thus may have all of their related records synced between many sites. They can be created at any store, and also merged at any time!

Most patient records (e.g. enrolments, encounters...) are stored/synced via Legacy mSupply (v5 sync), but some (at the time of writing, vaccination records) are stored in OMS Central server (v6 sync).

2.7 adds the requirement to sync vaccination records between stores.

The key issue here is that because patients can exist or be created in remote stores, or on Legacy mSupply, Open mSupply Central not know about them. This leads to reference constraint failures when vaccination data is pushed, or when adding patient visibility (see more below). The future v7 sync will aim to resolve this (proxy all OMS remote site records through OMS Central) but we are not there yet. Current use cases and resolution strategies are outlined below.

## 2.7 changes

- Adds patient fetch to OMS central
  - This adds `name_store_join` record between the patient and the store on the remote site (to keep track of which sites to sync vaccination records to)
  - This has a reference constraint to the `name_link`/`name` table - so these records will need to exist on OMS Central server
- Adds patient `name_link_id` to vaccination changelogs (for sync out from OMS Central - should send vaccinations to all remote sites that have visibility for this name)
  - Changelog `name_link_id` has a reference constraint to `name_link` table - the name link/name records will need to exist on OMS Central server for this too
- Adds `patient_link_id` to vaccination records --> used to populate changelog `name_link_id`. Strategy is:
  - OMS Central upgrades to 2.7. All existing vaccination changelogs will have `name_link_id` = null (i.e. wouldn't be synced out from OMS Central (see [changelog](/server/repository/src/db_diesel//changelog/changelog.rs) outgoing sync and patient sync queries))
  - Remote site upgrades to 2.7, applies migration which populates `patient_link_id` for each vaccination. Creates changelogs, so updated vaccination records sync to OMS Central. The resulting changelogs created there _will_ have the `name_link_id` populated, so vaccination records will be fetchable/sync-able from then on.

## Existing patients when migrating a site to 2.7

Existing OMS remote sites may have patients, which may have related vaccination records. (Immunisation Programs/Vaccination Card feature hasn't been deployed before 2.7, but we should treat the data as if it has, just in case.) The patient record may not exist on OMS Central.

- Add a migration, which creates changelog records for each patient and their name_store_joins
  - These changes will sync to Legacy mSupply (source of truth for these tables) but we'll also sync them to OMS Central
  - OMS Central can create name_store_join, name, and name_link records for these patients, if they don't already exist on OMS Central
- We ensure name and name_store_join are pull dependencies of vaccination records, so these definitely exist on OMS central before it integrations the vaccination records.
- Constraints on OMS Central should then be met for pushed vaccination records, and we have the name_store_join record to know to sync future vaccination records to the all remote sites that have visibility for this patient.

## Legacy mSupply patients

This applies where:

- Patient was created on Legacy mSupply site, hasn't been synced to any OMS sites yet
- Patient is on an OMS remote site, but that site hasn't yet upgraded to 2.7 (so as far as Central OMS is aware, patient doesn't exist, and only exists on Legacy mSupply)

Patient fetch calls the [link_patient_to_store mutation](/server/graphql/programs/src/queries/link_patient_to_store.rs), which makes a call to Legacy mSupply to add name_store_join between the patient and the calling store. This queues all the related patient records for the next time the remote site syncs.

It then calls OMS Central `name_store_join`, which adds the same `name_store_join` to OMS Central (so OMS Central can also keep track of patient visibilty.) However, `name_store_join` requires name/name_link to exist on OMS Central, and we realise at this point that it does not yet.

- OMS Central then makes its own call to Legacy name_store_join endpoint, to add patient visibility for itself (a store on central server)
- It then triggers a sync cycle (OMS Central to Legacy) to receive the name record for this patient
- Only after this is the name_store_join record for the remote store inserted, and success response to the remote site

Risks: the `link_patient_to_store` is a one time mutation, and can't be done in a transaction. If there are connection issues, we might end up with name_store_join added on Legacy, but not OMS Central. This would not be apparent to the end user, would prevent v6 patient records from syncing between sites. Would be hard to diagnose... TODO?

- Both central servers are on same server, if can connect to one, should be able to connect to both, and shouldn't be a connectivity risk between the two central servers. This can't be guaranteed in all cases though.

## Re-initialising a site

After above migrations, patient `name` and `name_link` records should exist on OMS Central server, vaccination changelogs should have correct `name_link_id` set, and `name_store_join` record for remote store to patient should exist. When site re-initialises, vaccination records should be included via name_store_join.

There is a small use case - remote site is upgraded 2.7, but re-initialised before syncing. If there are vaccination records, they will be orphaned. (Per point 3 of 2.7 Changes, on OMS central the vaccination changelogs wouldn't have name_link_id, so wouldn't get re-fetched on initialisation.) Given low likelihood of existing vaccination records, and of reinitialising before a sync, we can ignore this case.

## New patient created in OMS remote site

Creating a new patient on OMS remote site will create new name and name_store_join records. We sync this to both Legacy mSupply Central and OMS Central. All future records will have constraints met.

We should probably ensure OMS Central adds its own name_store_join for the new patient, for if patient is merged etc.

## Patient merge

Has not been tested - and it should be. I think this would all be fine though, as long and correct patient link ID has been used everywhere.
