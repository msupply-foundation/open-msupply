use super::StorageConnection;

use crate::{
    repository_error::RepositoryError,
    schema::diesel_schema::name_store_join::dsl as name_store_join_dsl,
    schema::{NameRow, NameStoreJoinRow, StoreRow},
};

use diesel::prelude::*;
use uuid::Uuid;

pub struct NameStoreJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameStoreJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameStoreJoinRepository { connection }
    }

    // TODO needs to be done for M1 as name_store_joins are not synced yet but are required in API
    // these records should actually sync from server in remote sync
    // for now we create/update name_store_join for every name
    pub fn m1_add(&self) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::name_table::dsl as name_dsl;
        use crate::schema::diesel_schema::store::dsl as store_dsl;

        let names: Vec<NameRow> = name_dsl::name_table.load(&self.connection.connection)?;
        let stores: Vec<StoreRow> = store_dsl::store.load(&self.connection.connection)?;

        let joins: Vec<NameStoreJoinRow> =
            name_store_join_dsl::name_store_join.load(&self.connection.connection)?;

        let store_id = match joins.first() {
            Some(join) => join.store_id.clone(),
            None => stores[0].id.clone(),
        };

        for name in names {
            if name.id == stores[0].name_id {
                continue;
            }

            let id = match joins.iter().find(|join| join.name_id == name.id) {
                Some(join) => join.id.clone(),
                None => Uuid::new_v4().to_string(),
            };

            self.upsert_one(&NameStoreJoinRow {
                id,
                name_id: name.id.clone(),
                store_id: store_id.clone(),
                name_is_customer: name.is_customer,
                name_is_supplier: name.is_supplier,
            })?;
        }

        Ok(())
    }

    #[cfg(all(feature = "postgres", not(feature = "sqlite")))]
    pub fn upsert_one(&self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_store_join_dsl::name_store_join)
            .values(row)
            .on_conflict(name_store_join_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(feature = "sqlite")]
    pub fn upsert_one(&self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::replace_into(name_store_join_dsl::name_store_join)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
