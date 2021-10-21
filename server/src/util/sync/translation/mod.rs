mod item;
mod list_master;
mod list_master_line;
mod list_master_name_join;
mod name;
mod store;
pub mod test_data;

use crate::{
    database::{
        repository::{
            ItemRepository, MasterListLineRepository, MasterListNameJoinRepository,
            MasterListRepository, NameRepository, RepositoryError, StorageConnection,
            StorageConnectionManager, StoreRepository, TransactionError,
        },
        schema::{
            CentralSyncBufferRow, ItemRow, MasterListLineRow, MasterListNameJoinRow, MasterListRow,
            NameRow, StoreRow,
        },
    },
    server::data::RepositoryRegistry,
};

use self::{
    item::LegacyItemRow, list_master::LegacyListMasterRow,
    list_master_line::LegacyListMasterLineRow, list_master_name_join::LegacyListMasterNameJoinRow,
    name::LegacyNameRow, store::LegacyStoreRow,
};

use log::{info, warn};
use thiserror::Error;

#[derive(Error, Debug)]
#[error("Failed to translate {table_name} sync record")]
pub struct SyncTranslationError {
    pub table_name: &'static str,
    pub source: serde_json::Error,
}

#[derive(Error, Debug)]
pub enum SyncImportError {
    #[error("Failed to translate sync records")]
    TranslationError {
        #[from]
        source: SyncTranslationError,
    },
    #[error("Failed to integrate sync records")]
    IntegrationError {
        source: RepositoryError,
        extra: String,
    },
}

impl SyncImportError {
    pub fn as_integration_error<T: std::fmt::Debug>(error: RepositoryError, extra: T) -> Self {
        SyncImportError::IntegrationError {
            source: error,
            extra: format!("{:?}", extra),
        }
    }
}

#[derive(Debug)]
enum IntegrationUpsertRecord {
    Name(NameRow),
    Item(ItemRow),
    Store(StoreRow),
    MasterList(MasterListRow),
    MasterListLine(MasterListLineRow),
    MasterListNameJoin(MasterListNameJoinRow),
}

#[derive(Debug)]
struct IntegrationRecord {
    pub upserts: Vec<IntegrationUpsertRecord>,
}

/// Translates sync records into the local DB schema.
/// Translated records are added to integration_records.
fn do_translation(
    sync_record: &CentralSyncBufferRow,
    records: &mut IntegrationRecord,
) -> Result<(), SyncTranslationError> {
    use IntegrationUpsertRecord::*;
    if let Some(row) = LegacyNameRow::try_translate(sync_record)? {
        records.upserts.push(Name(row));
        return Ok(());
    }

    if let Some(row) = LegacyItemRow::try_translate(sync_record)? {
        records.upserts.push(Item(row));
        return Ok(());
    }

    if let Some(row) = LegacyStoreRow::try_translate(sync_record)? {
        // TODO: move this check up when fetching/validating/reordering the sync records?
        // ignore stores without name
        if row.name_id == "" {
            return Ok(());
        }
        records.upserts.push(Store(row));
        return Ok(());
    }

    if let Some(row) = LegacyListMasterRow::try_translate(sync_record)? {
        records.upserts.push(MasterList(row));
        return Ok(());
    }

    if let Some(row) = LegacyListMasterLineRow::try_translate(sync_record)? {
        records.upserts.push(MasterListLine(row));
        return Ok(());
    }

    if let Some(row) = LegacyListMasterNameJoinRow::try_translate(sync_record)? {
        records.upserts.push(MasterListNameJoin(row));
        return Ok(());
    }

    Ok(()) // At this point we are either ignoring records or record_types
}

pub const TRANSLATION_RECORD_NAME: &str = "name";
pub const TRANSLATION_RECORD_ITEM: &str = "item";
pub const TRANSLATION_RECORD_STORE: &str = "store";
pub const TRANSLATION_RECORD_LIST_MASTER: &str = "list_master";
pub const TRANSLATION_RECORD_LIST_MASTER_LINE: &str = "list_master_line";
pub const TRANSLATION_RECORD_LIST_MASTER_NAME_JOIN: &str = "list_master_name_join";

/// Returns a list of records that can be translated. The list is topologically sorted, i.e. items
/// at the beginning of the list don't rely on later items to be translated first.
pub const TRANSLATION_RECORDS: &[&str] = &[
    TRANSLATION_RECORD_NAME,
    TRANSLATION_RECORD_ITEM,
    TRANSLATION_RECORD_STORE,
    TRANSLATION_RECORD_LIST_MASTER,
    TRANSLATION_RECORD_LIST_MASTER_LINE,
    TRANSLATION_RECORD_LIST_MASTER_NAME_JOIN,
];

/// Imports sync records and writes them to the DB
/// If needed data records are translated to the local DB schema.
pub async fn import_sync_records(
    registry: &RepositoryRegistry,
    records: &Vec<CentralSyncBufferRow>,
) -> Result<(), SyncImportError> {
    let mut integration_records = IntegrationRecord {
        upserts: Vec::new(),
    };

    info!(
        "Translating {} central sync buffer records...",
        records.len()
    );
    for record in records {
        do_translation(&record, &mut integration_records)?;
    }
    info!("Succesfully translated central sync buffer records");

    info!("Storing integration records...");
    store_integration_records(registry, &integration_records).await?;
    info!("Successfully stored integration records");

    Ok(())
}

fn integrate_record(
    record: &IntegrationUpsertRecord,
    con: &StorageConnection,
) -> Result<(), RepositoryError> {
    match &record {
        IntegrationUpsertRecord::Name(record) => NameRepository::new(con).upsert_one(record),
        IntegrationUpsertRecord::Item(record) => ItemRepository::new(con).upsert_one(record),
        IntegrationUpsertRecord::Store(record) => StoreRepository::new(con).upsert_one(record),
        IntegrationUpsertRecord::MasterList(record) => {
            MasterListRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::MasterListLine(record) => {
            MasterListLineRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::MasterListNameJoin(record) => {
            MasterListNameJoinRepository::new(con).upsert_one(record)
        }
    }
}

async fn store_integration_records(
    registry: &RepositoryRegistry,
    integration_records: &IntegrationRecord,
) -> Result<(), SyncImportError> {
    let con = registry
        .get::<StorageConnectionManager>()
        .connection()
        .map_err(|error| SyncImportError::as_integration_error(error, ""))?;
    con.transaction(|con| async move {
        for record in &integration_records.upserts {
            // Integrate every record in a sub transaction. This is mainly for Postgres where the
            // whole transaction fails when there is a DB error (not a problem in sqlite).
            let sub_result = con.transaction_sync(|sub_tx| integrate_record(record, sub_tx));
            match sub_result {
                Ok(_) => Ok(()),
                Err(TransactionError::Inner(err @ RepositoryError::ForeignKeyViolation(_))) => {
                    warn!("Failed to import ({}): {:?}", err, record);
                    Ok(())
                }
                Err(err) => Err(SyncImportError::as_integration_error(
                    RepositoryError::from(err),
                    "",
                )),
            }?;
        }
        Ok(())
    })
    .await
    .map_err(|error| match error {
        TransactionError::Transaction { msg } => {
            SyncImportError::as_integration_error(RepositoryError::as_db_error(&msg, ""), "")
        }
        TransactionError::Inner(e) => e,
    })
}

#[cfg(test)]
mod tests {
    use crate::{
        database::repository::repository::get_repositories,
        server::data::RepositoryRegistry,
        util::{
            sync::translation::{import_sync_records, test_data::store::get_test_store_records},
            test_db,
        },
    };

    use super::test_data::{
        check_records_against_database, extract_sync_buffer_rows,
        item::{get_test_item_records, get_test_item_upsert_records},
        master_list::{get_test_master_list_records, get_test_master_list_upsert_records},
        master_list_line::get_test_master_list_line_records,
        master_list_name_join::get_test_master_list_name_join_records,
        name::{get_test_name_records, get_test_name_upsert_records},
    };

    #[actix_rt::test]
    async fn test_store_translation_insert() {
        let settings = test_db::get_test_settings("omsupply-database-translation-insert");

        test_db::setup(&settings.database).await;
        let registry = RepositoryRegistry {
            repositories: get_repositories(&settings).await,
        };

        let mut records = Vec::new();
        // Need to be in order of reference dependency
        records.append(&mut get_test_name_records());
        records.append(&mut get_test_store_records());
        records.append(&mut get_test_item_records());
        records.append(&mut get_test_master_list_records());
        records.append(&mut get_test_master_list_line_records());
        records.append(&mut get_test_master_list_name_join_records());

        import_sync_records(&registry, &extract_sync_buffer_rows(&records))
            .await
            .unwrap();

        // Asserts inside this method, to avoid repetition
        check_records_against_database(&registry, records).await;
    }

    #[actix_rt::test]
    async fn test_store_translation_upsert() {
        let settings = test_db::get_test_settings("omsupply-database-translation-upsert");

        test_db::setup(&settings.database).await;
        let registry = RepositoryRegistry {
            repositories: get_repositories(&settings).await,
        };

        let mut init_records = Vec::new();
        init_records.append(&mut get_test_name_records());
        init_records.append(&mut get_test_item_records());
        init_records.append(&mut get_test_master_list_records());
        let mut upsert_records = Vec::new();
        upsert_records.append(&mut get_test_item_upsert_records());
        upsert_records.append(&mut get_test_name_upsert_records());
        upsert_records.append(&mut get_test_master_list_upsert_records());

        let mut records = Vec::new();
        records.append(&mut init_records.iter().cloned().collect());
        records.append(&mut upsert_records.iter().cloned().collect());

        import_sync_records(&registry, &extract_sync_buffer_rows(&records))
            .await
            .unwrap();

        // Asserts inside this method, to avoid repetition
        check_records_against_database(&registry, upsert_records).await;
    }
}
