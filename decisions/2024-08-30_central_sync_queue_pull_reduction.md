# Central Sync Queue Pull Reduction

- _Date_: 2024-09-02
- _Deciders_: @Chris-Petty, @andreievg, @jmbrunskill
- _Status_: PENDING??
- _Outcome_: Do other optimisations for now

## Context

Open mSupply Remote (OMR) on initialisation pulls records from the Legacy mSupply Central Server (LCS) sync v5 queued records endpoint and change log endpoint, followed by pulling from Open mSupply Central Server (OMCS) sync v6 change log.

For many centrally controlled records, the source remains LCS change log. On some big system the change log has a lot of records, many of which may not be necessary for the remote site to operate. For instance a new site with a small master list and few customers and 1 supplier e.g. a rural heath post. These needed records might only be in the 100s. Meanwhile the broader system might have many more records the change log, for one real life example all the tables that have over 1000 records in central_change_log:

| Table                 | count     |
| --------------------- | --------- |
| list_master_line      | 43443     |
| name                  | 32753     |
| item                  | 7358      |
| list_master_name_join | 5252      |
| abbreviation          | 2328      |
| list_local_line       | 1438      |
| store                 | 1289      |
| **Total**             | **93861** |

That's over 90k records for a store that quite likely strictly only needs 100s, though broad strokes probably easier to say syncing all items is a given (too expensive to filter and safely maintain referential integrity in synced data). If we got it from ~90k down to ~10k that's a near 90% reduction - that'd make a huge difference to rural facilities on bad connections trying to (re)initialise in the field. Currently a common consequence is having to travel with the hardware to somewhere with robust internet, potentially removing the device from the facility it is needed for several days.

It'd also reduce TMF having to explain to end users why so many records are syncing for a fresh site and store!

For the purposes of this KDD we'll focus on reducing the volume of list_master_lines. I believe there are few FKs to list_master_lines, so simple filtering isn't likely to be problematic. list_masters definitely do have FKs, so filtering would require ensuring all FK constraints for the records (invoices, requisitions, stocktakes, invoice_lines, requisition_lines...) of the site are satisfied.

### Tables

#### LCS: sync_out

| field     | type    |
| --------- | ------- |
| ID        | alpha   |
| type      | alpha   |
| table_num | integer |
| record_id | alpha   |
| site ID   | integer |
| sequence  | integer |
| store_id  | alpha   |

#### LCS: central_change_log

| field     | type                 |
| --------- | -------------------- |
| ID        | int (auto increment) |
| tableName | alpha                |
| recordId  | alpha                |
| action    | alpha                |

Note no filtering options base on site/store/name

#### OMCS: changelog

| field          | type                                                   |
| -------------- | ------------------------------------------------------ |
| cursor         | BigInt                                                 |
| table_name     | crate::db_diesel::changelog::ChangelogTableNameMapping |
| record_id      | Text                                                   |
| row_action     | crate::db_diesel::changelog::RowActionTypeMapping      |
| name_link_id   | Nullable<Text>                                         |
| store_id       | Nullable<Text>                                         |
| is_sync_update | Bool                                                   |
| source_site_id | Nullable<Integer>                                      |

Note can filter based on site(ish)/store/name. Bonus note: not obvious how to filter central data by store/name.

### Additional info

Older versions of sync just used sync queue mechanism. Master lists were filtered down in queuing to only go to sites where that master list was used by a store and master lists that were visible to their customers and suppliers. Or so was the intent at some point - just checking the code it's a bit clapped and appears to send all master lists everywhere in the queue, then for each store re-queues masters lists that are used by active stores and visible stores/names (redundantly, due to everything already being in the queue). In regular activities, any update to any master list goes to all sites.

This could obviously be improved to actually only queue necessary updates to necessary sites.

Remember that OMS uses master lists for item visibility, while Legacy mSupply uses item_store_joins which are made to match their master list based visibility control (backlog task to potentially change this in LCS, probably move to OMS sooner 😉).

One feature that (I'm not sure is implemented in OMS), is to help prevent users from issue stock to customers who shouldn't receive it. For customer mSupply stores, this is items that aren't on their master lists, so are not visible.

## Options

### Option 1 - LCS improve queuing filter and move master lists back to queue rather than change log

This would be contentious, as a key driver for the change log was to prevent spamming the `sync_out` table with updates every time you update a master list, so moving it back to the queue would be coming full circle heh. Some of our bigger users have >1000 sites, so every line touched _could_ require upserting >1000 sync_out records. central_change_log could bring that down to 1 upsert (if all sites were OMR).

But also would work. We could make master list queued data again and improving queuing with filtering to only send updates to where they need to go. This would fix the initialisation problem and also improve legacy mSupply performance.

_Pros:_

- Should improve sync performance over all, including UX on legacy central servers for users doing admin. (There is merit to fixing the master list queuing filtering on LCS regardless of where this KDD goes!)
- Fixes the problem for existing sites all versions of OMS and legacy apps.

_Cons:_

- Still potentially queuing lots of records to many sites. Some users will have >1000 sites and a general master list used across them with >5000 items. These instances will still suffer millions of queued records that central_change_log set out to fix to begin with!
- Eventually we want OMS only deployments where OMS controls central data, so a solution in LCS land would require us eventually fixing it again in OMCS land.
- Doing work in LCS when we're trying to focus on OMS

### Option 2 - LCS central_change_log filtering per log processed

We implement a system that allows sync v5 change log requests to have some filtering on the LCS side.

Suppose a site requests 5000 change_log records from cursor 0:

1. If the change_log record is for a list_master_line,
2. Get all the list_master.ID values for lists that are visible to the site; that is from list_master_name_join for all stores (this can be done once for the request and reused in the process, or cached between requests to reduce querying overheads)
3. Get the list_master_line record
4. If the list_master_line.master_list_id is **not** in that set, skip this change log record.

_Pros:_

- Stay in changelog land and don't queue loads of records

_Cons:_

- Still looks like 90k records to pull, even if large amounts get filtered out.
- If 5000 records are requested and we filter out some (or all) of them, do we scan ahead to grab some more records till the batch size is fulfilled (and continuing until done)? Probably negligible but none the less a slower.
- Added overhead to getting records
- If they actually need all of the master list lines, it's more overhead doing filtering for no reason. Can probably optimise this case though.
- Doing work in LCS when we're trying to focus on OMS
- Eventually we want OMS only deployments where OMS controls central data, so a solution in LCS land would require us eventually fixing it again in OMCS land.
- Only fixes for OMS

### Option 3 - OMCS change_log filtering per log processed

The filtering could be more or less the same as in Option 2, but we do it in OMCS. Go full hog: We change to OMCS changelog pull and drop pulling LCS changelog.

_Pros:_

- Stay in changelog land and don't queue loads of records
- Simplify sync progress in OMS, going from 3 steps back to 2 steps (just pull queued from sync v5, pull changelog from sync v6)
- Future proof solution for the ages

_Cons:_

- Maybe not all records on sync v6 could come through? I don't see why that wouldn't be possible
- Only fixes for OMS

### Option 4 - OMCS change_log filter based on change_log.parent_id

When master list line records are added to the changelog, we include a `parent_id` (could crudely use store_id for non-store records...)

When records are requested, we do some potentially hefty filtering based on `parent_id` being in the master lists of the requesting site. Not sure how to do this without conditional logic in the SQL, which sounds painful.

OR we do similar to the previous solutions 2 an 3 but much faster as we don't need to query for each master list line

_Pros:_

- Stay in changelog land and don't queue loads of records
- Obviously faster cause it's rust 😉
- Simplify sync progress UI
- Honestly report the remaining to pull? depends on exact approach
- Less overhead than Opt 3?
- Future proof

_Cons:_

- If doing query filter potentially expensive to filter the change_log like this on each request?
- Only fixes for OMS

## Decision

The decision at the moment is to do nothing to reduce the change_log size with any filtering! We've found some key problems (legacy reports) polluting the sync queue with big hard to compress BLOBs, along with increasing batch size we can get vast amounts of records highly efficiently compressed in gzip which alleviates most of the problem.

## Consequences

- LCS filter out non open msupply reports in sync v5
- LCS possibly raise request batch size further. Recently raised from 1k to 5k. Perhaps more would help
- OMS dynamic batch size to utilise the above on both queue and changelog endpoints
- OMS sync with cursor on queued records endpoint, halving the requests to sync queued records (sorta tangential but related to init speed) 
