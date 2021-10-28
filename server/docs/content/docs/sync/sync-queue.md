+++
title = "Sync Queue"
	description = "Sync Quapieue"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 53
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++

## Key concepts

The sync queue functions as a FIFO (first-in-first-out) queue of `sync_out` records, each of which represents an insert, update or delete operation performed on remote and a subset of central data.

Each `sync_out` record has the following fields:

| Field                | Type      | Index  |  Notes                                        |
|----------------------|-----------|--------|-----------------------------------------------|
| created_at_timestamp | `date`    |        |                                               |
| id                   | `uuid`    |        |                                               |
| record_id            | `varchar` | B-tree |                                               |
| sequence             | `integer` |        |                                               |
| store_id             | `varchar` |        |                                               |
| table_name           | `integer` |        |                                               |
| site_id              | `integer` |        |                                               |
| action               | `varchar` |        | "Update", "Insert", "Delete" or "Patch".      |
| data                 | `jsonb`   |        | Hashmap of field changes for "Patch" records. |

## Inserting

- Central server
  * Most central data tables are handled by central_change_log, with the exception of incoming transfers and site configuration data, e.g.:
	* When a `invoice` representing a finalised outbound shipment is pushed from a remote site, a `sync_out` record is created for the `invoice`, where `sync_out.site_id` is the `site_id` for the store linked to `invoice.name_id`.
    * When a `name_store_join` record is created, updated or deleted, a corresponding `sync_out` record is created, where `sync_out.site_id` is set to the `site_id` for the `store` with `store.id = name_store_join.store_id`.
	* When an `item_store_join` record is created, updated or deleted, a corresponding `sync_out` record is created, where `sync_out.site_id` is set to the `site_id` for the `store` with `store.id = name_store_join.store_id`.

- Remote servers
  * All tables categorised as remote data have a trigger which creates a corresponding `sync_out` record for every insertion, update and deletion performed on that table.
  * Triggers do not update existing `sync_out` records. This is to prevent race-conditions where a `sync_out` record is updated after is has already been sent to the server.
  * Patient data records (i.e. name records where `name.type = patient`) are a special case of remote data. In the instance where a patient `name` record is updated, the `sync_out`trigger writes out field-level changes to a sync_out.data as a JSON array of key/value pairs.

## Processing

* In the context of remote sync, processing the queue refers to pushing `sync_out` records to the central server.
* The sync queue is processed on a periodic schedule, with `sync_out` records pushed in batches.
* Both period frequency and batch size are defined as preferences. If batch size is not specified, it is calculated on-the-fly according to the following formula:

<a href="https://www.codecogs.com/eqnedit.php?latex=\dpi{100}&space;\fn_cm&space;\small&space;\texttt{batch\_size}&space;=&space;\min&space;\left&space;(&space;\max&space;\left&space;(&space;\left&space;\lfloor&space;\frac{\texttt{optimal\_duration\_per\_batch}}{\texttt{actual\_duration\_per\_record}}&space;\right&space;\rfloor,&space;\texttt{min\_batch\_size}&space;\right&space;),&space;\texttt{max\_batch\_size}&space;\right&space;)" target="_blank"><img src="https://latex.codecogs.com/gif.latex?\dpi{100}&space;\fn_cm&space;\small&space;\texttt{batch\_size}&space;=&space;\min&space;\left&space;(&space;\max&space;\left&space;(&space;\left&space;\lfloor&space;\frac{\texttt{optimal\_duration\_per\_batch}}{\texttt{actual\_duration\_per\_record}}&space;\right&space;\rfloor,&space;\texttt{min\_batch\_size}&space;\right&space;),&space;\texttt{max\_batch\_size}&space;\right&space;)" title="\small \texttt{batch\_size} = \min \left ( \max \left ( \left \lfloor \frac{\texttt{optimal\_duration\_per\_batch}}{\texttt{actual\_duration\_per\_record}} \right \rfloor, \texttt{min\_batch\_size} \right ), \texttt{max\_batch\_size} \right )" /></a>

where, `optimal_duration_per_batch = 5`, `min_batch_size = 10`, `max_batch_size = 500`.

<!-- TODO: specify the default period frequency -->
<!-- TODO: `OPTIMAL_SYNC_DURATION_PER_BATCH` seems arbitrary, should this be configurable? -->


## Pushing

* The following psuedo-code describes the algorithm for pushing from the sync queue to the central server:

```
Prune duplicate record_ids from sync_queue
Order sync_out records by created_at_timestamp and table_name*
For batch_size records:
  Lookup record in sync_out.table_name with sync_out.record_id
  Serialise record to JSON**
  Push serialised record to batch
Send batch to central server
```

*Secondary ordering by `sync_out.table_name` ensures that child records are sent before parents (e.g. `trans_line` records send before `invoice` records`)
*See [Sync API]('api') for JSON format.

## Pulling

* The following psuedo-code describes the algorithm for pulling from the central server sync queue:

```
Repeat while sync_queue is not empty:
  Request n records from the central server
  Integrate records into persistent storage:
    Insert, update, delete according to sync_out.action*
    Process any messages
  Send acknowledgement to central server
```

*This step may require merging records, see [Advanced Sync](../advanced/#merging).

<!-- TODO: what happens if sync queue record fails to integrate or does not acknowledge -->
<!-- TODO: how are messages represented in sync_out records -->
