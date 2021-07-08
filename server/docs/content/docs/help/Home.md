+++
title = "Home"
description = "Home"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 30
sort_by = "weight"
template = "docs/page.html"

[extra]
lead = "Home"
toc = true
top = false
+++

# Welcome to the Open mSupply Server Developer Documentation

## Synchronisation

* Synchronisation is key to the way mSupply works.
* Public docs on v1 to v4 of our sync API are [here](https://docs.msupply.org.nz/other_stuff:remote_sync).
* Open mSupply only supports the v5  sync API.

### Terminology

* `Central server` - a _single_ server in the system that all remote sites synchronise with.
* `Remote site` - a site where at least one store is active (a.k.a. an `offline store`). It might be running mSupply mobile, mSupply single user or mSupply multi-user.
* `Primary site` - a _single_ remote site which can edit central data.
* `Site` - a single instance of mSupply.

* `Store` - a site can have multiple stores. Stores share central data, but maintain their own remote store data (in the same tables on the same site, but delineated by `<table>.store_id` fields:
  * A store has an `active` instance on a single remote site, where its data is editable, and a `collector` instance on the central server, where its data is read-only.
  * Inter-store visibility is symmetrical i.e. if store name A is visible in store B, then store name B is also visible in store A => transfers can go both ways.

* `transaction` is a table in mSupply, as opposed to an SQL `START TRANSACTION` - it mainly stores what are commonly thought of as invoices.

* `Central data` is only editable on the primary site, and syncs out to all sites via the central server:
  * The main types of central data are items, facilities and categories.
* `Central store data` is only editable on the central server, and syncs out to the site where the store is active:
  * The main types of central store data are store records themselves, store preferences and visibility records.
* `Remote data` (a.k.a. `store data`) is only editable on a single remote site, and syncs to the central server:
  * The main types of remote data are transactions, requisitions and stocktakes (and their child tables - transaction_lines, requisition_lines etc.).
* `Patient data` is patient-related (or prescriber-related) remote data i.e. it is only editable on a single remote site (the related record's `home site`), but it syncs out to all sites where the related record is visible (via the central server):
  * The main types of patient data are patient name records themselves, prescribers, patient medication records and insurance policies.

### Basic principles

* Any given record is only editable on a _single_ site - data in most tables is defined as either central or remote data, with some exceptions. Each record has a unique UUID.
* All sync is initiated by the remote site. The central server waits to be polled.
* Remote sites push any changed records before they pull (i.e. request the central server for any changes it has made).
* All requests are HTTPS (clients can choose whether to accept self signed certs).
* All HTTP bodies are JSON.
* Endpoints are RESTful, with the base route being `api/sync/v5/`.
* Authentication is via basic HTTP auth, which returns a JWT. That JWT must be submitted with any future requests. The JWT encodes:
  * The site ID (u32).
  * A UUID for the active database. Previously we have had problems with restoration of backup data or having 2 sites try to initialise claiming to be the same site- this prevents that, as on initialisation, the central server stores the active database ID, and will not allow connections from a database with a different ID (remote site data restoration code needs to ensure the stored ID is wiped).

### Central sync

* There are 2 types of sync on the central server:
  * Queue based:
    * When a record is modified or, for some other reason (e.g. it is part of a transfer, or related to a patient), needs to be sent to a remote site, a record is inserted into the `sync_out` table. This record has fields for table_name, record_id, and destination_site_id.
    * When a remote site connects and requests records, the central server queries the sync_out table for records for that site. It fetches X records by querying the defined table and record_id and serialising the each record to JSON, bundling X records into a JSON array, and responding to the client request with those records.
    * The client responds when it has successfully saved all records, and the central server deletes the records from the queue.
  * Change_log based:
    * Most central data changes need to go to all sites. If, for instance, you have 20,000 remote sites, each edit to a remote site would result in 20K sync_out records being created. Further if any number of those remote sites are stale and do not connect, the sync_out table gets clogged with stale records. Enter the `central_change_log` table.
    * The `central_change_log` table has a single record for each record of central data. This record has a U64 serial number (Hello Postgres, with your U32 vacuum cleaning ;-)  ). When a record is modified or inserted, the counter for that is incremented to the next highest number.
    * Each remote site keeps a cursor for where it is "up to" in its retrieval from the central_change_log - on connection, it tells the server to fetch all records > that number. As it retrieves records sequentially, it increments its cursor. There is no need to confirm receipt with the central server - remote sites are responsible for maintaining their own cursor.

### Changes from previous versions

* The central_change_log is new.
* Stores on the central server can only be collector (previously they could also be active) => each store is active on _exactly_ one _remote_ site; the central server has full read-only instances of all stores (when fully synced).
* Stores on a remote site can only be active` (previously they could also be collector or transfer) => remote sites can no longer have full read-only instances of stores which are active on other sites; transfers are governed by the visibility of the "other" store name in the initiating store.
* Previously, most central servers were also the primary site - now that functionality is separated out (c.f. mirrored systems), so that the primary site is just a special remote site.
* Stores and visibility are controlled on the central server - previously, for a mirrored system, they were controlled on the primary site => the primary site no longer needs to have instances of any other stores, apart from those which are active.
* All store data is now synced back to the central server - previously there was a store preference to control whether or not dispensary data was synced (to reduce sync traffic from busy dispensary stores).
* Transfers and merges are done on the remote site - previously they were done on the central server.
* Soft delete is implemented for item and name tables via a `status` field (with other statuses such as "merged" (a type of delete) and "draft" for new unapproved items and names). The status of "normal" records is `active`.
