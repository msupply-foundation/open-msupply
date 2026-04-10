# Living with V5, V6 and V7

Even though v7 leads a path to a stand alone omSupply with an independent central server, we would still need to support existing deployments where the OG central server would remain as the central site.

This scenario and transition towards it can be explained in this diagram, both diagrams can be found [here](https://app.diagrams.net/#G1qGGk1wXaiQHm8u9MUBgbJjyXtSY8BMkZ#%7B%22pageId%22%3A%22h7FEzXcejfu2p3egsU6T%22%7D), in separate tabs. Please note the new terms COGS, COMS, ROGS, ROMS (C \= central, R \= remote, OG \= mSupply, OMS \= open mSupply)

Things and tradeoffs to keep in mind:

* Function  
* Performance  
* Development/maintenance (i.e. simplicity is valuable\!)

## Sync V5 and V6

This is where we are now. We already have sync directly between COMS and ROMS which allows for sync of omSupply specific data, (i.e. global/store preferences, name properties, etc..), however remote sites require syncing with two different API and there are too many moving pieces, like a proxy of authorisation to COGS when ROMS syncs with COMS.

![transition_sync_v5_v6](./transition_sync_v5_v6.drawio.svg)

The main change here is introduction of V7 api for all new versions of COMS and ROMS and adding site configurations to COMS. When V7 is introduced ROMS will not sync with COGS anymore and will communicate solely with COMS via V7 sync. COMS will still sync with COGS via V5 api and will support existing ROMS sites via V6 api while they transition towards V7. 

From COGS perspective COMS is just another remote site using V5 api, with active stores. COMS in turn has its own association with stores and V7 sites. This setup conforms with existing COGS sync modal while allowing ROMS to transition to V7.

![transition_sync_v5_v6](./transition_sync_v7_v5_v6.drawio.svg)

## Examples

ROG (and ROMSv6) can send transfers to ROMS (V7)

* ROG creates original transfer  
* It’s syncs to COGS  
* COG sees that destination is for store that is active on COMS site, forwards it to COMS  
* COMS receives it and forwards it to the site where it’s active  
* ROMS receives

# Transition

## ROMS (V6) to ROMS (V7)

### Manual 

If it was done manually, here would be the steps:

* Make sure ROMS site synced.  
* Disable ROMS sync to stop further syncs until after upgrade to v7  
* Move ROMS site to COMS  
* Wait for this store to initialise for COMS and sync data COGS \> COMS  
* Create a site on COMS with the new store (this is COMS own site management: From COGS perspective, this site is just another COMS site)  
* Upgrade ROMS to new version of OMS that supports v7  
* Manually update URL, site and password on ROMS

TODO: What happens now, when the store is added to an existing site in COGS, do we wait for the initialization in COGS and lock the remote site for the time being ?

TODO: Discuss if this would be a good time to instigate pruned history for sites. We have a way of doing this

* Make field on stock\_line “opening\_balance”  
* Make cut-off date preference  
  * Can only set cut-off date to a date where all transactions are finalised before cut-off date  
  * Once set, can’t back-date a transaction to before this date  
* Function to set opening\_balance to balance on cut-off date  
  * Calculate stock on hand for each stock\_line on cutoff date. Set opening\_balance to that value  
* We would also need to instigate a bulk-finalise function: can’t have users finalising thousands of shipments one-by-one

### Automatic

The manual process above is quite tedious and would impede the process of upgrading ROMS sites to V7. 

There is an automatic path for V6 to V7 upgrades, but it does comes with a lot of complexity, diagram can be found [here](https://app.diagrams.net/#G1zJ2CVayp8rH4OEoqR0J4QtyopSVUDMr8#%7B%22pageId%22%3A%227nNJ33k2SLYAFH4usb1b%22%7D). It automates the manual steps.

* New endpoint is added to COGS that will return url for COMS server using existing site field  
* When ROMS V7 sync it will first check if V7 url is configured, if not it will use newly added endpoint to discover COMS url and persist it  
* After this site\_info endpoint is requested from COMS  
* COMS is aware of all sites as they sync from COGS  
* COMS sees if site is V7 site, if it is, sync continues as normal  
* If current site is not V7 site, it is made a V7 site and is locked, a request is made from COMS to COGS to move all stores for that site to COMS central  
* Once all store have moved and COMS completes a sync cycle, we can unlock V7 site   
* ROMS would need to wait for this operation, as it should if the site is locked

![migration_to_v7](./migrating_to_v7.drawio.svg)

#### Considerations

TODO: Perhaps only part of the above can be done to help with V7 migration. The process seems complex and fragile. Also when doing some tests it does take a long time for V5 to populate the sync queue when the store moves.

TODO: Need to make sure that site credentials are migrated correctly when moving site to V7

TODO: Can we keep site\_id for the new site as is ? I think it’s better to have another site\_id, perhaps with a big number prefix

TODO: ROMS does not persist COMS url, it’s only available after first successful sync, so after upgrade we do need to re-query for it

## In COMS (V7)

We would need to sync all sites from COGS to COMS. 

V5 synchroniser would remain, it would still be the source of migrations between OG and OMS schemas. We would need to make sure to push all V5 supported records to OG that did not come from OG.

V6 server API would remain, it should not need any changes, transfers will still be routed via OG.

## Patients

We would need to either proxy remote lookup for patients to OG or make them all available in COMS. The latter is the preferred option, it would need some investigation

## Users

Draft: ( CP: should I be writing this here or in technical spec?)

OG pain points:

* Users need to be routed correctly wherever their related records go (e.g. user relating to patient records need to sync along with patient visibility)  
* User sync is a hot mess where after initialisation users aren’t sync centrally to other sites. This regularly ends up with dozens of 

At our current scale there are at most thousands of user records. This is a trivial amount in the scheme of things.

## V6 support

# Table Changes

On top of the table schemas described in V7 spec, there is also a need for the following changes

* COMS to differentiate between V7 and V5 site  
* ROMS to know if current sync URL is for COMS or for OG

Remove `changelog.is_sync_update` as it is no longer necessary

# Changelog operational validation

We need to do some preliminary analysis of the changelog solution to ensure that it’s going to scale suitably for the foreseeable future.

For some high level parameters:

* 2 billion records a year, assume after 10 years we have 20 billion and want this to keep running\!  
* At 5 min sync, 40,000/5/60 \= 133 new connections a second, each pushing 2 records  
  * What about all the connections to pull records? Even just querying if there is anything to pull when there is nothing\!  
* Initialising a site that has 5 million records (a fairly busy hospital. PNG regional warehouse remote sites have millions of records)

I think it’s fair to say that we can assume that such a system isn’t running on a potato like we often do.

* 64core? 128?  
* 256GB RAM? More?  
* Many TB SSD/NVMe storage

However, for POC should we reduce this by a multiplier? 1 billion records on a 4 core 16GB machine?

TODO: create proof of concepts (POC) validating above

## 

# Consideration and Alternatives

TODO: Describe why V7 approach and transition:

* Can’t just upgrade every site, we struggle to make country wide version upgrades happen at will  
* There is still a big gap in feature parity to move all sites from OG to OMS, thus we need a system that allows different flavours of mSupply and their sync  
* Moving all sync to OMS would mean supporting legacy API or implementing new API in OG, which is a huge task

## Horizontal scaling

The current thinking is mostly assuming vertical scaling by upgrading a single machine running a monolith application (and definitely historically with OG). At a certain threshold we should horizontally scale to many machines. There are 2 separate components, or servers rather, to consider:

* OMS central server (our rust server)  
* Postgres server

We think that the OMS server as a monolith should be able to handle 1000s of requests concurrently. The bottleneck will far sooner lay with DB performance.

# **Moving data from OG to OMS**

As described above in the automatic movement to OMS of sites upgraded to v7, we need the store data moved to OMS. To streamline and keep it simple we want to make sure all store data and the site table are moved before we start deploying OMS3.0 remote sites.

Some of our largest clients have in the range of 50 to 100 million records that need to be synced from OG central to OMS central, while keeping both systems in usable and valid states.

The key challenges:

* Getting all 100 million records out of OG to OMS in a timely reliable manner  
* OMS ingesting all 100 million records in a timely reliable manner

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
2. COGS marks a store.coms\_migration\_status (starting with most trans\_lines \+ requisition\_lines first) in COGS as “queuing” and begins a process adding all of the store’s records to the COMS central queue.  
   1. From this point, all records destined for that store going through COGS’ sync routing logic will be forwarded to COMS. Doing it any sooner may result in sending records without parents, failing FK constraints. (TODO: proof of concept (PoC) validation\!)  
   2. Alternative: (C)OMS should be improved to remain performant despite FK constraints (or other errors) and retry the failing records each time (which is a bit wasteful\! But will iron out eventually as all stores and sent over). Then it doesn’t matter much if we make extremely simple (i.e. low overhead\!) forwarding logic that sends everything to COMS  
3. COMS can start pulling these records into its buffer on next sync  
   1. If COMS manages to pull the queue to 0 while COGS is still queuing records (e.g. COGS is doing a big query for the next table of records to queue), it might start integrating prematurely. COGS can prevent this by checking for “queuing” stores and sending that there are more records remaining than it would otherwise send to trick COMS into waiting longer (TODO: PoC)  
4. Once COGS has added all the records to the queue, it marks the store as “moved”. These continue to be included in COGS store data forwarding logic.  
5. COMS begins integration of sync\_buffer. This may take a while with 1-3 million records.  
   1. The place to discuss performance of integration is [here](https://github.com/msupply-foundation/open-msupply/issues/10295)  
6. COMS now has the store and COGS will continue sending any further records as necessary.  
7. As all stores are moved to COMS, COGS can assume simple routing logic of forwarding all records to COMS.

### **FAQ**

* **Does each store resend a bunch of system records? item\_store\_joins, name\_store\_joins etc.?** Maybe a little bit for item\_store\_joins, TODO double check NSJ.  
* **Resend transfer records?** Truueeee. Eventually all transfer records would end up being sent twice, as we send it once for the owning store being moved and once when the other party store is moved. We could make sure there is a special case/flag to not include transfer data.  
* **Resend Patient data\!?** TRUE. Again, we already have logic to either resync just patient system data or that along with all the visible patients’ dispensing history too. We could lean on that or make some tweaks to allow the logic to not resync all the prescriptions again.

## **Alternatives**

### **COGS sends straight to COMS**

Would look something like making a small rust syncv5 based translation layer that inserts records in syncv5 format directly into postgres (table \+ changelog \+ sync\_buffer) upsert. No intermediary steps. The safest bet is to use a special API on COMS (to guarantee it’s the right version of v5 translators). OG would need to be careful to make sure it sends things in the right topological/FK reference order to prevent errors occurring (not too hard really. In fact OG sync buffer integration already does this).

We are required to put the record into the (v5) sync\_buffer anyway, as a key usage of the buffer is to reintegrate records when migrating OMS to newer versions where fields that have values from OG are now supported.

Hopefully much faster than `Moving one Store at a Time` with the oms\_central\_queue approach (can still do one store at a time), and is beside sync processes rather than heavily loading them. Though, as we still need to do (table \+ changelog \+ sync\_buffer) update, the main thing we’ve really avoided here is the queuing in COGS.

We may come to realise that once we want to make sure that the end state is the same as if these records synced, including sync\_buffer records with integration errors (so the record data failed to upsert), then it may be no faster to trying to do all 3 table inserts at the same time and return to just adding them all to sync\_buffer and attempting normal integration process\!

### **COGS writes to file, COMS imports**

Similar to above, but with an intermediate step where COGS dumps records into a file and COMS would read it.

### **COMS reads straight from COGS**

Similar to `OG sends straight to OMS` but COGS provides the API for COMS to read from COGS tables. Having a good mechanism for filtering the tables and getting the next “batch” or “page” of records is dubious without a timestamp or cursor, though.

## Moving site table (Draft)

COMS needs the site table records from COGS in order to seamlessly take over syncing the site data for sites.

COGS doesn’t traditionally sync this anywhere. It could make a simple trigger rule to send them specifically to COMS. 

We may need some coordination, that when a OMS3.0 site syncs, COMS messages COGS to disable editing of the site on COGS. Or COMS can just reject further updates if someone does edit it on COGS. Or maybe updates sync both ways\! Perhaps for dashboard purposes.

 