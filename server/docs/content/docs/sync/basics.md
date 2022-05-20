+++
title = "Sync Basics"
description = "Sync Basics"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 50
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++

## Basic principles

* Every record in the system maintains a unique UUID.
* Any given record is only editable on a <ins>single</ins> site.
* Data is defined as either central or remote, with some exceptions.
* All sync operations are initiated by the remote site. The central server waits to be polled.
* Remote sites push updated data before they pull from the central server.
* All synchronisation requests are secured by TLS (clients can choose whether to accept self signed certs).
* All HTTP bodies are JSON.
* Endpoints are RESTful, with the base route being `api/sync/v5/`.
* Authentication is done via basic HTTP auth, which returns a JWT token. That JWT must be submitted with any future requests. The JWT encodes:
  * The site id (represented as `u32`).
  * A UUID for the active database.

## Terminology

* `Central server`: the server which all remote servers synchronise with. An mSupply installation can only have a single central server.
* `Remote server`: a server which hosts a remote site.
* `Site` - a single instance of mSupply. Sites are categorised as either `remote` or `primary`.
* `Remote site` - a site where at least one store is active. A remote site may be running mSupply `single user`, `multi-user`, or `mobile`.
* `Primary site` - a remote site which can edit central data. An mSupply installation can only have a single primary site.
* `Store` - a site can have multiple stores. Stores share central data, but maintain their own remote data. For a given site, a store can be cateorised as `active`or `collector`.
* `Active store` - if an instance of a store is `active` on a given site, that site has permission to edit remote data for that store. To ensure data integrity, a store can be active on no more than a single remote site at any given time.
* `Collector store` - if an instance of a store is marked as a `collector` on a given site, that site has permission to read but not edit remote data for that store. Every store has a collector instance on the central server.
* `Store visibility` - for a store to send or recieve stock to or from another store, the stores must be visible to each other. The concept of visibility is symmetrical i.e. if store A is visible in store B, then store B is also visible in store A.
* `Central data` data which is only editable on the primary site. Central data is synchronised to all sites via the central server. The main types of central data are items, facilities and categories.
* `Central store data`: data which is only editable on the central server. Central store data is synchronised with the site where the store is active. The main types of central store data are store records themselves, stores preferences and store visibility records.
* `Remote data`: also known as `store data`, remote data is data which is only editable on a single remote site. Store data is synchronised with the central server. The main types of remote data are invoices, requisitions and stocktakes (and their related child tables, such as invoice_lines, requisition_lines etc.).
* `Patient data`: patient- or prescriber-related remote data. As with all remote data, this data is only editable on a single remote site (referred to as the `home site`). Patient data is synchronised via the central server to all sites where the related record is visible. The main types of patient data are patient name records themselves, prescribers, patient medication records and insurance policies.


## Types of sync

* There are two types of sync on the central server:
  * Queue based (see [Sync Queue](../sync-queue)):
    * When a record is modified (or needs to be sent to a remote site for some other reason, e.g. it is part of a transfer or related to a patient), a record is inserted into the `sync_out` table (for details, see [Sync Queue](../sync-queue)).
    * When a remote site connects and requests records, the central server queries the `sync_out` table for records for that site. It fetches and sends the requested number of records to the client (for details, see [Sync API](../api)).
    * The client responds when it has successfully saved all records, and the central server deletes the records from the queue.
  * Change log based (see [Change Log](../change-log)):
    * The `central_change_log` table has a single record for each record of central data. This record has a `u64` serial number*.
	* When a record is modified or inserted, the serial number is incremented.
    * Each remote site maintains a cursor recording its position in the change log. The remote site retrieves records sequentially, incrementing its cursor as it progresses.
	* Remote sites are responsible for maintaining their own cursor (remote sites are not responsibile for confirming receipt of records).

*Hello Postgres, with your `u32` vacuum cleaning ;-).

## Changes from previous versions

* The `central_change_log` is new.
* Stores on the central server can only be `collector`. Previously they could also be `active`. This ensures that each store is active on no more than one remote site (the central server has read-only instances of all stores, assuming data is fully synchronised).
* Stores on a remote site can only be `active`. Previously they could also be `collector` or `transfer`. This ensures that remote sites can no longer have full read-only instances of stores which are active on other sites (transfers are governed by the visibility of the "other" store name in the initiating store).
* Previously, most central servers were also the primary site. That functionality is now separated out (c.f. mirrored systems), meaning that the primary site is just a special instance of a remote site.
* Stores and visibility are controlled on the central server. Previously they were controlled on the primary site for mirrored systems. This means the primary site no longer needs to have instances of any other stores, apart from those which are active.
* All store data is now synchronised back to the central server. Previously there was a store preference to control whether or not dispensary data was synchronised (done in order to reduce sync traffic from busy dispensary stores).
* Transfers and merges are done on the remote site. Previously they were done on the central server.
* Soft delete is implemented for `item` and `name` tables via a `status` field, which is used for statuses such as `merged`, a type of delete, and `draft`, used for new unapproved items and names. The default status of records is `active`.

## FAQ

* What is a `invoice`?

`invoice` is a table in mSupply (not to be confused with the concept of a SQL invoice). It mainly stores what are commonly thought of as invoices.

* Why do databases have ids?

Previously we have had problems with restoration of backup data or having two sites trying to initialise and claiming to be the same site. Having unique identifiers for each databases prevents this occuring. The central server stores the active database id on initialisation, and will not allow connections from a database with a different identifier (remote site data restoration should always ensure that the stored identifier is deleted).
