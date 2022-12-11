# Patient and program transfers

- _Date_: 2022-12-12
- _Deciders_:
- _Status_:
- _Outcome_:

## Context

Patients and programs document need to be accessible at multiple stores.
This KDD tries to answer the following questions:

- How to search, access and edit patient across multiple stores?
- How to manage programs at multiple stores and transfer programs between stores?
- How to manage program permission for different stores?

**Summary of existing mSupply patient editing**:

- Patients are only editable on the home store
- Only patients from the `name` table can be edited (other names can't be edited). Note, patient push needs to be implemented in omSupply.
- The patient's home store is identified in the `name` table by the `supplying_store_id` column
- Its currently not directly supported to change a patient's home store

**Summary of existing mSupply patient search and patient visibility**:

- The endpoint `/patient-search` looks up all patients on central (no access control). The endpoint returns all patient information for a found patient.
- The client can choose a patient and call `/nsj` to request a new `name_store_join` in order to make the patient visible in a store.
- The client doesn't wait for sync but directly stores the fetched `name` and `name_store_join` records (client might receive entries again through sync)
- patient is now visible on the store and syncs to the store (because of the `name_store_join`)

**Transfer Programs Requirements**
In general, a patient can have a list of programs and each program can be treated at different stores/clinic.
A patient may change the clinic where the program is treated.
Thus we need to be able to record the program store affiliation.
Potentially a program can be treated at multiple stores(?).
Its probably also useful to have a clinic transfer history.

There are three types of transfers:

- External in transfers: program transfer from an external clinic to mSupply
- External out transfers: program is not manage by mSupply anymore
- Internal transfers, a program is transferred to a different store/clinic within mSupply

**Patient visit**
A patient might have a program encounter at another store.
To be clarified first:

- user at visited store doesn't has access to the program data?
- user can add a program encounter but not access other patient program and encounter data?

## Options

### Option 1

**Patient editing:**

- When changing a patient document the patient `name` is updated and pushed to central
- For this to work we need to allow client to edit patients at stores that are not the patient's home store (?). (Because there is no fixed store affiliation for programs)
- When opening a patient document, merge back potential changes from the `name` table to the patient document.This makes it possible to integrate edits of the patient's name table without help from the central server.

**Patient lookup/visibility:**

- Mainly as done in current mSupply
- Patient documents are synced through the `name_store_join` (in omSupply just trigger sync to fetch patient document data?)

**Program clinic join:**

To keep track which programs are associated with a store introduce a new `program_store_join` table with the columns:

- id
- program_id
- patient_id
- store_id
- from (details columns about the previous clinic)
- from_datetime (transfer time)
- to (details columns about where the patient has been transferred)
- to_datetime (if set the row is is "inactive" because the patients has been transferred out)
- sync_type (future work: e.g. `FULL_SYNC | SHALLOW_SYNC` where SHALLOW_SYNC just )

The central server syncs documents based on the `program_store_join` table.

By keeping rows for clinics where the patient has been transferred out we have the full transfer history.

**Access permissions**
A user can access program documents when the program is at a store the user has access too (through `user_store_join`)

To check if user has program access for the current store a link must exist:
`user -> user_store_join -> program_store_join (not transferred out) -> program`

### Option 2

Open for suggestions
