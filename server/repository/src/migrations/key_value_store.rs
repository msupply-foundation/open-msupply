use crate::{KeyType, RepositoryError, StorageConnection};
use diesel::prelude::*;

// Local, minimal schema for use inside migrations only — avoids coupling migration
// code to the main repository (whose schema may diverge from the database state being
// migrated). Only the columns needed by migrations are declared.
table! {
    key_value_store (id) {
        id -> Text,
        value_string -> Nullable<Text>,
    }
}

// Cast `id` to TEXT in the WHERE clause so the same query works against both the
// pre-v2.19 Postgres `key_type` enum column and the post-v2.19 TEXT column. On
// SQLite the column is always TEXT, so no cast is needed (and `::` isn't valid).
#[cfg(feature = "postgres")]
const ID_AS_TEXT: &str = "id::TEXT";
#[cfg(not(feature = "postgres"))]
const ID_AS_TEXT: &str = "id";

pub(crate) fn get_string(
    connection: &StorageConnection,
    key: KeyType,
) -> Result<Option<String>, RepositoryError> {
    use diesel::dsl::sql;
    use diesel::sql_types::Text;

    let result: Option<Option<String>> = key_value_store::table
        .filter(sql::<Text>(ID_AS_TEXT).eq(key.to_string()))
        .select(key_value_store::value_string)
        .first(connection.lock().connection())
        .optional()?;
    Ok(result.flatten())
}

// Only updates — callers must guarantee the row already exists (e.g. seeded by the
// base schema). No upsert: a text bind cannot be inserted into the pre-v2.19 enum
// column without an explicit cast to `key_type`, which wouldn't exist post-migration.
pub(crate) fn set_string(
    connection: &StorageConnection,
    key: KeyType,
    value: Option<String>,
) -> Result<(), RepositoryError> {
    use diesel::dsl::sql;
    use diesel::sql_types::Text;

    diesel::update(key_value_store::table)
        .filter(sql::<Text>(ID_AS_TEXT).eq(key.to_string()))
        .set(key_value_store::value_string.eq(value))
        .execute(connection.lock().connection())?;
    Ok(())
}
