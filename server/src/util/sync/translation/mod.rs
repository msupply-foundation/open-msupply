mod item;
mod list_master;
mod list_master_line;
mod list_master_name_join;
mod name;
mod store;
mod test_data;

use crate::{
    database::repository::{
        repository::IntegrationUpsertRecord, IntegrationRecord, SyncRepository,
    },
    server::data::RepositoryRegistry,
};

use self::{
    item::LegacyItemRow, list_master::LegacyListMasterRow,
    list_master_line::LegacyListMasterLineRow, list_master_name_join::LegacyListMasterNameJoinRow,
    name::LegacyNameRow, store::LegacyStoreRow,
};

#[derive(Debug, Clone)]
pub enum SyncType {
    Delete,
    Update,
    Insert,
}

#[derive(Debug, Clone)]
pub struct SyncRecord {
    record_id: String,
    sync_type: SyncType,
    record_type: String,
    data: String,
}

/// Translates sync records into the local DB schema.
/// Translated records are added to integration_records.
fn do_translation(
    sync_record: &SyncRecord,
    integration_records: &mut IntegrationRecord,
) -> Result<(), String> {
    if let Some(row) = LegacyNameRow::try_translate(sync_record)? {
        integration_records
            .upserts
            .push(IntegrationUpsertRecord::Name(row));

        return Ok(());
    }
    if let Some(row) = LegacyItemRow::try_translate(sync_record)? {
        integration_records
            .upserts
            .push(IntegrationUpsertRecord::Item(row));

        return Ok(());
    }
    if let Some(row) = LegacyStoreRow::try_translate(sync_record)? {
        // TODO: move this check up when fetching/validating/reordering the sync records?
        // ignore stores without name
        if row.name_id == "" {
            return Ok(());
        }
        integration_records
            .upserts
            .push(IntegrationUpsertRecord::Store(row));

        return Ok(());
    }

    if let Some(row) = LegacyListMasterRow::try_translate(sync_record)? {
        integration_records
            .upserts
            .push(IntegrationUpsertRecord::MasterList(row));

        return Ok(());
    }

    if let Some(row) = LegacyListMasterLineRow::try_translate(sync_record)? {
        integration_records
            .upserts
            .push(IntegrationUpsertRecord::MasterListLine(row));

        return Ok(());
    }

    if let Some(row) = LegacyListMasterNameJoinRow::try_translate(sync_record)? {
        integration_records
            .upserts
            .push(IntegrationUpsertRecord::MasterListNameJoin(row));

        return Ok(());
    }

    Ok(()) // At this point we are either ignoring records or record_types
}

/// Imports sync records and writes them to the DB
/// If needed data records are translated to the local DB schema.
pub async fn import_sync_records(
    registry: &RepositoryRegistry,
    records: &Vec<SyncRecord>,
) -> Result<(), String> {
    let mut integration_records = IntegrationRecord {
        upserts: Vec::new(),
    };
    for record in records {
        do_translation(&record, &mut integration_records)?;
    }

    let sync_repo = registry.get::<SyncRepository>();
    sync_repo
        .integrate_records(&integration_records)
        .await
        .map_err(|e| format!("Sync Error: {}", e))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::{
        database::repository::{
            repository::{
                get_repositories, MasterListLineRepository, MasterListNameJoinRepository,
                MasterListRepository,
            },
            ItemRepository, NameRepository, RepositoryError, StoreRepository,
        },
        server::data::RepositoryRegistry,
        util::{
            sync::translation::{
                import_sync_records,
                test_data::{store::get_test_store_records, TestSyncDataRecord},
                SyncRecord,
            },
            test_db,
        },
    };

    use super::test_data::{
        item::{get_test_item_records, get_test_item_upsert_records},
        master_list::{get_test_master_list_records, get_test_master_list_upsert_records},
        master_list_line::get_test_master_list_line_records,
        master_list_name_join::get_test_master_list_name_join_records,
        name::{get_test_name_records, get_test_name_upsert_records},
        TestSyncRecord,
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

        import_sync_records(&registry, &extract_sync_records(&records))
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
        import_sync_records(&registry, &extract_sync_records(&records))
            .await
            .unwrap();

        // Asserts inside this method, to avoid repetition
        check_records_against_database(&registry, upsert_records).await;
    }

    // DB query will return NotFound error for record that's not found
    // while test data has None for records that shouldn't be integrated
    fn from_option_to_db_result<T>(option: Option<T>) -> Result<T, RepositoryError> {
        match option {
            Some(record) => Ok(record),
            None => Err(RepositoryError::NotFound),
        }
    }

    fn extract_sync_records(records: &Vec<TestSyncRecord>) -> Vec<SyncRecord> {
        records
            .into_iter()
            .map(|test_record| test_record.sync_record.clone())
            .collect()
    }

    async fn check_records_against_database(
        registry: &RepositoryRegistry,
        records: Vec<TestSyncRecord>,
    ) {
        for record in records {
            match record.translated_record {
                TestSyncDataRecord::Store(comparison_record) => {
                    assert_eq!(
                        registry
                            .get::<StoreRepository>()
                            .find_one_by_id(&record.sync_record.record_id)
                            .await,
                        from_option_to_db_result(comparison_record)
                    )
                }
                TestSyncDataRecord::Name(comparison_record) => {
                    assert_eq!(
                        registry
                            .get::<NameRepository>()
                            .find_one_by_id(&record.sync_record.record_id)
                            .await,
                        from_option_to_db_result(comparison_record)
                    )
                }
                TestSyncDataRecord::Item(comparison_record) => {
                    assert_eq!(
                        registry
                            .get::<ItemRepository>()
                            .find_one_by_id(&record.sync_record.record_id)
                            .await,
                        from_option_to_db_result(comparison_record)
                    )
                }
                TestSyncDataRecord::MasterList(comparison_record) => {
                    assert_eq!(
                        registry
                            .get::<MasterListRepository>()
                            .find_one_by_id(&record.sync_record.record_id)
                            .await,
                        from_option_to_db_result(comparison_record)
                    )
                }
                TestSyncDataRecord::MasterListLine(comparison_record) => {
                    assert_eq!(
                        registry
                            .get::<MasterListLineRepository>()
                            .find_one_by_id(&record.sync_record.record_id)
                            .await,
                        from_option_to_db_result(comparison_record)
                    )
                }
                TestSyncDataRecord::MasterListNameJoin(comparison_record) => {
                    assert_eq!(
                        registry
                            .get::<MasterListNameJoinRepository>()
                            .find_one_by_id(&record.sync_record.record_id)
                            .await,
                        from_option_to_db_result(comparison_record)
                    )
                }
            }
        }
    }
}
