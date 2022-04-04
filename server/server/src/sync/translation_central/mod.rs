mod item;
mod list_master;
mod list_master_line;
mod list_master_name_join;
mod name;
mod store;
pub mod test_data;
mod unit;

use crate::sync::translation_central::{
    item::ItemTranslation, list_master_line::MasterListLineTranslation,
    list_master_name_join::MasterListNameJoinTranslation,
};
use repository::{
    schema::{
        CentralSyncBufferRow, ItemRow, MasterListLineRow, MasterListNameJoinRow, MasterListRow,
        NameRow, StoreRow, UnitRow,
    },
    ItemRepository, MasterListLineRowRepository, MasterListNameJoinRepository,
    MasterListRowRepository, NameRepository, RepositoryError, StorageConnection,
    StoreRowRepository, TransactionError, UnitRowRepository,
};

use log::{info, warn};

use self::{
    list_master::MasterListTranslation, name::NameTranslation, store::StoreTranslation,
    unit::UnitTranslation,
};

use super::{SyncImportError, SyncTranslationError};

#[derive(Debug, PartialEq, Eq)]
pub enum IntegrationUpsertRecord {
    Unit(UnitRow),
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

pub trait CentralPushTranslation {
    fn try_translate(
        &self,
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<IntegrationUpsertRecord>, anyhow::Error>;
}

/// Translates sync records into the local DB schema.
/// Translated records are added to integration_records.
fn do_translation(
    sync_record: &CentralSyncBufferRow,
    records: &mut IntegrationRecord,
) -> Result<(), SyncTranslationError> {
    let translations: Vec<Box<dyn CentralPushTranslation>> = vec![
        Box::new(NameTranslation {}),
        Box::new(UnitTranslation {}),
        Box::new(ItemTranslation {}),
        Box::new(StoreTranslation {}),
        Box::new(MasterListTranslation {}),
        Box::new(MasterListLineTranslation {}),
        Box::new(MasterListNameJoinTranslation {}),
    ];
    for translation in translations {
        match translation.try_translate(sync_record) {
            Ok(Some(result)) => {
                records.upserts.push(result);
                return Ok(());
            }
            Err(error) => warn!(
                "Failed to translate ({}): {:?}",
                SyncTranslationError {
                    table_name: sync_record.table_name.clone(),
                    source: error,
                    record: format!("{:?}", sync_record.data),
                },
                sync_record
            ),
            _ => {
                log::info!(
                    "Ignore central record: table: \"{}\", record id: {}",
                    sync_record.table_name,
                    sync_record.record_id
                );
            }
        };
    }

    Ok(())
}

pub const TRANSLATION_RECORD_NAME: &str = "name";
pub const TRANSLATION_RECORD_UNIT: &str = "unit";
pub const TRANSLATION_RECORD_ITEM: &str = "item";
pub const TRANSLATION_RECORD_STORE: &str = "store";
pub const TRANSLATION_RECORD_LIST_MASTER: &str = "list_master";
pub const TRANSLATION_RECORD_LIST_MASTER_LINE: &str = "list_master_line";
pub const TRANSLATION_RECORD_LIST_MASTER_NAME_JOIN: &str = "list_master_name_join";

/// Returns a list of records that can be translated. The list is topologically sorted, i.e. items
/// at the beginning of the list don't rely on later items to be translated first.
pub const TRANSLATION_RECORDS: &[&str] = &[
    TRANSLATION_RECORD_NAME,
    TRANSLATION_RECORD_UNIT,
    TRANSLATION_RECORD_ITEM,
    TRANSLATION_RECORD_STORE,
    TRANSLATION_RECORD_LIST_MASTER,
    TRANSLATION_RECORD_LIST_MASTER_LINE,
    TRANSLATION_RECORD_LIST_MASTER_NAME_JOIN,
];

/// Imports sync records and writes them to the DB
/// If needed data records are translated to the local DB schema.
pub async fn import_sync_records(
    connection: &StorageConnection,
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
    store_integration_records(connection, &integration_records).await?;
    info!("Successfully stored integration records");

    Ok(())
}

fn integrate_record(
    record: &IntegrationUpsertRecord,
    con: &StorageConnection,
) -> Result<(), RepositoryError> {
    match &record {
        IntegrationUpsertRecord::Name(record) => NameRepository::new(con).upsert_one(record),
        IntegrationUpsertRecord::Unit(record) => UnitRowRepository::new(con).upsert_one(record),
        IntegrationUpsertRecord::Item(record) => ItemRepository::new(con).upsert_one(record),
        IntegrationUpsertRecord::Store(record) => StoreRowRepository::new(con).upsert_one(record),
        IntegrationUpsertRecord::MasterList(record) => {
            MasterListRowRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::MasterListLine(record) => {
            MasterListLineRowRepository::new(con).upsert_one(record)
        }
        IntegrationUpsertRecord::MasterListNameJoin(record) => {
            MasterListNameJoinRepository::new(con).upsert_one(record)
        }
    }
}

async fn store_integration_records(
    connection: &StorageConnection,
    integration_records: &IntegrationRecord,
) -> Result<(), SyncImportError> {
    connection
        .transaction_sync(|con| {
            for record in &integration_records.upserts {
                // Integrate every record in a sub transaction. This is mainly for Postgres where the
                // whole transaction fails when there is a DB error (not a problem in sqlite).
                let sub_result =
                    con.transaction_sync_etc(|sub_tx| integrate_record(record, sub_tx), false);
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
        .map_err(|error| match error {
            TransactionError::Transaction { msg, level } => SyncImportError::as_integration_error(
                RepositoryError::TransactionError { msg, level },
                "",
            ),
            TransactionError::Inner(e) => e,
        })
}

#[cfg(test)]
mod tests {
    use crate::{
        sync::translation_central::{
            import_sync_records, test_data::store::get_test_store_records,
        },
        test_utils::get_test_settings,
    };
    use repository::{get_storage_connection_manager, test_db};

    use super::test_data::{
        check_records_against_database, extract_sync_buffer_rows,
        item::{get_test_item_records, get_test_item_upsert_records},
        master_list::{get_test_master_list_records, get_test_master_list_upsert_records},
        master_list_line::get_test_master_list_line_records,
        master_list_name_join::get_test_master_list_name_join_records,
        name::{get_test_name_records, get_test_name_upsert_records},
        unit::{get_test_unit_records, get_test_unit_upsert_records},
    };

    #[actix_rt::test]
    async fn test_store_translation_insert() {
        let settings = get_test_settings("omsupply-database-translation-insert");

        test_db::setup(&settings.database).await;
        let connection = get_storage_connection_manager(&settings.database)
            .connection()
            .unwrap();

        let mut records = Vec::new();
        // Need to be in order of reference dependency
        records.append(&mut get_test_name_records());
        records.append(&mut get_test_store_records());
        records.append(&mut get_test_unit_records());
        records.append(&mut get_test_item_records());
        records.append(&mut get_test_master_list_records());
        records.append(&mut get_test_master_list_line_records());
        records.append(&mut get_test_master_list_name_join_records());

        import_sync_records(&connection, &extract_sync_buffer_rows(&records))
            .await
            .unwrap();

        // Asserts inside this method, to avoid repetition
        check_records_against_database(&connection, records).await;
    }

    #[actix_rt::test]
    async fn test_store_translation_upsert() {
        let settings = get_test_settings("omsupply-database-translation-upsert");

        test_db::setup(&settings.database).await;
        let connection = get_storage_connection_manager(&settings.database)
            .connection()
            .unwrap();

        let mut init_records = Vec::new();
        init_records.append(&mut get_test_name_records());
        init_records.append(&mut get_test_unit_records());
        init_records.append(&mut get_test_item_records());
        init_records.append(&mut get_test_master_list_records());
        let mut upsert_records = Vec::new();
        upsert_records.append(&mut get_test_unit_upsert_records());
        upsert_records.append(&mut get_test_item_upsert_records());
        upsert_records.append(&mut get_test_name_upsert_records());
        upsert_records.append(&mut get_test_master_list_upsert_records());

        let mut records = Vec::new();
        records.append(&mut init_records.iter().cloned().collect());
        records.append(&mut upsert_records.iter().cloned().collect());

        import_sync_records(&connection, &extract_sync_buffer_rows(&records))
            .await
            .unwrap();

        // Asserts inside this method, to avoid repetition
        check_records_against_database(&connection, upsert_records).await;
    }
}
