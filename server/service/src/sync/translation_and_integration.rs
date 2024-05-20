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
    ) -> TranslationAndIntegration<'a> {
        TranslationAndIntegration {
            connection,
            sync_buffer,
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
            let source_site_id = sync_record.source_site_id.clone();

            let mut translation_result = match sync_record.action {
                SyncAction::Upsert => translator
                    .try_translate_from_upsert_sync_record(self.connection, sync_record)?,
                SyncAction::Delete => translator
                    .try_translate_from_delete_sync_record(self.connection, sync_record)?,
                SyncAction::Merge => {
                    translator.try_translate_from_merge_sync_record(self.connection, sync_record)?
                }
            };

            // Add source_site_id to translation result if it exists in the sync buffer row
            match source_site_id {
                Some(id) => translation_result.add_source_site_id(id),
                None => {}
            }

            translation_results.push(translation_result);
        }

        Ok(translation_results)
    }

    pub(crate) fn translate_and_integrate_sync_records(
        &self,
        sync_records: Vec<SyncBufferRow>,
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

        for (number_of_records_integrated, sync_record) in sync_records.into_iter().enumerate() {
            let pull_translation_results =
                match self.translate_sync_record(&sync_record, translators) {
                    Ok(translation_result) => translation_result,
                    // Record error in sync buffer and in result, continue to next sync_record
                    Err(translation_error) => {
                        self.sync_buffer
                            .record_integration_error(&sync_record, &translation_error)?;
                        result.insert_error(&sync_record.table_name);
                        warn!(
                            "{:?} {:?} {:?}",
                            translation_error, sync_record.record_id, sync_record.table_name
                        );
                        // Next sync_record
                        continue;
                    }
                };

            let mut integration_records = vec![];
            let mut ignored = Vec::new();
            for pull_translation_result in pull_translation_results {
                match pull_translation_result {
                    PullTranslateResult::IntegrationOperations(mut operations) => {
                        integration_records.append(&mut operations)
                    }
                    PullTranslateResult::Ignored(ignore_message) => {
                        ignored.push(ignore_message.clone());
                        // note, this might get cleared if other translator produced some ops
                        self.sync_buffer.record_integration_error(
                            &sync_record,
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

            // Record translator not found error in sync buffer and in result, continue to next sync_record
            if integration_records.is_empty() && ignored.is_empty() {
                let error = anyhow::anyhow!("Translator for record not found");
                self.sync_buffer
                    .record_integration_error(&sync_record, &error)?;
                result.insert_error(&sync_record.table_name);
                warn!(
                    "{:?} {:?} {:?}",
                    error, sync_record.record_id, sync_record.table_name
                );
                // Next sync_record
                continue;
            }

            // Integrate
            let integration_result = integrate(self.connection, &integration_records);
            match integration_result {
                Ok(_) => {
                    self.sync_buffer
                        .record_successful_integration(&sync_record)?;
                    result.insert_success(&sync_record.table_name)
                }
                // Record database_error in sync buffer and in result
                Err(database_error) => {
                    let error = anyhow::anyhow!("{:?}", database_error);
                    self.sync_buffer
                        .record_integration_error(&sync_record, &error)?;
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
    fn integrate(&self, connection: &StorageConnection) -> Result<(), RepositoryError> {
        match self {
            IntegrationOperation::Upsert(upsert, source_site_id) => {
                let cursor_id = upsert.upsert(connection)?;

                // Update the change log if we get a cursor id
                if let Some(cursor_id) = cursor_id {
                    ChangelogRepository::new(connection).set_source_site_id_and_is_sync_update(
                        cursor_id,
                        source_site_id.to_owned(),
                    )?;
                }
                Ok(())
            }

            IntegrationOperation::Delete(delete) => delete.delete(connection),
        }
    }
}

pub(crate) fn integrate(
    connection: &StorageConnection,
    integration_records: &[IntegrationOperation],
) -> Result<(), RepositoryError> {
    // Only start nested transaction if transaction is already ongoing. See integrate_and_translate_sync_buffer
    let start_nested_transaction = {
        connection
            .lock()
            .transaction_level::<RepositoryError>()
            .map_err(|e| e.to_inner_error())?
            > 0
    };

    for integration_record in integration_records.iter() {
        // Integrate every record in a sub transaction. This is mainly for Postgres where the
        // whole transaction fails when there is a DB error (not a problem in sqlite).
        if start_nested_transaction {
            connection
                .transaction_sync_etc(|sub_tx| integration_record.integrate(sub_tx), false)
                .map_err(|e| e.to_inner_error())?;
        } else {
            integration_record.integrate(connection)?;
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
    use util::{assert_matches, inline_init};

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
                );

                assert_eq!(result, Ok(()));

                // Fails due to referencial constraint
                let result = integrate(
                    connection,
                    &[IntegrationOperation::upsert(inline_init(
                        |r: &mut ItemRow| {
                            r.id = "item".to_string();
                            r.unit_id = Some("invalid".to_string());
                        },
                    ))],
                );

                assert_ne!(result, Ok(()));

                Ok(()) as Result<(), ()>
            })
            .unwrap();

        // Record should exist
        assert_matches!(
            UnitRowRepository::new(&connection).find_one_by_id_option("unit"),
            Ok(Some(_))
        );

        // Record should not exist
        assert_matches!(
            ItemRowRepository::new(&connection).find_active_by_id("item"),
            Ok(None)
        );
    }
}
