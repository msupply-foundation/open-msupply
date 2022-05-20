+++
title = "Advanced Sync"
description = "Advanced Sync"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 55
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++

## Transfers

One of the reposibilities of the sync system is to effect "transfers" between stores.

Some examples of transfers:

* Outbound Shipments, where the customer is an mSupply store.
* Supplier credits, where the supplier is  an mSupply store.
* Supplier requisitions or purchase orders, where the supplier is an mSupply store.

For a transfer to be effected, the status of the initiating invoice or requisition must be `finalised` (or `confirmed`, in the case of purchase orders):

* When `Store A` finalises a outbound shipment for `Store B`, a new inbound shipment is created for `Store B`.
* When `Store A` finalises a supplier credit for `Store B`, a new customer credit is created for `Store B`.
* When `Store A` finalises a supplier requisition for `Store B`, a new customer requisition is created for `Store B`.
* When `Store A` confirms a purchase order for `Store B`, a new customer requisition is created for `Store B`.
* When `Store B` finalises a outbound shipment generated from the customer requisition, a new goods received record is created for `Store A`.

### Local transfers

* If the other party store is on the same site, the transfer is "local".
* When the transfer is effected, the remote site creates the mirror transfer record in the destination store.
* That's it, no synchronisation needed.

### Central transfers

* When the other party store is not on the same site, this transfer is "central".
* When the originating transfer record synchronises to the central server, the central server creates a `sync_out` record to forward the record and its related children to the destination site.
* When the destination site receives the record, it creates the mirror transfer record in the destination store (in the same way as if it were a local transfer).
* The mirror record `originating_id` field is set to the `id` of the originating record in the originating store.
* It is the responsibility of remote sites to handle (i.e. ignore) duplicate records from the central server.

## Merging

Description of merging goes here.

### What records can be merged?

Records of the following types may be merged on the primary site:

* Customer names
* Supplier names
* Items
* Units

Records of the following types may only be merged on the site which is the home site for <ins>both</ins> records:

* Patient
* Prescriber

Records of the following types may be merged on the site where the related store is active:

* Location

### When a merge is initiated on a site

* The record to be merged has its `status` field updated from `active` to `merged`.
* The record to be merged has its `merged_into` field updated with the `id` of the record to keep.
* All child records which are linked to the merged record `id`, and which are editable on the site, have their parent table `id` field (e.g. `invoice_id`) changed to the new `id`.
* Normal code in a trigger sends it to the central server.

### When the central server receives the merged record

* It applies the normal sync rules:
  * If it's central data, it adds it to the `central_change_log`.
  * If it's patient data, it forwards it to each site where the record is visible.

### When the remote site receives the merged record

* Before saving it checks for a change in value of the status field from the saved value.
* If the status has changed to `merged`:
  * The record's `merged_into` field determines the new `id` to be used for child records.
  * All child records which are linked to the merged record `id`, and which are editable on the site, have their `<some_table>_id` (e.g. `invoice.id`) field changed to `merged_into`.
  * Sync triggers create `sync_out` records to be pushed to the central server.

## Delegated Rights

By default, central data is editable only on the central server. However, the ability to manage central data can be delegated to a remote site.

The remote site is defined by the `"delegated_rights"` preference (`preference.description = "delegated_rights"`).

All `store_preference` records for this preference have `preference.centrally_controlled = false`, except for the store that is delegated, where `preference.centrally_controlled = true`.

Note that users on the site will only be able to edit records with the correct user permissions.

### On the remote site

* Allow editing when `preference.centrally_controlled = true`.
* On editing, `sync_out` records are created as per usual procedure.

### On the central server

* On receiving a sync record for data that is normally centrally controlled, check the site `"delegated_rights`" preference.
* If `delegated_rights.centrally_controlled = true`, update the central record (triggers on this record will then update the central_change_log as per usual procedure), otherwise ignore the record.
