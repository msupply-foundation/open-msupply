use crate::diesel::connection::SimpleConnection;
use crate::diesel::RunQueryDsl;
use crate::diesel_helper_types::Count;
use crate::StorageConnection;
use diesel::result::Error;

// This file defines the base database migrations that gets run when creating new database from scratch
// This means new installs shouldn't need to run as many migrations, as long as this is kept up todate.
// I've used the test db templating feature to get a `base` database to use for tests and initialisation of a new db.

// To refresh run tests to create template databases, then run...
//  pg_dump -h localhost -U postgres -d ___template_1.0.4 --inserts  --no-owner --no-privileges --schema=public | sed -E '/^\\(un)?restrict [A-Za-z0-9]+$/d' | sed '/^CREATE SCHEMA public;$/d' | sed "s/SELECT pg_catalog.set_config('search_path', '', false);/SET search_path = public;/" > repository/src/base_migrations/postgres_earliest.sql
#[cfg(feature = "postgres")]
pub const BASE_SCHEMA_EARLIEST: &str = include_str!("base_migrations/postgres_earliest.sql");

// pg_dump -h localhost -U postgres -d ___template_2.15.0 --inserts  --no-owner --no-privileges --schema=public | sed -E '/^\\(un)?restrict [A-Za-z0-9]+$/d' | sed '/^CREATE SCHEMA public;$/d' | sed "s/SELECT pg_catalog.set_config('search_path', '', false);/SET search_path = public;/" > repository/src/base_migrations/postgres_latest.sql
#[cfg(feature = "postgres")]
pub const BASE_SCHEMA_LATEST: &str = include_str!("base_migrations/postgres_latest.sql");

// sqlite3 repository/test_output/___template_1.0.4.sqlite .dump > repository/src/migrations/base_migrations/sqlite_earliest.sql
#[cfg(not(feature = "postgres"))]
pub const BASE_SCHEMA_EARLIEST: &str = include_str!("base_migrations/sqlite_earliest.sql");

// To refresh run tests to create template databases, then run... (change version number to latest)
// sqlite3 repository/test_output/___template_2.15.0.sqlite .dump >  repository/src/migrations/base_migrations/sqlite_latest.sql
#[cfg(not(feature = "postgres"))]
pub const BASE_SCHEMA_LATEST: &str = include_str!("base_migrations/sqlite_latest.sql");

#[cfg(not(feature = "postgres"))]
const EMPTY_DB_QUERY: &str = "
    SELECT COUNT(*) as count FROM sqlite_master 
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%';
";

#[cfg(feature = "postgres")]
const EMPTY_DB_QUERY: &str = "
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public';
";

pub fn is_empty_db(conn: &StorageConnection) -> Result<bool, Error> {
    let result: Count = diesel::sql_query(EMPTY_DB_QUERY).get_result(conn.lock().connection())?;
    Ok(result.count == 0)
}

pub fn initialize_latest_db(conn: &StorageConnection) -> Result<(), Error> {
    conn.lock().connection().batch_execute(BASE_SCHEMA_LATEST)?;
    Ok(())
}

pub fn initialize_earliest_db(conn: &StorageConnection) -> Result<(), Error> {
    conn.lock()
        .connection()
        .batch_execute(BASE_SCHEMA_EARLIEST)?;
    Ok(())
}
