# Living with V5, V6 and V7

Even though v7 leads a path to a stand alone omSupply with an independent central server, we would still need to support existing deployments where the OG central server would remain as the central site.

This scenario and transition towards it can be explained in this diagram, both diagrams can be found [here](https://app.diagrams.net/#G1qGGk1wXaiQHm8u9MUBgbJjyXtSY8BMkZ#%7B%22pageId%22%3A%22h7FEzXcejfu2p3egsU6T%22%7D), in separate tabs. Please note the new terms COGS, COMS, ROGS, ROMS (C \= central, R \= remote, OG \= mSupply, OMS \= open mSupply)

Things and tradeoffs to keep in mind:

- Function
- Performance
- Development/maintenance (i.e. simplicity is valuable\!)

## Sync V5 and V6

This is where we are now. We already have sync directly between COMS and ROMS which allows for sync of omSupply specific data, (i.e. global/store preferences, name properties, etc..), however remote sites require syncing with two different API and there are too many moving pieces, like a proxy of authorisation to COGS when ROMS syncs with COMS.

![transition_sync_v5_v6](./transition_sync_v5_v6.drawio.svg)

The main change here is introduction of V7 api for all new versions of COMS and ROMS and adding site configurations to COMS. When V7 is introduced ROMS will not sync with COGS anymore and will communicate solely with COMS via V7 sync. COMS will still sync with COGS via V5 api and will support existing ROMS sites via V6 api while they transition towards V7.

From COGS perspective COMS is just another remote site using V5 api, with active stores. COMS in turn has its own association with stores and V7 sites. This setup conforms with existing COGS sync modal while allowing ROMS to transition to V7.

![transition_sync_v5_v6](./transition_sync_v7_v5_v6.drawio.svg)

## Examples

ROG (and ROMSv6) can send transfers to ROMS (V7)

- ROG creates original transfer
- It’s syncs to COGS
- COG sees that destination is for store that is active on COMS site, forwards it to COMS
- COMS receives it and forwards it to the site where it’s active
- ROMS receives

## Transition ROMS (V6) to ROMS (V7)

The ultimate goal of this work requires an upgrade to remote sites to start utilising sync v7. In order to keep the process scalable to the thousands of deployed sites we need this needs to be automated as much as practicable.

### Manual

If it was done manually as of before any of changes done for this project, here would be the steps:

- Make sure ROMS site synced.
- Disable ROMS sync to stop further syncs until after upgrade to v7
- Move ROMS site to COMS
- Wait for this store to initialise for COMS and sync data COGS \> COMS
- Create a site on COMS with the new store (this is COMS own site management: From COGS perspective, this site is just another COMS site)
- Upgrade ROMS to new version of OMS that supports v7
- Manually update URL, site and password on ROMS

## Automatic

The manual process above is quite tedious and would impede the process of upgrading ROMS sites to V7. We can automate much of it with a bit a work.

### Prerequisites

- All site records synced from COGS to COMS so that COMS may take over their authentication and syncing
- All store data synced from COGS to COMS so that any sync v7 initialising or reinitialising site can do so
- COGS endpoint for getting the COMS server URL (Alt: redirect sync v7 requests with proxy)

### Automated procedure

1. Upgrade to OMS3.0 with sync v7
2. Startup run migrations
3. Check a key_value_store setting for if the sync v7 URL is known
4. If not begin the transition procedure as below, otherwise do the new regular sync v7
5. Do one last v5/6 sync cycle. This is to ensure all data is pulled updating the v6 pull cursor to a valid point (see cursor problem below)
6. Copy the sync v6 pull cursor to the sync v7 cursor key_store_value
7. Request from COGS the COMS central server URL and save in key_value_store. If not all stores active on the site are "moved", reject/return. COGS should change the site.sync_version to "v7" at this point. Any records in sync_out table should be moved to oms_central_queue table.
8. Do first sync v7 sync (likely little to no records to pull or push)
9. Done! There after only sync v7

![migration_to_v7](./migrating_to_v7.drawio.svg)

## Cursor problem

The v7 ROMS will have a new cursor for tracking what records it needs to pull from COMS this creates a catch 22

- When ROMS upgrades to sync v7, its sync v7 pull cursor default value will be 0
- COGS has synced all data of stores on ROMS to COMS. All this data has changelogs with some high cursor number
- COGS continues syncing transfers to COMS of the stores on the ROMS site also, these can't be missed
- COGS likewise syncs central records like items to COMS, these cannot be missed

Doing nothing would cause the remote site to pull all of it's store data again, essentially reinitialisation but messier as many records (invoices in particular) will be rejected at integration.

Keep in mind that we can't control the sync status of sites being upgraded to sync v7. A site might be offline for the week, during which central records and transfers are queued for it on COGS v5, and then upgraded to sync v7 without ever pulling those records from COGS v5.

### Solution: One last v5/v6 sync

On first sync cycle after app upgrade (or even in a migration) we first check if all store data is moved from OG to OMS for this site's stores. This is to ensure that the OMS central server does not have store records sent from OG added to the changelog after a remote site has moved to sync v7, least they end up being pulled via sync v7. We need to gracefully handle the possibility that this gets rejected.

Proceeding, we then do a v5 + v6 sync cycle. When v6 returns its final batch the `end_cursor` value, rather than being the last record's cursor, is the maximum changelog.cursor value.

Sync v7 can adopt the v6 cursor value safely at this point without unintentionally resyncing all active store data.

<details>
<summary>Alternatives<summary>

### Initialise sync v7 pull cursor with sync v6 cursor

As sync v7 and v6 cursors both reference the changelog.cursor it's worth considering what just initialising the v7 cursor with the v6 cursor would mean.

For regularly syncing sites, we should be able to rely that the site has pulled from v5 all its necessary central and transfer records before the v6 cursor.

For sporadically syncing sites, it's possible that its stores records have been transferred from COGS to COMS after the v6 cursor, so would resync potentially a lot or all of the store and transfer data of the site.

It's probably worth using the v6 cursor as the initial v7 cursor as it mitigates most of the problem, but not a guarantee.

### Custom filters

This would be a special sync on upgrading that'll pull records based on a filter ignoring store records, though ideally including transfer records still (even if being re-synced). This would effectively resync central data which is fine logically and most likely fine in terms of volume, can be refined by using the v6 cursor. It fails to pull transfers were not pulled via v5 though, so perhaps pulling all transfers as well would be acceptable. The latest cursor of records pulled would be kept as the last sync v7 cursor.

Regular sync could then proceed thereafter without issue.

</details>

## In COMS (V7)

We would need to sync all sites from COGS to COMS.

V5 synchroniser would remain, it would still be the source of migrations between OG and OMS schemas. We would need to make sure to push all V5 supported records to OG that did not come from OG.

V6 server API would remain, it should not need any changes, transfers will still be routed via OG.

## Patients

We would need to either proxy remote lookup for patients to OG or make them all available in COMS. The latter is the preferred option, it would need some investigation

## Users

Draft: ( CP: should I be writing this here or in technical spec?)

OG pain points:

- Users need to be routed correctly wherever their related records go (e.g. user relating to patient records need to sync along with patient visibility)
- User sync is a hot mess where after initialisation users aren’t sync centrally to other sites. This regularly ends up with dozens of

At our current scale there are at most thousands of user records. This is a trivial amount in the scheme of things.

## V6 support

# Table Changes

On top of the table schemas described in V7 spec, there is also a need for the following changes

- COMS to differentiate between V7 and V5 site
- ROMS to know if current sync URL is for COMS or for OG

Remove `changelog.is_sync_update` as it is no longer necessary

# Changelog operational validation

We need to do some preliminary analysis of the changelog solution to ensure that it’s going to scale suitably for the foreseeable future.

For some high level parameters:

- 2 billion records a year, assume after 10 years we have 20 billion and want this to keep running\!
- At 5 min sync, 40,000/5/60 \= 133 new connections a second, each pushing 2 records
  - What about all the connections to pull records? Even just querying if there is anything to pull when there is nothing\!
- Initialising a site that has 5 million records (a fairly busy hospital. PNG regional warehouse remote sites have millions of records)

I think it’s fair to say that we can assume that such a system isn’t running on a potato like we often do.

- 64core? 128?
- 256GB RAM? More?
- Many TB SSD/NVMe storage

However, for POC should we reduce this by a multiplier? 1 billion records on a 4 core 16GB machine?

TODO: create proof of concepts (POC) validating above

##

# Consideration and Alternatives

TODO: Describe why V7 approach and transition:

- Can’t just upgrade every site, we struggle to make country wide version upgrades happen at will
- There is still a big gap in feature parity to move all sites from OG to OMS, thus we need a system that allows different flavours of mSupply and their sync
- Moving all sync to OMS would mean supporting legacy API or implementing new API in OG, which is a huge task

## Horizontal scaling

The current thinking is mostly assuming vertical scaling by upgrading a single machine running a monolith application (and definitely historically with OG). At a certain threshold we should horizontally scale to many machines. There are 2 separate components, or servers rather, to consider:

- OMS central server (our rust server)
- Postgres server

We think that the OMS server as a monolith should be able to handle 1000s of requests concurrently. The bottleneck will far sooner lay with DB performance.

# **Moving data from OG to OMS**

As described above in the automatic movement to OMS of sites upgraded to v7, we need the store data moved to OMS. To streamline and keep it simple we want to make sure all store data and the site table are moved before we start deploying OMS3.0 remote sites.

Some of our largest clients have in the range of 50 to 100 million records that need to be synced from OG central to OMS central, while keeping both systems in usable and valid states.

The key challenges:

- Getting all 100 million records out of OG to OMS in a timely reliable manner
- OMS ingesting all 100 million records in a timely reliable manner

## **OMS central queue**

OG sync occurs by queuing messages to all sites via the `sync_out` table. The `sync_out` table stores all messages for all sites, even defunct. On large installations, this has blown out to more than 10 million messages and the performance of inserting new messages is dismal. This is OK for regular sync, however it is not practicable for sending tens of millions of records in one big go.

A simple path forward was prototyped and seems sufficient \- creating a separate append only queue table just for OMS that can omit all the indexes required by a shared queue table. This on a mac can sustain 15000r/s queuing, while on a client-esque VPS it was \~1000r/s.

At the time of writing this is currently in PR and approved for OG \- functionally the sync API hasn’t changed, just internally how OG handles and queues messages for OMS central server specifically.

## **Moving one Store at a Time**

Moving 100 million records in one big go isn’t feasible. Even the dedicated table may slow down, it’ll take several GBs of disk space in the DB, and take an eon for OMS to pull, then integrate. During that pull and integration, any transfers needing to go to OMS central server would be blocked until the whole shebang is done. Assuming each step could run at 1000r/s it’d still take several days. Evidence so far suggests to be pessimistic and half that rate, making it well over a week.

Our biggest stores (central warehouses and busy dispensaries) tend to have 1-3 million records, and as you go down the supply chain this falls on what appears to be an exponential curve \- across all stores the average will be much lower due to numerous health centre stores only having 0-100k records.

At worst having to sync say 3 million records in one go is manageable\! By the above math it’d be 5-10 hours.

This leads to attempting syncing one store at a time:

1. COGS is upgraded to a version supporting this, and we initiate it.
2. COGS marks a store.coms_migration_status (starting with most trans_lines \+ requisition_lines first) in COGS as “queuing” and begins a process adding all of the store’s records to the COMS central queue.
   1. From this point, all records destined for that store going through COGS’ sync routing logic will be forwarded to COMS. Doing it any sooner may result in sending records without parents, failing FK constraints. (TODO: proof of concept (PoC) validation\!)
   2. Alternative: (C)OMS should be improved to remain performant despite FK constraints (or other errors) and retry the failing records each time (which is a bit wasteful\! But will iron out eventually as all stores and sent over). Then it doesn’t matter much if we make extremely simple (i.e. low overhead\!) forwarding logic that sends everything to COMS
3. COMS can start pulling these records into its buffer on next sync
   1. If COMS manages to pull the queue to 0 while COGS is still queuing records (e.g. COGS is doing a big query for the next table of records to queue), it might start integrating prematurely. COGS can prevent this by checking for “queuing” stores and sending that there are more records remaining than it would otherwise send to trick COMS into waiting longer (TODO: PoC)
4. Once COGS has added all the records to the queue, it marks the store as “moved”. These continue to be included in COGS store data forwarding logic.
5. COMS begins integration of sync_buffer. This may take a while with 1-3 million records.
   1. The place to discuss performance of integration is [here](https://github.com/msupply-foundation/open-msupply/issues/10295)
6. COMS now has the store and COGS will continue sending any further records as necessary.
7. As all stores are moved to COMS, COGS can assume simple routing logic of forwarding all records to COMS.

### **FAQ**

- **Does each store resend a bunch of system records? item_store_joins, name_store_joins etc.?** Maybe a little bit for item_store_joins, TODO double check NSJ.
- **Resend transfer records?** Truueeee. Eventually all transfer records would end up being sent twice, as we send it once for the owning store being moved and once when the other party store is moved. We could make sure there is a special case/flag to not include transfer data.
- **Resend Patient data\!?** TRUE. Again, we already have logic to either resync just patient system data or that along with all the visible patients’ dispensing history too. We could lean on that or make some tweaks to allow the logic to not resync all the prescriptions again.

## **Alternatives**

### **COGS sends straight to COMS**

Would look something like making a small rust syncv5 based translation layer that inserts records in syncv5 format directly into postgres (table \+ changelog \+ sync_buffer) upsert. No intermediary steps. The safest bet is to use a special API on COMS (to guarantee it’s the right version of v5 translators). OG would need to be careful to make sure it sends things in the right topological/FK reference order to prevent errors occurring (not too hard really. In fact OG sync buffer integration already does this).

We are required to put the record into the (v5) sync_buffer anyway, as a key usage of the buffer is to reintegrate records when migrating OMS to newer versions where fields that have values from OG are now supported.

Hopefully much faster than `Moving one Store at a Time` with the oms_central_queue approach (can still do one store at a time), and is beside sync processes rather than heavily loading them. Though, as we still need to do (table \+ changelog \+ sync_buffer) update, the main thing we’ve really avoided here is the queuing in COGS.

We may come to realise that once we want to make sure that the end state is the same as if these records synced, including sync_buffer records with integration errors (so the record data failed to upsert), then it may be no faster to trying to do all 3 table inserts at the same time and return to just adding them all to sync_buffer and attempting normal integration process\!

### **COGS writes to file, COMS imports**

Similar to above, but with an intermediate step where COGS dumps records into a file and COMS would read it.

### **COMS reads straight from COGS**

Similar to `OG sends straight to OMS` but COGS provides the API for COMS to read from COGS tables. Having a good mechanism for filtering the tables and getting the next “batch” or “page” of records is dubious without a timestamp or cursor, though.

## Moving site table (Draft)

COMS needs the site table records from COGS in order to seamlessly take over syncing the site data for sites.

COGS doesn’t traditionally sync this anywhere. It could make a simple trigger rule to send them specifically to COMS.

We may need some coordination, that when a OMS3.0 site syncs, COMS messages COGS to disable editing of the site on COGS. Or COMS can just reject further updates if someone does edit it on COGS. Or maybe updates sync both ways\! Perhaps for dashboard purposes.
