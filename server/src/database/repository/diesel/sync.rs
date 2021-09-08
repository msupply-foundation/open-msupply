use crate::database::{
    repository::RepositoryError,
    schema::{ItemRow, NameRow},
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

use super::{get_connection, DBBackendConnection, ItemRepository, NameRepository};

pub enum IntegrationUpsertRecord {
    Name(NameRow),
    Item(ItemRow),
}

pub struct IntegrationRecord {
    pub upserts: Vec<IntegrationUpsertRecord>,
}

#[derive(Clone)]
pub struct SyncRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl SyncRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> SyncRepository {
        SyncRepository { pool }
    }

    pub async fn integrate_records(
        &self,
        integration_records: &IntegrationRecord,
    ) -> Result<(), RepositoryError> {
        let connection = get_connection(&self.pool)?;
        connection.transaction(|| {
            for record in &integration_records.upserts {
                match &record {
                    IntegrationUpsertRecord::Name(record) => {
                        NameRepository::upsert_one_tx(&connection, record)?
                    }
                    IntegrationUpsertRecord::Item(record) => {
                        ItemRepository::upsert_one_tx(&connection, record)?
                    }
                }
            }
            Ok(())
        })
    }
}
