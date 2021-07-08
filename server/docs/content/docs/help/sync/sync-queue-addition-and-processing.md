+++
title = "Sync queue"
description = "Sync queue addition & processing"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 30
sort_by = "weight"
template = "docs/page.html"

[extra]
lead = "Sync queue"
toc = true
top = false
+++

# Sync queue table

Table name: sync_out

| Field                | Type         | Index         |  Notes         |
|----------------------|--------------|-----------|-----------|
| created_at_timestamp | Date         |    |     |
| id                   | UUID        |    |     |
| record_id            | Alpha        |  yes  |    |
| sequence             | Long Integer |    |     |
| store_id             | Alpha        |    |     |
| table_name           | Long Integer |    |     |
| site_id              | Long Integer |    |     |
| action               | Alpha        |    |One of "Update" "Insert" "Delete" "Patch"   |
| data               | JSONb        |    | If this is a patch, contains an hashmap of field changes  |

# Sync queue insertion
## For remote servers
* A trigger on all tables marked as remote data performs insertion in the sync queue
* Existing sync_out records can't be upserted as there can be a condition where the data for the existing record has already been sent to the server
* Special case for patients (i.e. name records whose `type = patient` ): The trigger writes out field-level changes to a sync_out.data as a JSON array of key/value pairs.

## For central servers
* Most central data tables are handled by central_change_log
* The following situations are handled by using a sync queue on the central server
  * A finalised customer invoice (table: transact, type: "customer_invoice", status: "finalised" name_id: <is the id of a store> ) is received.
    * A sync_out is created for this customer invoice. sync_out.site_id is set to the site_id of the store belonging to transact.name_id
  * A name_store_join is modified/created/deleted:
    * A sync_out is created for this name_store_join. `sync_out.site_id` is set to the site_id of the store belonging to `name_store_join.store_id`
  * An item_store_join is modified/created/deleted:
    * A sync_out is created for this item_store_join. `sync_out.site_id` is set to the site_id of the store belonging to `name_store_join.store_id`

# Sync queue processing

  * the frequency of processing is set in a preference, as is the number of records to send at a time (`NumRecords`) (this can be set dynamically on the fly if you prefer, based on speed of processing- see code in mSupply mobile repo that does this)
  * a background schedule kicks off processing according to the preference setting

## Push

  1. Prune the queue for duplicate `record_id` values
  2. Order records so that trans_line records are before transaction (Potential to send transaction with trans_lines at this point?)
  3. Loop through `NumRecords` and:
    * Find the original record using `sync_out.table_name` & `sync_out.record_id`
    * Serialise to JSON (see format on *sync endpoints* page )
    * Add each record's data to a JSON array
  4. Send the data to the central server.

## Pull

TODO: Error states?
* What if change log record fails to integrate?
* What if sync queue record fails to integrate/does not acknowledge?

There are 2 endpoints for pulling records from the central server. Preferably, pull

### Change log

Change log

1. Request records
2. Integrate records (upsert)
3. Repeat until up to date

### Sync queue

These are the queued records relating your site. It includes things such as incoming transfers from other sites and configuration data for this site.

1. Request records from the central server
2. Integrate records
  * Insert, update and delete do as you might expect!
  * Merge needs to start the merge process [LINK]
  * Messages can trigger a variety of procedures that must be implemented [LINK]
3. Acknowledge records successfully integrated
4. Repeat until the queue is empty
