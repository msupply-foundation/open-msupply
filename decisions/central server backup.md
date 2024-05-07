# Central server back up

- *Date*: 
- *Deciders*: 
- *Status*: 
- *Outcome*: 

## Intro

Remote sites are backed up by synchronisation to the central server. 
mSupply central server is backed up on a schedule, it also contains journal (write ahead log of sort) of the changes since last backup. 
We started to use omSupply central server functionality, which now included both central and remote data, which is syncrhonised from remote site to omSupply central server, but not to mSupply central server.

### 1 - mSupply and omSupply central backups align
It's quite important that backups for both servers are bundled (both backed up at the same time), as per below example (consider v5 = Supply and v6 = omSupply):

v6 record (A) references v5 record (B). If v5 backup is before B was created but v6 backup is after A was created, we could have broken reference on A record.

### 2 - Remote sites ahead of omSupply central backups

If omSupply central data is lost there is a chance that after restore, remote sites data would be ahead of omSupply central data, for example:

v6 cursors is 100 on remote site, last backup of omSupply central site is taken when change log latest cursor is 90. After omSupply central data restore, change log latest cursor would be at 90, if 10 more records are added to change log on central, they will not find their was to remote sites since remote site will be asking for change logs > 100. 

### 3 - Partial corruption

There is a use case where either mSupply or omSupply central becomes corrupted (rather then the whole machine, where both would be corrupted).

## Requirements

1. Reduce chance of loosing data by automated backup of omSupply central server
2. A mechanism to align mSupply and omSupply central server data, or reduction of misalignment impact
3. A mechanism to align omSupply remote and omSupply central server data, or reduciont of misalignment impact
4. Partial corruption needs to be considered and

## Options

### Option 1 - Postgres backup with WAL

Whenever mSupply is backed up, omSupply back up is triggered (using pg dump of the whole database), both backups are bundled into single archive. Make sure that postgres instance is using WAL, which is also backed up.

If server data becomes corrupt 

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