# Migrations

- *Date*: 2022-10-19
- *Deciders*: Mark Prins, James Brunskill, Andrei Evguenov
- *Status*: DECIDED
- *Outcome*: Option 2
- *Related Material*: [Database migration Issue](https://github.com/openmsupply/open-msupply/issues/704)

## Requirements

1. Update schema without re-initialising database
2. Migrate data
   a. Before and/or after schema update
   b. Without schema update (just data migration)
3. Do above only for the migrations that are applicable from the current database version to current app version (don't re-run old migrations)
4. Record migration results
5. Easy way to explore full schema (all of the migrations applied, for a particular version)
6. Test data migrations
7. Should work with RC versions
8. (maybe) Consolidate common sql for PG/Sqlite (we have quite a few duplicate sql statements)
9. (maybe) Use strongly typed diesel db if possible, for data migrations
10. Migration code needs to run in isolation (no production code should run in parallel)

## Examples/Extra

### 2.a 

There might be a need to do multiple schema and data updates within one version upgrade. For example if a required field is added that needs to be populated with some value derived from existing database values, we would want to:
* add schema without the constraint
* add the values 
* add the constraint

Another example is when sync buffer was consolidated:
* Add new sync buffer
* Copy rows from remote and central to the new sync buffer (see proposed solution, that touches on `9.`)
* Remove old sync buffer

Above can also be done by keeping existing sync buffer in memory than doing one schema migration with adding and removing sync buffer then populating new sync buffer from memory. 

I think it's better to keep migrations flexible, without a particular pattern of operation sequence.

### 2.b

If we add a new field/table in central and remote is not up to date, the field/table will still be synced and recorded in sync buffer. And when we update to a new version of remote that has this new field/table we can just crawl through sync buffer and try to re-integrate this new field/table. This avoids needing to re-sync this info, and we can avoid implementing this mechanism

Remote data should be safe with above example, as central shouldn't be updating foreign data.

### 4.

General data about migration result should be logged for debugging purposes, and on migration failure we can't guarantee correct behaviour of the app, so we would need to either disable server and not allow it to start again or revert to previous data version and inform the admin/user that app can be downgraded. 

I think ability to revert to previous version (on failure) allows for system to be available to the users in timely manner, in case errors in migration occur.

This might be quite difficult for Android, but look like there is a way (https://blog.esper.io/adb-29-how-to-downgrade-rollback-app/)/

It was noted that long transaction rollbacks have been problematic in the past (in other systems). Would need to make sure user is aware of the migration progress and could potentially do a backup/restore vs transaction and rollback.

### 6.

This could be tricky especially if we want to use diesel db strong typing. I think this in necessary and very important, we've had some major failures in the past with data migrations.

### 7.

Say we are on version 1.01, and are working on version 1.02, before deployment we should be able to:
* Make an RC version, say 1.02-RC1
* Test upgrade of 1.01 database  to 1.02-RC1 (just by replacing binary)
* RC versions should not be upgradable, if you open RC version and there is a version mismatch then user should be warned that version are incompatible (this is to avoid additions to migrations that won't run or won't be tested). To extend above example, if in 1.02-RC1 we find a bug in migration, then we fix it, and create 1.02-RC2, if we try to open 1.02-RC1 with 1.02-RC2 we should have an error saying they are not compatible
* When we happy with 1.02, it's released and 1.01 would be upgradable to 1.02

In one sentance, to avoid extra use cases during development, RC versions are only compatible with the same RC version (shouldn't be able to upgrade RC version).

### 9.

Since our diesel type from previous version wont' be compatible with new version we might need to resolve to using raw sql statements to migrate data, I would prefer if we copy and paste data types from pre migrated version to do data migrations (see example in proposed solutions)

### 10.

Would assume that we always run migrations on startup and that production code will not run until migrations are finished. There would need to be an indication that server is under maintenance and indication of migration progress in UI

## Options

### Option 1 - Migrate with SQL

Migrate data directly with SQL statements.
Version number would need to be in migration folder name

*Pros:*
- Keeps with existing

*Cons:*
- Would be hard to insert a test for a particular version
- For more complex data migration SQL is pretty hard to read / change
- Couldn't quite do `8.`
- Less visibility to the `internals` and quite rigid (i.e. does it happen in transaction ?)

### Option 2 - Our own migration mechanism

Write our own migration code, following visitor pattern. Since schema migrations are just sql statements, we can run raw sql to accomplish the task. Migration should run within transaction to allow reverting upgrade as per **4**. Visitor implementation should be simple, it should be able to tell the caller that this migration is need and have a method that runs migration (which just take in connection). The driver of migrations can set the version after each successful migration.

#### Example - Driver

```rust
const VERSION = "1.03.00";

fn migrate(con: &StorageConnection, version: Option<u32>) -> anyhow::Error {
    // This method can be called in tests with required version, None for version would mean it will update to current version
    let version = version.unwrap_or(VERSION)

    let migrations: Vec<Box<dyn Migration>> = vec![V1_02, V1_03];

    // if version(con) is above VERSION, warn user that version mismatch

    for migration in migrations {
        let current_db_version = version(con); // Version is stored in key value store
        let migration_version = migration.version();
        // If VERSION is below migration_version panic (forgot to update VERSION but new migration was added)
        let version = migration.version();
        if current_db_version < version {
            let result = con.tx(|_| {
                migration.migrate(con)?;
                increment_version(con, version); // Version is stored in key value store
            });
            // Do something with result
        }
    }
    increment_version(con, from_text_version(version)); // Current version
}
```

#### Example - Migration without data

```rust 
impl Migration for V1_05 {
  fn version() -> u32 {
    from_text_version("1.05.00")
  }

  fn migrate(connection: &StorageConnection) -> anyhow::Error {
    sql_query(r#"
        CREATE NEW TABLE(
            # table here
        )
    "#).execute(&connection)?;
  }
}
```

### Example - Migration with data and test

```rust

const prepare = r#"
   CREATE TABLE buffer (
    # something here
   )
"#;

const finalised = r#"
   DELETE TABLE remote_buffer;
   DELETE TABLE central_buffer;
"#;

// Since this won't exist in code base anymore, have to copy paste from deleted, similar if table definitions were changed

table! {
    remote_buffer (id) {
        id -> Text,
        thing -> Nullable<Text>,
    }
}
// Since this won't exist in code base anymore, have to copy paste from deleted, similar if table definitions were changed
table! {
    central_buffer (id) {
        id -> Text,
        thing -> Nullable<Text>,
    }
}
// Since this won't exist in code base anymore, have to copy paste from deleted, similar if table definitions were changed
#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "remote_buffer"]
pub struct RemoteBuffer {
    pub id: String,
    pub thing: Option<String>,
}
// Since this won't exist in code base anymore, have to copy paste from deleted, similar if table definitions were changed
#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "central_buffer"]
pub struct RemoteBuffer {
    pub id: String,
    pub thing: Option<String>,
}

// NOTE: Re above, another way would be to move the whole repository to migration scripts (when that repository is deleted/changed)

struct V1_02;

impl Migration for V1_02 {
  fn version() -> u32 {
    from_text_version("1.03.01")
  }

  fn migrate(connection: &StorageConnection) -> anyhow::Error {
    sql_query(&prepare).execute(&connection)?;
    
   let remote: Vec<RemoteBuffer> =  remote_buffer::dsl.load(connection);
   let central: Vec<RemoteBuffer> =  remote_buffer::dsl.load(connection);
   // Since buffer repository will now exist in code base, can use it from repository
   BufferRepository::new(connection).upsert_many(remote.iter().map(/* translate to new Buffer */));
   BufferRepository::new(connection).upsert_many(central.iter().map(/* translate to new Buffer */));

    sql_query(&finalised).execute(&connection)?;
  }
}

#[test]
fn test() {
   let con = init_database("test");
   migrate(con, V1_01.version());

   diesel::insert_into(remote_buffer::dsl::remote_buffer).values(&RemoteBuffer {
    // Some mock values
   }).execute(&con)?;

   diesel::insert_into(central_buffer::dsl::central_buffer).values(&CentralBuffer {
    // Some mock values
   }).execute(&con)?;

   migrate(con, V1_02.version());

   assert_eq!(BufferRepository::new(connection).all(), vec![Buffer {/* some mock values */}, Buffer {/* some mock values */}];
}
```

Above should explain how most of the requirements are met, `8.` can be met using cfg flags for pg/sqlite if they differ. If they differ only slightly like `item_stats/up.sql`, we can replace the difference (once again with cfg flags)

It should be very easy to navigate to any given migration if they are located in their own file or directory. 

`5.` can be dealt with by exporting to `schema spy` for each version, and hosting on github actions.
`4.` As for logging, can be logged to files for now (but we do want further issue/discussion about logging) {insert issue here}

*Pros:*
- Ability to add tests (at the very least to avoid manual vaidation that data migrations work)
- Flexibility and visibility of migration mechanism (can do more complex migrations, use transactions etc..)
- Data manipulation consistency (as in we use diesel for most data manipulations now, can continue down that path for data migrations)

*Cons:*
- A bit more work upfront
- Sligtly more overhead (although I think this is negligible)

## Decision

I suggest to go with `Option 2`, I don't think there is much work to make it happen (2-3 hours for the core and half a day to fill the gaps like logging etc..)

## Mobile Considerations

We want to display an error somehow if migration fails, not actually sure what happens right now if there is say database error during startup. Could potentially have another graphql schema `migration`, and another table to record migration results, similar to sync status.