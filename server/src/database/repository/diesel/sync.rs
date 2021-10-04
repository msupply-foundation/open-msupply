use super::{
    master_list::MasterListRepository, master_list_line::MasterListLineRepository,
    master_list_name_join::MasterListNameJoinRepository, DBBackendConnection, ItemRepository,
    NameRepository, StorageConnectionManager, StoreRepository,
};

use crate::database::{
    repository::RepositoryError,
    schema::{ItemRow, MasterListLineRow, MasterListNameJoinRow, MasterListRow, NameRow, StoreRow},
};

use diesel::r2d2::{ConnectionManager, Pool};

pub enum IntegrationUpsertRecord {
    Name(NameRow),
    Item(ItemRow),
    Store(StoreRow),
    MasterList(MasterListRow),
    MasterListLine(MasterListLineRow),
    MasterListNameJoin(MasterListNameJoinRow),
}

pub struct IntegrationRecord {
    pub upserts: Vec<IntegrationUpsertRecord>,
}

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
        let manager = StorageConnectionManager::new(self.pool.clone());

        let con = manager.connection()?;
        let result = con
            .transaction(|con| async move {
                for record in &integration_records.upserts {
                    match &record {
                        IntegrationUpsertRecord::Name(record) => {
                            NameRepository::new(con).upsert_one(record)?
                        }
                        IntegrationUpsertRecord::Item(record) => {
                            ItemRepository::new(con).upsert_one(record)?
                        }
                        IntegrationUpsertRecord::Store(record) => {
                            StoreRepository::new(con).upsert_one(record)?
                        }
                        IntegrationUpsertRecord::MasterList(record) => {
                            MasterListRepository::new(con).upsert_one(record)?
                        }
                        IntegrationUpsertRecord::MasterListLine(record) => {
                            MasterListLineRepository::new(con).upsert_one(record)?
                        }
                        IntegrationUpsertRecord::MasterListNameJoin(record) => {
                            MasterListNameJoinRepository::new(con).upsert_one(record)?
                        }
                    }
                }
                Ok(())
            })
            .await?;
        Ok(result)
    }
}
