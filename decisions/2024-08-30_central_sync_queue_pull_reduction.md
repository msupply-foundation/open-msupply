# Central Sync Queue Pull Reduction

- _Date_: 2024-04-30
- _Deciders_: @Chris-Petty, @andreievg
- _Status_: UNDECIDED
- _Outcome_:

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

### Option 1 - LCS improve queuing filter and move master lists back to queue rather than change log.

This would be contentious, as a key driver for the change log was to prevent spamming the `sync_out` table with updates every time you update a master list, so moving it back to the queue would be coming full circle heh. Some of our bigger users have >1000 sites, so every line touched _could_ require upserting >1000 sync_out records. central_change_log could bring that down to 1 upsert (if all sites were OMR).

But also would work. We could make master list queued data again and improving queuing with filtering to only send updates to where they need to go. This would fix the initialisation problem and also improve legacy mSupply performance.

_Pros:_

- Should improve sync performance over all, including UX on legacy central servers for users doing admin. (There is merit to fixing the master list queuing filtering on LCS regardless of where this KDD goes!)

_Cons:_

- Still potentially queuing lots of records to many sites. Some users will have >1000 sites and a general master list used across them with >5000 items. These instances will still suffer millions of queued records that central_change_log set out to fix to begin with!
- Eventually we want OMS only deployments where OMS controls central data, so a solution in LCS land would require us eventually fixing it again in OMCS land.
- Doing work in LCS when we're trying to focus on OMS

### Option 2 - LCS central_change_log filtering per log processed

We implement a system that allows sync v5 change log requests to have some filtering on the LCS side.

Suppose a site requests 5000 change_log records from cursor 0, so initialising.

1. If the change_log record is for a list_master_line,
2. Get all the list_master.ID values for lists that are visible to the site; that is from list_master_name_join for all stores (this can be done once for the request and reused in the process, or cached between requests to reduce querying overheads)
3. Get the list_master_line record
4. If the list_master_line.master_list_id is **not** in that set, skip this change log record.

_Pros:_

_Cons:_

- Still looks like 90k records to pull, even if large amounts get filtered out.
- If 5000 records are requested and we filter out some (or all) of them, do we scan ahead to grab some more records till the batch size is fulfilled (and continuing until done)? Probably negligible but none the less a slower.
- If they actually need all of them, it's more overhead doing filtering for no reason. Can probably optimise this case though.

### Option 3 -

_Pros:_

_Cons:_

### Option 2 - Round pack size up to next whole number and adjust number of packs, monetary fields etc.

We convert decimal pack sizes up to the next whole number.

E.g.

1 pack of 1L is repacked to 40 packs of 0.05L in mSupply desktop. The latter on integration in OMS:

1. pack size: 0.05L/0.05 = 1L
2. number of packs: 40packs\*0.05 = 1pack
3. cost/sell price: 0.5/0.05 = $10

The pharmacist feedback I have received on this is that it'd be confusing to users if they had a system telling them they had 1 of when they can see there are 40 smaller vessels on the shelf. For accounting, I have not asked a finance stakeholder yet but I presume this is very very bad form in regards of adjusting the number of what was physically ordered/received and the cost of each item ordered.

A potential solution for this is to use pack variants. After converting back to 1L pack size, we use a variant of "50mL bottle" that converts all the properties back in the UI layer. Pack variants don't appear to quite support this - the assumption is the base unit is a small whole number (integer). In this case we'd need a pack variant of 0.05L, which would do the reverse of the calculations above. There is additionally an issue of when and how these pack variants are generated, as they are centrally controlled data.

Going to the option 1 problem statement, we also have to solve this at integration still so no avoided in anyway:

> There is potential for discrepancies to occur, e.g. store A repacks `1 * 1L` to `3 * 0.33L`. There are 0.01 packs of the original line... do we just zero it? If we issue all 3 to another store, they receive 0.99L. Do we round it up? What's the threshold?

_Pros:_

- Open mSupply can keep using integer for pack sizes, which feels good in a programming lens. Floats with their inaccuracy are genuinely not ideal!

_Cons:_

- Unintuitive for users, stock levels in system no longer represents physical reality.
  - Could be assuaged by making pack variants support decimals by being f64 rather than i32. Is this just shifting the problem though? We'd still need to handle when and if rounding happens in UI and calculations no matter what we do.
  - Also then reporting must take into account pack variants? I think this might already be true, but with items affected by this automation/translation it'd be absolutely mandatory (might need a line.pack_variant_ID FK to make sure a line is presented in the known physical form explicitly).
- More complex translators updating all fields that are relative to pack size (number of packs, cost price, sell price). All these calculations introduce opportunity for float arithmetic inaccuracies to accumulate.
- Data reviewed on remote sites will not match the same data viewed on central server.
- Might need explaining/complex mappings in integrations.

### Option 3 - Can convert units?

Specifically for cases like mL and L, it might be handy in repacks to allow 1L -> 1000mL. This could be converted. Then instead of items having units, they have a unit type, i.e. _volume_, _mass_ or _each_. Then when sending a fractional amount, it could automatically repack into a different volume. Monetary values may need to remain relative to a recorded base unit to avoid doing conversions of that as well, or perhaps we convert units too though they may become very small values ($1/L -> $0.001/mL).

In translation fractional pack sizes could be converted from one unit to another smaller unit that results in a whole number, but only if they're defined centrally. Unfortunately we can't universally predict this - as Per the SAP example a user might user "case" and "each", where there are 6 "each" in one "case". Do we define a separate "each" for each possible ration? 1:6, 1:10, 1:12... we certainly shouldn't generate units to get around it!

Pros:

- Tidy and intuitive-ish specifically for L and mL. For pharmacy users it means data stays directly mapping with physical stock.
- Fine for integrations?

Cons:

- Wide ranging impact and complexity especially in translations.
- Units are currently controlled in Legacy, so all would have to be preconfigured before integration is attempted on remote site.
- Doesn't logically work for all units, so feasibility is near 0 IMO.

### Option 4 - Switch all f64 amount fields to a monetary safe type

Decimals would be safe then. pgsql has one of these built in, sqlite does not. We'd need a rust implementation to manage these monetary values. One such rust crate is [rusty-money](https://crates.io/crates/rusty-money). It is of note that rust is a young language, and such libraries are relatively immature compared to [Java](https://docs.oracle.com/cd/E13166_01/alcs/docs51/javadoc/com/elasticpath/domain/misc/Money.html), [.NET](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-decimal) etc.

(Note .NET's `Decimal` has basically the same problems as f64 still, but the errors are relatively much smaller! Is a fancy 128bit number implementation rather than f64 standard)

This is too big a task. All reports and all database and business logic would have to be rewritten. OMS needed to commit to this early if at all so I think the ship has sailed, won't write anymore about it! Would have incurred a complexity tax on all development anyway, and Legacy would still be sending us f64 to deal with lol.

## Decision

**Option 1 - it is the simplest and the consequences are generally known.**

Option 2 is complex and doesn't explicitly solve the problems either. It requires using pack variants in a way that is not supported.

Option 3 is at least as complex if not more, also a bit undercooked ;-).

Option 4 no 🥲.

## Consequences

1. Pack sizes are changed to f64 across the data schema.
2. UI is updated to use rounding as configured in system. (largely already required - monetary values and number of packs are f64).
3. Ledger checks already need to account for float inaccuracy as number of packs already are f64, so not a new requirement.
