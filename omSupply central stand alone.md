## omSupply central stand alone


### Done

* With macros convert translators to v6
* Some translators are still commented out, should be able to add though
* Added some macro to quickly create Upsert trait implementation (including changelog inserts)

### Next

The next step, to show omSupply initialising from omSupply central was going to look like this:
* omSupply central to be initialised using some reference data file, and log in to get the user permissions and user themselves, for this to happen:
  * Since the translators have all moved to v6, we would need to open previous version of omSupply
  * We want to make sure that all initialised data is in changelog. Would need to add insert changelog for central data in upsert methods or triggers (can use macro added in repo/lib.rs). Could also just run some sql to insert all central data to changelog
* Change pull and push v6 auth on central (remove it for now and just use the site_id with which central was initialised)
* Update change log filters (record type i think, to be not legacy but central and remote)
* In synchroniser just do pull and push and use url from settings for central
* Disable synchroniser for central

Should be able to sync from omSupply central to omSupply remote now, just initialisation, circular sync will still happen

### Next/Next

Configure site, name and store on omSupply central + add credentials. 
Remove circular sync by adding site_id when integrating all remote records on central. This can be done by doing a crude search after integration of the records or by extending Upsert to insert changelog and removing triggers. Also is_sync_upsert can be added in integration logic (if it hasn't been done already).

Above should allow re-syncing of existing site, if temperature log related transalors are done, would be good to test how things look on large data set for initialisation (and fridge tag integration). Would also need to run Sqlite in transaction for this (and postgres in single transaction, without inner)

### Next/Next/Next

Add transfer type to change log types and filter by name_id, may need to add name_id now to the change logs if triggers were removed, not sure what's the best way to do this, maybe name_id on actual invoice_line makes sense at this point

Try transfers between sites

