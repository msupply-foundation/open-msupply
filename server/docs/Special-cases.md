1. [Transfers](#transfers)
2. [Merging Records](#merging-records)
3. [Delegated Rights](#delegated-rights)


# Transfers

## What is a transfer?

When a remote site creates a customer invoice or supplier credit, and the customer or supplier ("other party") on the transaction is another store in mSupply, then that is a transfer. Similarly, an internal order (a.k.a. request requisition) or an internal requisition (purchase order) to another store in mSupply is a transfer.

For a transfer to be effected, the status of the initiating invoice/requisition must be `finalised` or the status of the initiating purchase order must be `confirmed`:

* Finalised customer invoice in store A for store B => new supplier invoice in store B.
* Finalised supplier credit in store A for store B => new customer credit in store B.
* Finalised internal order (request requisition) in store A from store B => new response requisition (customer requisition) in store B.
* Confirmed internal requisition (purchase order) in store A from store B => new response requisition (customer requisition) in store B; finalised customer invoice generated from this reponse requisition in store B => new goods received record in store A.

### Local transfers

* When the other party is another store on the same site, this is a local transfer.
* When the transfer is effected, the remote site makes the mirror transfer record in the destination store.
* The end.

### Central transfers

* When the other party is another store **not** on the same site, this is a central transfer.
* When the originating transfer record synchronises to the central server, the central server detects that the transfer has just been effected (by comparing to the saved state (if any) of the record), and creates a sync_out record to forward the record (and its related lines) on to the destination site.
* When the destination site receives the record, it creates the mirror transfer record in the destination store, in the same way it would if it was a local transfer. The originating_id field in the transaction/requisition/goods_received table contains the ID of the originating record in the originating store.
* Remote sites are responsible for handling (i.e. ignoring) a second receipt of the same record from the central server.

# Merging records

## Which records can be merged?

Records of the following types may be merged on the primary site:

* customers & supplier names
* items
* units

Records of the following types may be merged on the site which the home site for _both_ records:

* patient
* prescriber

Records of the following types may be merged on the site where the related store is active:

* location

### When a merge is initiated on a site

* The record to be merged has its `status` field updated from `active` to `merged`.
* The record to be merged has its `merged_into` field updated with the ID of the record to keep.
* All child records which are linked to the merged record ID, and which are editable on the site (e.g. item lines in the site's active store(s) linked to a merged item), have their `<some_table>_id` field changed to the new ID.
* Normal code in a trigger sends it to the central server.

### When the central server receives the merged record

* It applies the normal sync rules:
  * If it's central data, it adds it to the `central_change_log`.
  * If it's patient data, it forwards it to each site where the record is visible.

### When the remote site receives the merged record

* Before saving it checks for a change in value of the status field from the saved value.
* If the status has changed to `merged`:
  * The record's `merged_into` field determines the new ID to be used for child records.
  * All child records which are linked to the merged record ID, and which are editable on the site (e.g. item lines in the site's active store(s) linked to a merged item), have their `<some_table>_id` field changed to the new ID.

# Delegated Rights
By default, central data is editable only on the central server. However, the ability to manage central data can be delegated to a remote site

The remote site is defined by 
* `preference.description = "delegated_rights"` 
* for this preference: `preference.centrally_controlled = true`.
* store_preference records for this preference all have a value `false`, except for the store that is delegated, which has the value `true`

Only users on the site with the correct user permissions will be able to edit records.

## On the remote site:
* Allow editing when this preference = `true`
* On editing, save sync_out records as for other data

## On the central server
* On receiving a sync record for data that is normally centrally controlled, check if the site has the `delegated_rights` preference set to `true` 
  * If yes: update the central record - triggers on this record will then update central_change_log in the normal way
  * If no: ignore the record. 