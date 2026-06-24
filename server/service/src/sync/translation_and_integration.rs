use super::{
    sync_buffer::{write_sync_buffer_error, write_sync_buffer_ignored, write_sync_buffer_success},
    translations::{
        FkChecker, IntegrationOperation, PullTranslateResult, SyncTranslation, SyncTranslators,
    },
};
use log::{debug, warn};
use repository::*;
use std::collections::HashMap;
use util::datetime_now;

pub(crate) struct TranslationAndIntegration<'a> {
    connection: &'a StorageConnection,
    /// Integration-scoped FK existence cache, shared across every record translated by this
    /// integrator (i.e. the whole upsert phase). See [`FkChecker`].
    fk_checker: FkChecker,
    pub(crate) result: TranslationAndIntegrationResults,
}

#[derive(Default, Debug)]
pub(crate) struct TranslationAndIntegrationResult {
    pub(crate) integrated_count: u32,
    pub(crate) errors_count: u32,
}
type TableName = String;
#[derive(Default, Debug)]
pub struct TranslationAndIntegrationResults(HashMap<TableName, TranslationAndIntegrationResult>);

/// Default batch priority for translated operations.
const PRIORITY_DEFAULT: i32 = 1;
/// Higher priority for a `Delete` that a translator emitted before an `Upsert` in the same
/// record (must run before upserts; batch ordering runs higher priority first).
const PRIORITY_PRE_UPSERT_DELETE: i32 = 2;

/// One translated operation tagged with its originating buffer cursor + source site and the
/// batch priority it should run at.
struct TranslatedOp {
    cursor: i32,
    source_site_id: Option<i32>,
    priority: i32,
    operation: IntegrationOperation,
}

/// The final sync_buffer outcome for one buffer record, accumulated across translation and
/// the (later) batch integration. The first error wins; a record with no error succeeds.
struct RecordOutcome {
    table_name: String,
    record_id: String,
    state: RecordState,
}

enum RecordState {
    /// No operations recorded an error yet -> success when written.
    Ok,
    /// Translator returned `Ignored` (written as ignored; not counted as a hard error).
    Ignored(String),
    /// No translator matched (written as error; not counted as a hard error).
    NoTranslator,
    /// A translation or integration error (written as error).
    Error(String),
}

impl RecordOutcome {
    fn new(table_name: String, record_id: String) -> Self {
        Self {
            table_name,
            record_id,
            state: RecordState::Ok,
        }
    }

    fn mark_translation_error(&mut self, message: String) {
        self.state = RecordState::Error(message);
    }

    fn mark_ignored(&mut self, message: String) {
        // Ignored only matters if nothing has already errored.
        if matches!(self.state, RecordState::Ok) {
            self.state = RecordState::Ignored(message);
        }
    }

    fn mark_no_translator(&mut self) {
        if matches!(self.state, RecordState::Ok) {
            self.state = RecordState::NoTranslator;
        }
    }

    fn mark_op_error(&mut self, message: String) {
        // First integration error wins; don't downgrade an existing error.
        if !matches!(self.state, RecordState::Error(_)) {
            self.state = RecordState::Error(message);
        }
    }

    /// Write the record's sync_buffer result and tally it into `results`, matching the
    /// per-record semantics of the old flow.
    fn write(
        self,
        connection: &StorageConnection,
        cursor: i32,
        started: chrono::NaiveDateTime,
        results: &mut TranslationAndIntegrationResults,
    ) -> Result<(), RepositoryError> {
        match self.state {
            RecordState::Ok => {
                write_sync_buffer_success(connection, cursor, started)?;
                results.insert_success(&self.table_name);
            }
            RecordState::Ignored(message) => {
                write_sync_buffer_ignored(connection, cursor, started, &message)?;
                results.insert_error(&self.table_name);
            }
            RecordState::NoTranslator => {
                write_sync_buffer_error(
                    connection,
                    cursor,
                    started,
                    "Translator for record not found",
                )?;
                results.insert_error(&self.table_name);
            }
            RecordState::Error(message) => {
                write_sync_buffer_error(connection, cursor, started, &message)?;
                results.insert_error(&self.table_name);
            }
        }
        // record_id retained for parity with prior logging; not otherwise needed here.
        let _ = self.record_id;
        Ok(())
    }
}

impl<'a> TranslationAndIntegration<'a> {
    pub(crate) fn new(connection: &'a StorageConnection) -> TranslationAndIntegration<'a> {
        TranslationAndIntegration {
            connection,
            fk_checker: FkChecker::new(),
            result: TranslationAndIntegrationResults::new(),
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
                SyncAction::Upsert => translator.try_translate_from_upsert_sync_record(
                    self.connection,
                    &self.fk_checker,
                    sync_record,
                )?,
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

    /// Translate and integrate a single batch of sync records. Returns the number of records in
    /// this batch that errored — the caller accumulates this across batches to report a true
    /// cumulative error count (instead of resetting per batch).
    ///
    /// Translates every record first, then integrates all the resulting operations as ONE
    /// batch (`batch_operations`) so the underlying upserts/deletes go out as multi-row
    /// statements. Changelogs are generated *around* the batch (mirroring the old per-record
    /// order): delete changelogs BEFORE the batch (they read the still-present row to route),
    /// upsert changelogs AFTER (the row is then in the DB). A record's sync_buffer result is
    /// derived from whether any of its operations errored.
    pub(crate) fn translate_and_integrate_sync_records(
        &mut self,
        sync_records: &[SyncBufferRow],
        translators: &Vec<Box<dyn SyncTranslation>>,
    ) -> Result<u32, RepositoryError> {
        let started = datetime_now();
        let mut error_count: u32 = 0;

        // Per-cursor outcome from the translate phase; integratable ops are accumulated
        // separately and their batch result folded back in afterwards.
        let mut record_outcomes: HashMap<i32, RecordOutcome> = HashMap::new();
        // (cursor, source_site_id, operation) for every batchable/per-record op, in order.
        let mut all_ops: Vec<TranslatedOp> = Vec::new();

        for sync_record in sync_records.iter() {
            let cursor = sync_record.cursor;
            record_outcomes.insert(
                cursor,
                RecordOutcome::new(sync_record.table_name.clone(), sync_record.record_id.clone()),
            );

            let translation_results = match self.translate_sync_record(sync_record, translators) {
                Ok(translation_result) => translation_result,
                Err(translation_error) => {
                    // Count as an error — likely FK/data issue that affects integration.
                    record_outcomes.get_mut(&cursor).unwrap().mark_translation_error(
                        format!("{:?}", translation_error),
                    );
                    error_count += 1;
                    warn!(
                        "{:?} {:?} {:?}",
                        translation_error, sync_record.record_id, sync_record.table_name
                    );
                    continue;
                }
            };

            let mut ignored = false;
            let mut record_ops: Vec<IntegrationOperation> = Vec::new();
            for translation_result in translation_results {
                match translation_result {
                    PullTranslateResult::IntegrationOperations(operations) => {
                        record_ops.extend(operations)
                    }
                    PullTranslateResult::Ignored(ignore_message) => {
                        ignored = true;
                        record_outcomes
                            .get_mut(&cursor)
                            .unwrap()
                            .mark_ignored(ignore_message.clone());
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

            if record_ops.is_empty() {
                // No translator matched — not counted as a hard error (parity with old behaviour).
                record_outcomes
                    .get_mut(&cursor)
                    .unwrap()
                    .mark_no_translator();
                warn!(
                    "{:?} {:?} {:?}",
                    "Translator for record not found", sync_record.record_id, sync_record.table_name
                );
                continue;
            }

            // A `Delete` positioned before any `Upsert` in this record's op list must run before
            // upserts (e.g. program_requisition_settings replaces order types). Bump its priority
            // so batch ordering (higher priority first) keeps it ahead of normal-priority upserts.
            let first_upsert_index = record_ops
                .iter()
                .position(|op| !matches!(op, IntegrationOperation::Delete { .. }));
            for (index, operation) in record_ops.into_iter().enumerate() {
                let is_pre_upsert_delete = matches!(operation, IntegrationOperation::Delete { .. })
                    && first_upsert_index.map(|u| index < u).unwrap_or(false);
                all_ops.push(TranslatedOp {
                    cursor,
                    source_site_id: Some(sync_record.source_site_id),
                    priority: if is_pre_upsert_delete {
                        PRIORITY_PRE_UPSERT_DELETE
                    } else {
                        PRIORITY_DEFAULT
                    },
                    operation,
                });
            }
        }

        // Integrate all accumulated operations as one batch, attributing results per cursor.
        self.integrate_batch(all_ops, &mut record_outcomes, &mut error_count)?;

        // Write each record's final sync_buffer result + tally.
        for (cursor, outcome) in record_outcomes {
            outcome.write(self.connection, cursor, started, &mut self.result)?;
        }

        Ok(error_count)
    }

    /// Run the accumulated operations: pre-generate delete changelogs, split batchable
    /// (`Upsert(Row)`/`Delete`) from per-record (`UpsertNonSync`/`UpsertDocument`) ops, run
    /// `batch_operations` for the batchable ones, then generate + insert all changelogs and
    /// fold per-operation errors back into the owning record's outcome.
    fn integrate_batch(
        &mut self,
        all_ops: Vec<TranslatedOp>,
        outcomes: &mut HashMap<i32, RecordOutcome>,
        error_count: &mut u32,
    ) -> Result<(), RepositoryError> {
        if all_ops.is_empty() {
            return Ok(());
        }

        let changelog_repo = ChangelogRepository::new(self.connection);
        // Delete changelogs must be generated BEFORE the rows are deleted (they read the
        // still-present row to route store_id/transfer_store_id/patient_id).
        let mut pending_changelogs: Vec<ChangeLogInsertRow> = Vec::new();

        let mut batch_input: Vec<BatchDbOperation<i32, (i32, ChangelogTableName, String)>> =
            Vec::new();

        for TranslatedOp {
            cursor,
            source_site_id,
            priority,
            operation,
        } in all_ops
        {
            match operation {
                IntegrationOperation::Upsert(row) => {
                    let dedup_key = (cursor, row.table_name(), row.record_id());
                    batch_input.push(BatchDbOperation {
                        priority,
                        operation: BatchOperation::Upsert(row),
                        extra: cursor,
                        dedup_key,
                    });
                }
                IntegrationOperation::Delete {
                    table_name,
                    record_id,
                } => {
                    // Generate the delete changelog now, while the row still exists.
                    match generate_delete_changelog(
                        self.connection,
                        &table_name,
                        &record_id,
                        SourceSiteId::SourceSiteId(source_site_id),
                    ) {
                        Ok(mut changelogs) => pending_changelogs.append(&mut changelogs),
                        Err(e) => {
                            outcomes.get_mut(&cursor).unwrap().mark_op_error(format!("{e:?}"));
                            *error_count += 1;
                            continue;
                        }
                    }
                    let dedup_key = (cursor, table_name.clone(), record_id.clone());
                    batch_input.push(BatchDbOperation {
                        priority,
                        operation: BatchOperation::Delete {
                            table_name,
                            record_id,
                        },
                        extra: cursor,
                        dedup_key,
                    });
                }
                // Not batchable — write per-record (link tables / documents), then their changelog.
                IntegrationOperation::UpsertNonSync(row) => {
                    if let Err(e) = row.upsert_no_changelog(self.connection) {
                        outcomes.get_mut(&cursor).unwrap().mark_op_error(format!("{e:?}"));
                        *error_count += 1;
                    }
                }
                IntegrationOperation::UpsertDocument(document) => {
                    if let Err(e) =
                        crate::sync::integrate_document::sync_upsert_document(self.connection, &document)
                    {
                        outcomes.get_mut(&cursor).unwrap().mark_op_error(format!("{e:?}"));
                        *error_count += 1;
                    }
                }
            }
        }

        // Run the batched upserts + deletes.
        let wrap_record_in_tx = cfg!(feature = "postgres");
        let results = batch_operations(self.connection, batch_input, wrap_record_in_tx);

        // Fold batch errors into outcomes, and generate upsert changelogs for the rows that
        // succeeded (the row is now in the DB).
        for BatchDbOperationResult {
            operation,
            error,
            extra: cursors,
        } in results
        {
            // `cursors` are all the (deduped) records that shared this operation.
            if let Some(error) = error {
                let message = format!("{error:?}");
                for cursor in &cursors {
                    if let Some(outcome) = outcomes.get_mut(cursor) {
                        outcome.mark_op_error(message.clone());
                    }
                }
                *error_count += cursors.len() as u32;
                continue;
            }

            // Upsert succeeded: generate its changelog(s) from the now-written row, attributing
            // any generation error to the (single) originating record's source site.
            if let BatchOperation::Upsert(row) = &operation {
                // All cursors in a deduped upsert group are the same record/source; use the first.
                let source_site_id = cursors.first().copied();
                match row.generate_changelog(
                    self.connection,
                    RowActionType::Upsert,
                    SourceSiteId::SourceSiteId(source_site_id),
                ) {
                    Ok(mut changelogs) => pending_changelogs.append(&mut changelogs),
                    Err(e) => {
                        let message = format!("{e:?}");
                        for cursor in &cursors {
                            if let Some(outcome) = outcomes.get_mut(cursor) {
                                outcome.mark_op_error(message.clone());
                            }
                        }
                        *error_count += cursors.len() as u32;
                    }
                }
            }
        }

        // Insert all changelogs (pre-generated deletes + post-batch upserts) in one go.
        changelog_repo.batch_insert(pending_changelogs)?;

        Ok(())
    }
}

impl IntegrationOperation {
    fn integrate(
        &self,
        connection: &StorageConnection,
        source_site_id: Option<i32>,
    ) -> Result<(), RepositoryError> {
        match self {
            IntegrationOperation::Upsert(row) => {
                // v5/v6: write the row (via the batch path, single-element), then generate
                // + insert its changelog(s) with the originating site id.
                let op = BatchOperation::Upsert(row.clone());
                if let (_, Some(error)) = row.batch_upsert(connection, 1, &[&op]) {
                    return Err(error);
                }
                let changelogs = row.generate_changelog(
                    connection,
                    RowActionType::Upsert,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?;
                let changelog_repo = ChangelogRepository::new(connection);
                for changelog in &changelogs {
                    changelog_repo.insert(changelog)?;
                }
                Ok(())
            }

            IntegrationOperation::UpsertNonSync(row) => {
                // Not in the changelog; just write the row.
                row.upsert_no_changelog(connection)
            }

            IntegrationOperation::UpsertDocument(document) => {
                // Immutable document insert + aux-table updates. Documents manage their
                // own changelog inside the repository, so no separate changelog here.
                crate::sync::integrate_document::sync_upsert_document(connection, document)
            }

            IntegrationOperation::Delete {
                table_name,
                record_id,
            } => {
                // Generate the changelog from the still-present row FIRST (it carries
                // store_id/transfer_store_id/patient_id needed for routing), then delete
                // the row, then insert the changelog. Mirrors the old `delete_sync` order.
                let changelogs = generate_delete_changelog(
                    connection,
                    table_name,
                    record_id,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?;
                // Delete the row via the batch path (single-element). A `NoDeletePath`
                // outcome means the table isn't deleted via sync — a no-op here, matching
                // the previous v5/v6 behaviour (it swallowed `NoDeletePath`).
                let op = BatchOperation::Delete {
                    table_name: table_name.clone(),
                    record_id: record_id.clone(),
                };
                match batch_delete(connection, table_name, 1, &[&op]) {
                    (_, None) | (_, Some(BatchDeleteError::NoDeletePath)) => {}
                    (_, Some(BatchDeleteError::RepositoryError(error))) => return Err(error),
                }
                let changelog_repo = ChangelogRepository::new(connection);
                for changelog in &changelogs {
                    changelog_repo.insert(changelog)?;
                }
                Ok(())
            }
        }
    }
}

pub(crate) fn integrate(
    connection: &StorageConnection,
    integration_records: &[(Option<i32>, IntegrationOperation)],
) -> Result<(), RepositoryError> {
    for (source_site_id, integration_record) in integration_records.iter() {
        if cfg!(feature = "postgres") {
            // In Postgres the parent transaction fails when there is a DB error in any of the
            // statements executed in the transaction. Thus, integrate every record in a nested
            // transaction to catch potential errors (e.g. foreign key violations).
            // Note, this is not a problem in Sqlite.
            connection
                .transaction_sync_etc(
                    |sub_tx| integration_record.integrate(sub_tx, *source_site_id),
                    false,
                )
                .map_err(|e| e.to_inner_error())?;
        } else {
            // For Sqlite, integrating without nested transaction is faster, especially if there are
            // errors (see the bench_error_performance() test).
            integration_record.integrate(connection, *source_site_id)?;
        }
    }

    Ok(())
}

impl TranslationAndIntegrationResults {
    pub(crate) fn new() -> TranslationAndIntegrationResults {
        Default::default()
    }

    pub(crate) fn log(&self, operation_name: &str) {
        let has_results = !self.0.is_empty()
            && self
                .0
                .values()
                .any(|result| result.integrated_count > 0 || result.errors_count > 0);
        if has_results {
            for (table_name, result) in &self.0 {
                if result.errors_count > 0 {
                    log::warn!("{operation_name} Integration result for {table_name}: {result:?}");
                } else {
                    log::info!("{operation_name} Integration result for {table_name}: {result:?}");
                }
            }
        } else {
            log::debug!(
                "{operation_name} Integration result: No records integrated or errored {:?}",
                self.0
            );
        }
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
    use util::{assert_matches, uuid::uuid};

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
                    &[(
                        None,
                        IntegrationOperation::upsert(Row::Unit(UnitRow {
                            id: "unit".to_string(),
                            ..Default::default()
                        })),
                    )],
                );

                assert_eq!(result, Ok(()));

                // Fails due to referential constraint
                let result = integrate(
                    connection,
                    &[(
                        None,
                        IntegrationOperation::upsert(Row::Item(ItemRow {
                            id: "item".to_string(),
                            unit_id: Some("invalid".to_string()),
                            ..Default::default()
                        })),
                    )],
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
                records.push(ItemRow {
                    id: uuid(),
                    unit_id: if with_error {
                        // Create invalid ItemRow
                        if i % 20 == 0 {
                            None
                        } else {
                            Some("invalid".to_string())
                        }
                    } else {
                        None
                    },
                    ..Default::default()
                });
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

    /// Drives the batched `translate_and_integrate_sync_records` end to end with two
    /// translatable `unit` upserts + one record with no translator: asserts the rows are
    /// upserted, changelogs are generated, and each buffer row gets the right result.
    #[actix_rt::test]
    async fn test_batch_translate_and_integrate() {
        use repository::{
            ChangelogCondition, ChangelogRepository, CursorAndLimit, IntegrationResult,
            SyncBufferRepository, SyncBufferRowInsert, UnitRowRepository,
        };

        let (_, connection, _, _) = test_db::setup_all(
            "test_batch_translate_and_integrate",
            MockDataInserts::none(),
        )
        .await;

        let unit_buffer = |id: &str, name: &str| SyncBufferRowInsert {
            record_id: id.to_string(),
            table_name: "unit".to_string(),
            action: SyncAction::Upsert,
            data: repository::SyncRecordData(serde_json::json!({
                "ID": id,
                "units": name,
                "comment": "",
                "order_number": 1,
            })),
            sync_version: SyncVersion::V5V6,
            source_site_id: 0,
            received_datetime: datetime_now(),
            ..Default::default()
        };

        let buffer_repo = SyncBufferRepository::new(&connection);
        buffer_repo
            .insert_many(&[
                unit_buffer("unit_1", "Unit One"),
                unit_buffer("unit_2", "Unit Two"),
                // No translator matches this table -> "Translator for record not found".
                SyncBufferRowInsert {
                    record_id: "nope_1".to_string(),
                    table_name: "no_such_table".to_string(),
                    action: SyncAction::Upsert,
                    data: repository::SyncRecordData(serde_json::json!({})),
                    sync_version: SyncVersion::V5V6,
                    source_site_id: 0,
                    received_datetime: datetime_now(),
                    ..Default::default()
                },
            ])
            .unwrap();

        let records =
            crate::sync::sync_buffer::get_sync_buffer_for_table(&connection, SyncAction::Upsert, "unit", 0, 100)
                .unwrap();
        assert_eq!(records.len(), 2);
        let no_translator = crate::sync::sync_buffer::get_sync_buffer_for_table(
            &connection,
            SyncAction::Upsert,
            "no_such_table",
            0,
            100,
        )
        .unwrap();

        let cursor_before = ChangelogRepository::new(&connection).max_cursor().unwrap();

        let mut integrator = TranslationAndIntegration::new(&connection);
        let all: Vec<SyncBufferRow> = records.iter().cloned().chain(no_translator).collect();
        let errors = integrator
            .translate_and_integrate_sync_records(&all, &crate::sync::translations::all_translators())
            .unwrap();

        // No-translator is not a hard error count (parity with old behaviour).
        assert_eq!(errors, 0);

        // Both rows upserted in the batch.
        let unit_repo = UnitRowRepository::new(&connection);
        assert_eq!(unit_repo.find_one_by_id("unit_1").unwrap().unwrap().name, "Unit One");
        assert_eq!(unit_repo.find_one_by_id("unit_2").unwrap().unwrap().name, "Unit Two");

        // A changelog was generated for each upserted unit (generated AFTER the batch).
        let changelogs = ChangelogRepository::new(&connection)
            .query(
                ChangelogCondition::True(),
                CursorAndLimit {
                    cursor: cursor_before as i64,
                    limit: 1000,
                },
            )
            .unwrap()
            .rows;
        let unit_ids: Vec<String> = changelogs
            .into_iter()
            .filter(|c| c.table_name == ChangelogTableName::Unit)
            .map(|c| c.record_id)
            .collect();
        assert!(unit_ids.contains(&"unit_1".to_string()));
        assert!(unit_ids.contains(&"unit_2".to_string()));

        // Buffer results: units succeeded, no-translator row errored.
        let r1 = buffer_repo
            .find_latest_by_record_id_slow_unindexed("unit_1")
            .unwrap()
            .unwrap();
        assert_eq!(r1.integration_result, Some(IntegrationResult::Success));
        let r_nope = buffer_repo
            .find_latest_by_record_id_slow_unindexed("nope_1")
            .unwrap()
            .unwrap();
        assert_eq!(r_nope.integration_result, Some(IntegrationResult::Error));
        assert_eq!(
            r_nope.integration_error.as_deref(),
            Some("Translator for record not found")
        );
    }
}
