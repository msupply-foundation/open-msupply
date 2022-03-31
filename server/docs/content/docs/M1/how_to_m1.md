+++
title = "How to M1"
description = "How to M1"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 5
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++

## Setup

[readme](https://github.com/openmsupply/remote-server#remote-server) 

##### Pull Main
##### Get Diesel
```bash
cargo install diesel_cli --no-default-features --features "sqlite-bundled postgres"
```
##### Setup Database

Don't need to start sqlite, migration scripts should do that for you, but if you are using postgres

`docker` -> `./scripts/init_db.sh`, note, init_db.sh might not be executable if it was commited prior to be made executable. You would need to `chmod +x ./scripts/init_db.sh` to make it exectuable

`local` -> make sure to create database matching name in configurations

##### Migrate (Create tables)

```bash
# postgres
diesel migration run --database-url="postgres://[user]:[password]@[localhost]:[port]/[database]" --migration-dir ./repository/migrations/postgres

# sqlite
diesel migration run --database-url [database file] --migration-dir ./repository/migrations/sqlite

# examples
diesel migration run --database-url="postgres://postgres:password@localhost:5432/omsupply-database" --migration-dir ./repository/migrations/postgres

diesel migration run --database-url ./omsupply-database.sqlite --migration-dir ./repository/migrations/sqlite
```

##### Configure

edit `src/configurations/base.yaml`, btw sync.interval is in seconds.

##### Reset ?

if you need to re-initialise etc..

`postgres` -> delete and the create database, run migrations again
`sqlite` -> just remove sqlite file in root of repo

##### Run

Make sure you have a task to do, like make a coffee, or read news before running those

```bash
# postgres
cargo run --features postgres

# sqlite
cargo run --features sqlite
```

(see below about possible sync problem)

## API

Worlds your oyster as they say ?

`http://localhost:8000/graphql` -> there is a built in playground

I personally like `https://graphiql-online.com/`, with voyage and pretty easy query builder 

For all queries you can check out `src/graphql_schema/queries.graphql` (for all queries and mutation, can copy paste into your graphql gui and run one at a time, sorry not all yet will add remainder), in the same folder you'll find `schema.graphl`.

We've also made add_and_issue_stock.graphql, use first query `namesAndItems` to get ids, and second query `addStock` to add stock, and `issueStock` to issue stock. 

###### Add stock variables:
```JSON
 {
    "invoiceId": "new_inoice_id",
    "otherPartyId": "23B1BFF14620469AAE50B79C7164E135",
    "costPricePerPack": 10,
    "lineId": "new_line_id",
    "itemId": "FDD23CE7798F4B109CB486A633DBFFFE",
    "numberOfPacks": 200,
    "packSize": 10,
    "sellPricePerPack": 20
 }
```
###### Issue stock variables:
```JSON
{
  "invoiceId": "new_inoice_id2",
  "otherPartyId": "23B1BFF14620469AAE50B79C7164E135",
  "lineId": "new_line_id2",
  "itemId": "FDD23CE7798F4B109CB486A633DBFFFE",
  "stockLineId": "69cd01b5-3368-4d8f-8337-3ee708f1ade1",
  "numberOfPacks":10
}
```

## How to report problems

It would be great if issues are made with some replication instructions, or at the very least with an error message from console.

You can do `cargo run --features postgres 2>&1 | tee log.log` to show logs in console and at the same time write them to file, which can be a helpful diagnostic if errors arrive.

To share `sqlite` database just share the `.sqlite` file

To share `postgres` database `pg_dump -U postgres omsupply-database > out.sql`

It's also quite good to have postgres log file, if you running `local` version please add `log_statement = 'all'` to `postgres.conf`, you can then share `postgresql.log` (btw i quite like `tail -f` on postgresql.log while deving to see what sql is actually being run).

For `docker postgres`, first find out the current log file:`docker exec postgres_docker cat /var/lib/postgresql/data/current_logfiles`, then to tail `tail -f /var/lib/postgresql/data/log/postgresql-2021-10-20_130619.log` or to cp `docker cp postgres_docker:/var/lib/postgresql/data/log/postgresql-2021-10-20_130619.log log.log`. The exec script should automatically log all statments.


## Known problems and Limitations

##### Sync

Back end schema is pretty strict, pretty much all fk relations are not nullable. This caused a few sync problems, since these constraints are not enforced on mSupply end. You should see a pretty clear warning in postgres if sync fails, when using sqlite this problem is skipped (we were trying to skip records in transaction in postgres too, but had an issue). 
Anyways, one record that we've noticed that can be problematic in master_list_name_join, where name_ID is actually of a name that doens't exists (this happens in other records, like store, but for concrete system records). To metigate this you can run this sql in record browser:

```SQL
select * from list_master_name_join limit 1;
update list_master_name_join set name_id = '' where id not in (
select list_master_name_join.id as name_id from list_master_name_join left join name on list_master_name_join.name_ID = name.ID where name.id is not null);
select * from list_master_name_join limit 1
```

* Central data delete do not sync (no indication on incoming central record that it's a delete)

#### Other

* The following graphql errors are not handled, yet
  * `InvoiceDoesNotBelongToCurrentStore`
  * `StockLineDoesNotBelongToCurrentStore`
  * `InvoiceDoesNotBelongToCurrentStore`
  * `OtherPartyCannotBeThisStoreError`
  * `CannotReverseInvoiceStatus` 
  * `CannotReverseInvoiceStatus` (oops those should be one)
* Optional nullable inputs (on update mutations) (thierReference, comment, expiryDate and batch), wont' be set to null if null is provided
* Can't set expiryDate to null. This also included if stock line is change on invoice line (to a stock line with null expiryDate, invoice line will still show previous stock line expiry date)


