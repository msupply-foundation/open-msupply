# Changelog

A number of operations rely on processing a `queue` of database changes. There include pushing records to central server during synchronisation, processing transfer records, processing messaging, aggregation, interoperability synchronisation, etc.. 

Generic mechanism for recording and querying these database changes was implemente in the form of `changelog` table.

## Triggers

Database triggers insert new entries into changelog table with:

* cursor <- sequencial number for order of database operation
* record_id 
* table_name
* store_id
* name_id

## changelog_deduped view

Current use cases require only the latest operation for a particular record, thus a database view is used to query latest operation grouped by unique record_id.

`deduping` is short for deduplication (process of removing identical entries)

## name_id and store_id

Some consumers of changelog need to filter database operations based on `ownership` of the record on current site. 
* Synchroniser should only push records belonging to current site
* Transfer should only process records that are destined for current site

name_id and store_id is stored against records that need to be filtered in this fashion against database operation in changelog. Extra logic is added to triggers for these records to transfer store_id and name_id to changelog.

For some data tables it's not possible to have foreign records on the site, thus name_id and store_id are optional and are set to null for those cases.

## Cursors

Services that use changelog need to manually maintain cursor and persist it using key_value_store repository (get_i64 and set_i64). After a query to changelog repository, next cursor would be `last cursor` in the query output `+ 1`.


## Note

At the time of writing:
* only central server synchronisation and shipment/requisition transfers are using changelog
* name_id and store_id is only stored in changelog for `requistion, requisition_line, invoice and invoice_line`