use super::sync_status::logger::{SyncLogger, SyncLoggerError, SyncStepProgress};
use super::{
    sync_buffer::SyncBuffer,
    translations::{IntegrationOperation, PullTranslateResult, SyncTranslation, SyncTranslators},
};
use crate::usize_to_u64;
use log::{debug, warn};
use repository::*;
use std::collections::HashMap;

static PROGRESS_STEP_LEN: usize = 100;

pub(crate) struct TranslationAndIntegration<'a> {
    connection: &'a StorageConnection,
    sync_buffer: &'a SyncBuffer<'a>,
    source_site_id: Option<i32>,
}

#[derive(Default, Debug)]
pub(crate) struct TranslationAndIntegrationResult {
    pub(crate) integrated_count: u32,
    pub(crate) errors_count: u32,
}
type TableName = String;
#[derive(Default, Debug)]
pub struct TranslationAndIntegrationResults(HashMap<TableName, TranslationAndIntegrationResult>);

impl<'a> TranslationAndIntegration<'a> {
    pub(crate) fn new(
        connection: &'a StorageConnection,
        sync_buffer: &'a SyncBuffer,
        source_site_id: Option<i32>,
    ) -> TranslationAndIntegration<'a> {
        TranslationAndIntegration {
            connection,
            sync_buffer,
            source_site_id,
        }
    }

    // Go through each translator, adding translations to result, if no translators matched return None
    fn translate_sync_record(
        &self,
        sync_record: &SyncBufferRow,
        translators: &SyncTranslators,
    ) -> Result<Vec<PullTranslateResult>, anyhow::Error> {
        let mut translation_results = Vec::new();

        for translator in translators.iter() {
            if !translator.should_translate_from_sync_record(sync_record) {
                continue;
            }

            let translation_result = match sync_record.action {
                SyncAction::Upsert => translator
                    .try_translate_from_upsert_sync_record(self.connection, sync_record)?,
                SyncAction::Delete => translator
                    .try_translate_from_delete_sync_record(self.connection, sync_record)?,
                SyncAction::Merge => {
                    translator.try_translate_from_merge_sync_record(self.connection, sync_record)?
                }
            };

            translation_results.push(translation_result);
        }

        Ok(translation_results)
    }

    pub(crate) fn translate_and_integrate_sync_records(
        &self,
        sync_records: &[SyncBufferRow],
        translators: &Vec<Box<dyn SyncTranslation>>,
        mut logger: Option<&mut SyncLogger>,
    ) -> Result<TranslationAndIntegrationResults, RepositoryError> {
        let step_progress = SyncStepProgress::Integrate;
        let mut result = TranslationAndIntegrationResults::new();

        // Try translate
        // Record initial progress (will be set as total progress)
        let total_to_integrate = sync_records.len();

        // Helper to make below logic less verbose
        let mut record_progress = |progress: usize| -> Result<(), RepositoryError> {
            match logger.as_mut() {
                None => Ok(()),
                Some(logger) => logger
                    .progress(step_progress.clone(), usize_to_u64(progress))
                    .map_err(SyncLoggerError::to_repository_error),
            }
        };

        for (number_of_records_integrated, sync_record) in sync_records.iter().enumerate() {
            let pull_translation_results =
                match self.translate_sync_record(sync_record, translators) {
                    Ok(translation_result) => translation_result,
                    // Record error in sync buffer and in result, continue to next sync_record
                    Err(translation_error) => {
                        self.sync_buffer
                            .record_integration_error(sync_record, &translation_error)?;
                        result.insert_error(&sync_record.table_name);
                        warn!(
                            "{:?} {:?} {:?}",
                            translation_error, sync_record.record_id, sync_record.table_name
                        );
                        // Next sync_record
                        continue;
                    }
                };

            let mut integration_records = Vec::new();
            let mut ignored = false;
            for pull_translation_result in pull_translation_results {
                match pull_translation_result {
                    PullTranslateResult::IntegrationOperations(mut operations) => {
                        integration_records.append(&mut operations)
                    }
                    PullTranslateResult::Ignored(ignore_message) => {
                        ignored = true;
                        self.sync_buffer.record_integration_error(
                            sync_record,
                            &anyhow::anyhow!("Ignored: {}", ignore_message),
                        )?;
                        result.insert_error(&sync_record.table_name);

                        debug!(
                            "Ignored record: {:?} {:?} {:?}",
                            ignore_message, sync_record.record_id, sync_record.table_name
                        );
                        continue;
                    }
                    PullTranslateResult::NotMatched => {}
                }
            }

            if ignored {
                continue;
            }

            // Record translator not found error in sync buffer and in result, continue to next sync_record
            if integration_records.is_empty() {
                let error = anyhow::anyhow!("Translator for record not found");
                self.sync_buffer
                    .record_integration_error(sync_record, &error)?;
                result.insert_error(&sync_record.table_name);
                warn!(
                    "{:?} {:?} {:?}",
                    error, sync_record.record_id, sync_record.table_name
                );
                // Next sync_record
                continue;
            }

            // Integrate
            let integration_result =
                integrate(self.connection, &integration_records, self.source_site_id);
            match integration_result {
                Ok(_) => {
                    self.sync_buffer
                        .record_successful_integration(sync_record)?;
                    result.insert_success(&sync_record.table_name)
                }
                // Record database_error in sync buffer and in result
                Err(database_error) => {
                    let error = anyhow::anyhow!("{:?}", database_error);
                    self.sync_buffer
                        .record_integration_error(sync_record, &error)?;
                    result.insert_error(&sync_record.table_name);
                    warn!(
                        "{:?} {:?} {:?}",
                        error, sync_record.record_id, sync_record.table_name
                    );
                }
            }

            if number_of_records_integrated % PROGRESS_STEP_LEN == 0 {
                record_progress(total_to_integrate - number_of_records_integrated)?;
            }
        }

        // Record final progress
        record_progress(0)?;

        Ok(result)
    }
}

impl IntegrationOperation {
    fn integrate(
        &self,
        connection: &StorageConnection,
        source_site_id: Option<i32>,
    ) -> Result<(), RepositoryError> {
        match self {
            IntegrationOperation::Upsert(upsert) => {
                let cursor_id = upsert.upsert(connection)?;

                // Update the change log if we get a cursor id
                if let Some(cursor_id) = cursor_id {
                    ChangelogRepository::new(connection)
                        .set_source_site_id_and_is_sync_update(cursor_id, source_site_id)?;
                }
                Ok(())
            }

            IntegrationOperation::Delete(delete) => {
                let cursor_id = delete.delete(connection)?;

                // Update the change log if we get a cursor id
                if let Some(cursor_id) = cursor_id {
                    ChangelogRepository::new(connection)
                        .set_source_site_id_and_is_sync_update(cursor_id, source_site_id)?;
                }
                Ok(())
            }
        }
    }
}

pub(crate) fn integrate(
    connection: &StorageConnection,
    integration_records: &[IntegrationOperation],
    source_site_id: Option<i32>,
) -> Result<(), RepositoryError> {
    for integration_record in integration_records.iter() {
        if cfg!(feature = "postgres") {
            // In Postgres the parent transaction fails when there is a DB error in any of the
            // statements executed in the transaction. Thus, integrate every record in a nested
            // transaction to catch potential errors (e.g. foreign key violations).
            // Note, this is not a problem in Sqlite.
            connection
                .transaction_sync_etc(
                    |sub_tx| integration_record.integrate(sub_tx, source_site_id),
                    false,
                )
                .map_err(|e| e.to_inner_error())?;
        } else {
            // For Sqlite, integrating without nested transaction is faster, especially if there are
            // errors (see the bench_error_performance() test).
            integration_record.integrate(connection, source_site_id)?;
        }
    }

    Ok(())
}

impl TranslationAndIntegrationResults {
    fn new() -> TranslationAndIntegrationResults {
        Default::default()
    }

    fn insert_error(&mut self, table_name: &str) {
        let entry = self.0.entry(table_name.to_owned()).or_default();
        entry.errors_count += 1;
    }

    fn insert_success(&mut self, table_name: &str) {
        let entry = self.0.entry(table_name.to_owned()).or_default();
        entry.integrated_count += 1;
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use repository::mock::MockDataInserts;
    use util::{assert_matches, inline_init, uuid::uuid};

    #[actix_rt::test]
    async fn test_fall_through_inner_transaction() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_fall_through_inner_transaction",
            MockDataInserts::none(),
        )
        .await;

        connection
            .transaction_sync(|connection| {
                // Doesn't fail
                let result = integrate(
                    connection,
                    &[IntegrationOperation::upsert(inline_init(
                        |r: &mut UnitRow| {
                            r.id = "unit".to_string();
                        },
                    ))],
                    None,
                );

                assert_eq!(result, Ok(()));

                // Fails due to referential constraint
                let result = integrate(
                    connection,
                    &[IntegrationOperation::upsert(inline_init(
                        |r: &mut ItemRow| {
                            r.id = "item".to_string();
                            r.unit_id = Some("invalid".to_string());
                        },
                    ))],
                    None,
                );

                assert_ne!(result, Ok(()));

                Ok(()) as Result<(), ()>
            })
            .unwrap();

        // Record should exist
        assert_matches!(
            UnitRowRepository::new(&connection).find_one_by_id("unit"),
            Ok(Some(_))
        );

        // Record should not exist
        assert_matches!(
            ItemRowRepository::new(&connection).find_active_by_id("item"),
            Ok(None)
        );
    }

    //#[actix_rt::test]
    #[allow(dead_code)]
    async fn bench_error_performance() {
        let (_, connection, _, _) =
            test_db::setup_all("bench_error_performance", MockDataInserts::none()).await;

        let insert_batch = |with_error: bool, n: i32, parent_tx: bool, nested_tx: bool| {
            let mut records = vec![];
            for i in 0..n {
                records.push(inline_init(|r: &mut ItemRow| {
                    r.id = uuid();
                    r.unit_id = if with_error {
                        // Create invalid ItemRow
                        if i % 20 == 0 {
                            None
                        } else {
                            Some("invalid".to_string())
                        }
                    } else {
                        None
                    };
                }));
            }
            let insert = |connection: &StorageConnection| {
                for record in records {
                    // ignore errors
                    if nested_tx {
                        let _ = connection.transaction_sync_etc(
                            |connection| ItemRowRepository::new(connection).upsert_one(&record),
                            false,
                        );
                    } else {
                        let _ = ItemRowRepository::new(connection).upsert_one(&record);
                    };
                }
            };

            let start = std::time::SystemTime::now();
            if parent_tx {
                let _: Result<(), RepositoryError> = connection
                    .transaction_sync(|con| {
                        insert(con);
                        Ok(())
                    })
                    .map_err::<RepositoryError, _>(|e| e.to_inner_error());
            } else {
                insert(&connection);
            };
            println!(
                "with_error: {with_error}, n: {n}, parent_tx: {parent_tx}, nested_tx: {nested_tx}, Time: {:?}",
                start.elapsed().unwrap()
            );
        };

        let run_all_tx_combinations = |with_error: bool, n: i32| {
            println!("Batch size: {n}");
            insert_batch(with_error, n, false, false);
            insert_batch(with_error, n, false, true);
            insert_batch(with_error, n, true, false);
            insert_batch(with_error, n, true, true);
        };
        let run = |with_error: bool| {
            println!("Warm up");
            insert_batch(with_error, 64, true, true);

            run_all_tx_combinations(with_error, 64);
            run_all_tx_combinations(with_error, 500);
            run_all_tx_combinations(with_error, 10000);
        };
        println!("With error:");
        run(true);
        // For comparison, insert same records without error. Note, later batch will be added to
        // data from earlier batches which potentially results in a slowdown.
        println!("Without error:");
        run(false);
    }
}
