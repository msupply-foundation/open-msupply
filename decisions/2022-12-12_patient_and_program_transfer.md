# Patient and program transfers

- _Date_: 2022-12-12
- _Deciders_: Andrei, Clemens
- _Status_: Decided
- _Outcome_: Option 1

## Context

Patients and programs document need to be accessible at multiple stores.
This KDD tries to answer the following questions:

- How to search, access and edit patient across multiple stores?
- How to manage programs at multiple stores and transfer/sync programs between stores?
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
Thus, we need to be able to record the program store affiliation.
Potentially a program can be treated at multiple stores.
It's probably also useful to have a clinic transfer history.

There are three types of transfers:

- External in transfers: program transfer from an external clinic to mSupply
- External out transfers: program is not manage by mSupply any more
- Internal transfers, a program is transferred to a different store/clinic within mSupply

**Patient visit**
A patient might have a program encounter at another store.

Patient Visit Permissions:

- Required patient access during a visit should be minimal.
- Practitioner needs access to base patient information
- A visit should show up at the patient's clinic (and resets the "lost to follow up" status)

## Options

### Option 1

**Patient editing:**

- When changing a patient document the patient `name` is updated and pushed to central
- For this to work we need to allow client to edit patients at stores that are not the patient's home store.
  (Because there is no fixed store affiliation for programs)
- When opening a patient document, merge back potential changes from the `name` table to the patient document.
  This makes it possible to integrate edits of the patient's name table without help from the central server.

**Patient lookup/visibility/sync:**

- Mainly as done in current mSupply
- Patient documents are synced through the `name_store_join`, i.e. a patient's documents are synced to stores associated with the patient. (in omSupply just trigger sync to fetch patient document data?)

**Access permissions**
As all mSupply permissions, user program permissions are defined for a specific store.
This means a user can only access documents at a certain store when having the matching store permissions.

**Patient transfers**

To keep track of the current active store for a program a new `program_store_join` table is used.
For example (details to be worked out):

```typescript
{
  id: string,
  patient_id: string,
  program_id: string,
  store_id: string,
  // Primary store for this program (might not be needed?)
  is_main_store: boolean,
  // Row from where the patient has been transferred
  transfer_in_id?: string,
  // Details about external transfers
  transfer_in_external?: string,
  // transfer in time
  transfer_in_datetime: Date,
  // details columns about where the patient has been transferred
  transfer_out_id?: string,
  // Details about external transfers
  transfer_out_external?: string,
  // If set the row is "inactive" because the patients has been transferred out
  transfer_out_datetime?: Date,
}
```

This table can also be used to derive a transfer history.
Furthermore, this table can also be used to decide if further edits are allowed, e.g. if the patient has been transferred out and thus a program is "inactive" at a certain store.

**Patient visits**

Visits can be recorded in a special visiting programs.
This makes visits just normal programs and sync and permissions work the same as for any other program.

_Pros:_

- Document sync works similar to existing name_store_join related tables

_Cons:_

- All patient documents are synced when there is a `name_store_join` even if the documents are not needed, e.g. because no practitioner at the store has access to any of those documents.

### Option 2

This option aims to solve the problem from Option1, i.e. that documents are synced without being needed at the receiving store.

The central server syncs documents based on the `program_store_join` table.
To check if user has program access for the current store a link must exist:
`user -> user_store_join -> program_store_join (not transferred out) -> program`

## Decision (Option 1)

Option 2 can be implemented if needed or if sync overhead becomes a problem.
