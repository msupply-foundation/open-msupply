use diesel::prelude::*;

use super::StorageConnection;
use crate::repository_error::RepositoryError;
use crate::schema::diesel_schema::key_value_store::dsl as kv_store_dsl;
use crate::schema::{KeyValueStoreRow, KeyValueType};

pub struct KeyValueStoreRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> KeyValueStoreRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        KeyValueStoreRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn set_string(
        &self,
        key: KeyValueType,
        value: Option<String>,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(kv_store_dsl::key_value_store)
            .values(KeyValueStoreRow {
                id: key.clone(),
                value_string: value.clone(),
            })
            .on_conflict(kv_store_dsl::id)
            .do_update()
            .set(KeyValueStoreRow {
                id: key,
                value_string: value,
            })
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn set_string(
        &self,
        key: KeyValueType,
        value: Option<String>,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(kv_store_dsl::key_value_store)
            .values(KeyValueStoreRow {
                id: key,
                value_string: value,
            })
            .execute(&self.connection.connection)?;
        Ok(())
    }

    fn get_row(&self, key: KeyValueType) -> Result<Option<KeyValueStoreRow>, RepositoryError> {
        let result = kv_store_dsl::key_value_store
            .filter(kv_store_dsl::id.eq(key))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn get_string(&self, key: KeyValueType) -> Result<Option<String>, RepositoryError> {
        let row = self.get_row(key)?;
        Ok(row.map(|row| row.value_string).flatten())
    }
}
