# Changelog

A number of operations rely on processing a `queue` of database changes.
These operations include pushing records to central server during synchronisation, processing transfer records, processing messaging, aggregation, interoperability synchronisation, etc.. 

Generic mechanism for recording and querying these database changes was implemented in the form of the `changelog` table.

## Triggers

Database triggers insert new entries into changelog table with:

* cursor <- sequential number for order of database operation
* record_id 
* table_name
* store_id <- the store that `owns` the record
* name_id <- the name_id of the `destination` entity (can also be a store)

## changelog_deduped view

Current use cases require only the latest operation for a particular record, thus a database view is used to query latest operation grouped by unique record_id.

`deduping` is short for deduplication (process of removing identical entries)

## Cursors

The 'cursor' is used by changelog consumers to track which records they have already processed and allow them to start processing again from where they left off.
For example, if the requisition processor has processed all the records until cursor 10, it should record the last cursor it processed (e.g. 10). Next time it starts processing records from the changelog, it will start from cursor number 11. 
Meanwhile the shipment processor could be further ahead, processing cursor number 50. By allowing the processors to track their own cursor value, we don't need a separate queue of unprocessed records for each processor.

Services that use changelog need to manually maintain cursor and persist it using key_value_store repository (get_i64 and set_i64). After a query to changelog repository, next cursor would be `last cursor` in the query output `+ 1`.

## name_id and store_id

Some consumers of changelog need to filter database operations based on `ownership` of the record on current site. 
* Synchroniser should only push records belonging to current site
* Transfer should only process records that are destined for current site

name_id and store_id is stored against records that need to be filtered in this fashion against database operation in changelog. Extra logic is added to triggers for these records to transfer store_id and name_id to changelog.

For some data tables it's not possible to have foreign records on the site, thus name_id and store_id are optional and are set to null for those cases.

## Note

At the time of writing:
* only central server synchronisation and shipment/requisition transfers are using changelog
* name_id and store_id is only stored in changelog for `requistion, requisition_line, invoice and invoice_line`