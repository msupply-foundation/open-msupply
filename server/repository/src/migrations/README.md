# Database Migrations

Rust (manual) migrations were introduced in version 1.1.0 of omSupply, as per [this KDD](../../../../decisions/migrations.md). Diesel migrations in /server/repository/migrations directory were kept, but any further migrations should follow pattern described in this readme.

## Migration Examples and Templates

It's a good idea to explore `./templates` folder for examples of schema, data and data + schema migrations, you can copy and paste them as a starting point for a new migration.

If you are exploring `./templates` folder it's best to look at them in this order: `adding_table`, `data_migration`, `data_and_schema`, `add_data_from_sync_buffer`.

## Manual migrations overview

`Database version` is stored in [key_value_store] table under `DATABASE_VERSION` key, current `app version` is specified in [root package.json](../../../../package.json). 

During startup server will run [these steps sequentially](mod.rs):

1. Run through diesel migrations
2. Query for `database version` of the database
3. Using visitor pattern will try to run any migrations that are higher then `database version` (database version will be updated after each migration)
4. Will run any migration fragments that have not been run yet where migration are higher or equal to `database version`
5. Finally database version is set to `app version` ([root package.json](../../../../package.json) is embedded in binary)

Each migration implements three methods in migration visitor trait, version(), migrate() and migration_fragments(). Test database can be created for any database version, this allows us to test migrations (see templates for examples).

`migrate()` are one time migrations

`migrate_fragments()` will re-run any migration fragments that have not been run yet in current migration (*NOTE*: this is the preferred way to add migrations from version 2.2)


Diesel dsl can be used in data migrations, however, for some operations sql statement are prefered, see `Raw SQL vs Diesel` below.

## How to add migration

Identify next version, see [package.json](../../../../package.json) for current version, then increment `patch` by one (we use semantic versioning syntax for our version number, but our app versioning wouldn't necessarily follow SemVer guidelines which are aimed at publicly consumed packages and libraries, see [version.rs](./version.rs) for more details).

Increment [package.json](../../../../package.json) version to the new version and create new migration folder with the version number. Copy template or existing migration, and rename to new version appropriately. 

Add new version mod to [root migrations mode](mod.rs) and add new version to `vec!` of visitors. Add actual migration code and tests, through tests you should be able to check sql syntax and data migration logic without starting server.

## Migration Fragments

We had two issues with migrations:

1 - Migrations were disabled in RC versions, and if we had schema patches, QA team found it hard to constantly re-initialise database and add new test data etc...
2 - In development, while changing branches, newly added migrations did not run, again requiring manual re-run of those migrations

This is why Migration Fragments were added, via `migration_ragments()` method on Migration trait. 

*With great power comes great responsibility*

There was a deliberate restriction to not allow RC migrations, and to restrict migration to `one time` during develop because it could cause an 'unknown state' of database, as outlined in use cases below. However, most of the time migration patches done in development or in RC testing phase can be executed safely in isolation with Migration Fragments. There are still so many use cases where migrations could cause undefined database state, here are some examples of flexibility of Migration Fragments and gotchas.

1 - We start with adding a [new migration and a new table](https://github.com/msupply-foundation/open-msupply/compare/c95609f818f171bf106e8124c7ee87815d5f996e...4ede6643460459cb9a1bff4bbeea924bdb6c2e54).

2 - [A field is added to that table](https://github.com/msupply-foundation/open-msupply/compare/4ede6643460459cb9a1bff4bbeea924bdb6c2e54...c53a65e19f1894baae7c2568aa8800fb69941a8d) (make sure it has reasonable defaults if it the column is not optional !). You can see that when devs are working in parallel on separate migrations, it should be possible to add consolidate migrations with these method, quite easily (since each fragment should be applied independently).

3 - Modifying a field would require quite a lot of SQLite code, but we [can drop table and re-create it](https://github.com/msupply-foundation/open-msupply/compare/c53a65e19f1894baae7c2568aa8800fb69941a8d...71fbfb75a003f78cb29b678c6d1ade8810b98748).

*Gotcha*

Above quite works for simple cases, but it introduces too many use cases to work through, you should be at least aware of the surface area:

If there is a field name change or field deletion or type change in a new branch, to which you switched and migrated. But then you switch back to develop for example, now we are in undefined state since rust logic will reference old fields and would expect old data types etc.

If we added a reference to new table in another table, in parallel while between 2-3 were being worked on then migration will fail.

Looking at 3 we may think it could be simplified by changing the identifier and [adding one drop clause](https://github.com/msupply-foundation/open-msupply/compare/c53a65e19f1894baae7c2568aa8800fb69941a8d...70827e95d03d359e80d967ac8e7ef29fe9ee72b3). This could work for in you in the branch you are working in, but then if you switch back to base branch, the previous migration fragments will try to be executed and will cause migration error

Please be very mindful and vigilant when working with migration fragments, especially when doing major schema changes. And be aware of logic error that won't be caught at compile time.


## Raw SQL vs Diesel

Ideally we would be using existing repositories for data migrations, but this will break as soon as new migrations change schema and repositories are updated. We can achieve almost any type of migration with raw sql statement, both data and schema, but some raw sql logic is hard to either read/write or keep consistent between sqlite and postgres. On the other hard, using diesel definitions comes with a lot of boilerplate, and can also be hard to read/write but it can help with serialisation and difference in sqlite and postgres syntax. Although at the time of writing this README.md there is no defined standard or guideline of when to use raw sql vs diesel dsl, some effort was made to show when one is better then the other in `./templates`. A quick summary:
* In most cases, for schema migrations its easier to use raw sql statements, there is small variation in syntax, mainly types, but with a help of simple `sql!` macro and common [types](types.rs) it looks clean and trivial, see [adding table](templates/adding_table/mod.rs)
* Inserting mock data sql looks the same, and we can use use diesel `.bind` to serialise more complex types like `NaiveDateTime`, as demonstrated in [data migration template](templates/data_migration/mod.rs)
* Since raw sql query still requires a struct to save a result in, I found that adding diesel `table!` with minimum fields has about the same amount of code and allows for a way to select a result into a tuple and opens a way to use diesel dsl for queries and updates, [again in data migration template, query/update in migration and query in test](templates/data_migration/mod.rs)
* Updates in the templates could have been done with sql, using diesel dsl felt just as easy and in examples use cases updates were done in in `depth` of rust code, and for some reason use diesel dsl felt more natural

A quick note about type safety in migrations, since the schema (before/after) is well know at the time of migration and since it shouldn't change in the future, unit test should be adequate to guarantee type safety (i.e. we don't need compiler to tell use that our database types are not aligned with new future schema)

We've also considered using [SeaQL](https://github.com/SeaQL/sea-query), but haven't made any examples, mainly because it's another tool and pattern to learn and refine vs learning a bit more about diesel dsl and also there wasn't that much difference in schema sql syntax (which SeaQL also provides vs diesel), lastly couldn't find `CREATE VIEW` in SeaQL so thought we would at the very least have to use raw sql for that.

## Long Lived/Feature branch migrations

For feature branches it's a good idea to add migrations as some `future` major version, this version should be much higher then base branch version. This allows updating from base branch while keeping base branch migrations before feature branch migrations and when feature branch is merged to base branch we can set exact version for feature update.