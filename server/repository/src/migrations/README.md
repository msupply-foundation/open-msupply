# Database Migrations

Rust (manual) migrations were introduced in version 1.0.4 of omSupply, as per [this KDD](../../../../decisions/migrations.md). Diesel migrations in /server/repository/migrations directory were kept, but any further migrations should follow pattern described in this readme.

## Migration Examples and Templates

It's a good idea to explore `./templates` folder for examples of schema, data and data + schema migrations, you can copy and paste them as a starting point for a new migration.

If you are exploring `./templates` folder it's best to look at them in this order: `adding_table`, `data_migration`, `data_and_schema`, `add_data_from_sync_buffer`.

## Manual migrations overview

`Database version` is stored in [key_value_store] table under `DATABASE_VERSION` key, current `app version` is specified in [root package.json](../../../../package.json). 

During startup server will run [these steps sequentially](mod.rs):

1. Run through diesel migrations
2. Query for `database version` of the database
3. Using visitor pattern will try to run any migrations that are higher then `database version` (database version will be updated after each migration)
4. Finally database version is set to `app version` ([root package.json](../../../../package.json) is embedded in binary)

Each migration implements two methods in migration visitor trait, version() and migrate(). Test database can be created for any database version, this allows us to test migrations (see templates for examples).

Diesel dsl can be used in data migrations, however, for some operations sql statement are prefered, see `Raw SQL vs Diesel` below.

## How to add migration

Identify next version, see [package.json](../../../../package.json) for current version, then increment `patch` by one (we use semantic versioning syntax for our version number, but our app versioning wouldn't necesseraly follow SemVer guidelines which are aimed at publicly consumed packages and libraries, see [version.rs](./version.rs) for more details).

**note** everything after `patch` is condiered `pre-release`, and cannot be upgraded further (pre-relase version is really undefined, it could be a test branch or a release candidate), but `pre-release` versions can be used to manually test migrations/functionality in production.

Increment [package.json](../../../../package.json) version to the new version and create new migration folder with the version number. Copy template or existing migration, and rename to new version approprately. 

Add new version mod to [root migrations mode](mod.rs) and add new version to `vec!` of visitors. Add actual migration code and tests, through tests you should be able to check sql syntax and data migration logic without starting server.

## Raw SQL vs Diesel

Ideally we would be using existing repositories for data migrations, but this will break as soon as new migrations change schema and repositories are updated. We can achieve almost any type of migration with raw sql statement, both data and schema, but some raw sql logic is hard to either read/write or keep consistent between sqlite and postgres. On the other hard, using diesel definitions comes with a lot of boilerplate, and can also be hard to read/write but it can help with serialisation and difference in sqlite and postgres syntax. Although at the time of writing this README.md there is no defined standard or guideline of when to use raw sql vs diesel dsl, some effort was made to show when one is better then the other in `./templates`. A quick summary:
* In most cases, for schema migrations its easier to use raw sql statements, there is small variation in syntax, mainly types, but with a help of simple `sql!` macro and common [types](types.rs) it looks clean and trivial, see [adding table](templates/adding_table/mod.rs)
* Inserting mock data sql looks the same, and we can use use diesel `.bind` to serialise more complex types like `NaiveDateTime`, as demonstrated in [data migration template](templates/data_migrations/mod.rs)
* Since raw sql query still require a struct to save a result in, I found that adding diesel `table!` with minimum fields has about the same amount of code and allows for a way to select a result into a tuple and opens a way to use diesel dsl for queries and updates, [again in data migration template, query/update in migration and query in test](templates/data_migrations/mod.rs)
* Updates in the templates could have been done with sql, using diesel dsl felt just as easy and in examples use cases updates were done in in `depth` of rust code, and for some reason use diesel dsl felt more natural

A quick note about type safety in migrations, since the schema (before/after) is well know at the time of migration and since it shouldn't change in the future, unit test should be adequate to guarantee type safety (i.e. we dont' need compiler to tell use that our database types are not aligned with new future schema)

We've also considered using [SeaQL](https://github.com/SeaQL/sea-query), but haven't made any examples, mainly because it's another tool and pattern to learn and refine vs learning a bit more about diesel dsl and also there wasn't that much difference in schema sql syntax (which SeaQL also provides vs diesel), lastly couldn't find `CREATE VIEW` in SeaQL so thought we would at the very least have to use raw sql for that.

## Long Lived/Feature branch migrations

For feature branches it's a good idea to add migrations as some `future` major version, this version should be much higher then base branch version. This allows updating from base branch while keeping base branch migrations before feature branch migrations and when feature branch is merged to base branch we can set exact version for feature update.