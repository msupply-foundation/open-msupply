use crate::{
    sync::{
        sync_buffer::{
            write_sync_buffer_error, write_sync_buffer_ignored, write_sync_buffer_success,
        },
        ActiveStoresOnSite,
    },
    sync_v7::{serde::deserialize, sync_logger::SyncLogger},
};

use super::validate::*;
use repository::syncv7::{SyncRecordSerializeError, INTEGRATION_ORDER};
use repository::*;
use std::collections::{HashMap, HashSet};
use thiserror::Error;
use util::{datetime_now, format_error};

const PROGRESS_INTERVAL: i64 = 1000;

pub(crate) enum SyncContext {
    Central {
        source_site_active_store_ids: Vec<String>,
        is_multi_device: bool,
    },
    Remote {
        is_initialising: bool,
        active_stores: ActiveStoresOnSite,
        is_multi_device: bool,
    },
    /// Records arrived via a patient-lookup pull. They belong to other sites'
    /// stores.
    PatientLookup { active_stores: ActiveStoresOnSite },
}

#[derive(Error, Debug)]
enum Error {
    #[error(transparent)]
    RepositoryError(#[from] RepositoryError),
    #[error("Error during record translation")]
    TranslationError(#[from] serde_json::Error),
    #[error("Delete translator not found for table: {0}")]
    DeleteTranslatorNotFound(ChangelogTableName),
    #[error("Error during record deserialization: {0}")]
    DeserializeError(#[from] SyncRecordSerializeError),
    #[error("Error during record validation")]
    ValidationError(#[from] ValidationError),
    #[error("Error during record integration")]
    IntegrationError(#[source] RepositoryError),
    #[error("Unknown table name: {0}")]
    UnknownTableName(String),
    #[error("Unsupported sync action: {0:?}")]
    UnsupportedAction(SyncAction),
}

pub(crate) fn create_changelog(
    table_name: ChangelogTableName,
    action: RowActionType,
    row: &SyncBufferRow,
) -> ChangeLogInsertRow {
    ChangeLogInsertRow {
        table_name,
        record_id: row.record_id.clone(),
        row_action: action,
        store_id: row.store_id.clone(),
        source_site_id: Some(row.source_site_id),
        transfer_store_id: row.transfer_store_id.clone(),
        patient_id: row.patient_id.clone(),
    }
}

fn parse_table_name(table_name: &str) -> Result<ChangelogTableName, Error> {
    table_name
        .parse::<ChangelogTableName>()
        .map_err(|_| Error::UnknownTableName(table_name.to_string()))
}

fn integrate_upserts(
    connection: &StorageConnection,
    upsert: Vec<(Box<dyn Upsert>, ChangeLogInsertRow)>,
) -> Result<(), Error> {
    for (upsert, changelog_row) in upsert {
        upsert
            .upsert_sync(connection, ChangelogSyncType::SyncTypeV7 { changelog_row })
            .map_err(Error::IntegrationError)?;
    }

    Ok(())
}
fn translate_delete(
    table_name: &ChangelogTableName,
    record_id: &str,
) -> Result<Box<dyn Delete>, Error> {
    let id = record_id.to_string();
    let delete: Box<dyn Delete> = match table_name {
        ChangelogTableName::Abbreviation => Box::new(AbbreviationRowDelete(id)),
        ChangelogTableName::ActivityLog => Box::new(ActivityLogRowDelete(id)),
        ChangelogTableName::AssetInternalLocation => Box::new(AssetInternalLocationRowDelete(id)),
        ChangelogTableName::BackendPlugin => Box::new(BackendPluginRowDelete(id)),
        ChangelogTableName::ClinicianStoreJoin => Box::new(ClinicianStoreJoinRowDelete(id)),
        ChangelogTableName::Contact => Box::new(ContactRowDelete(id)),
        ChangelogTableName::Diagnosis => Box::new(DiagnosisRowDelete(id)),
        ChangelogTableName::FormSchema => Box::new(FormSchemaRowDelete(id)),
        ChangelogTableName::FrontendPlugin => Box::new(FrontendPluginRowDelete(id)),
        ChangelogTableName::IndicatorValue => Box::new(IndicatorValueRowDelete(id)),
        ChangelogTableName::Invoice => Box::new(InvoiceRowDelete(id)),
        ChangelogTableName::InvoiceLine => Box::new(InvoiceLineRowDelete(id)),
        ChangelogTableName::ItemDirection => Box::new(ItemDirectionRowDelete(id)),
        ChangelogTableName::Location => Box::new(LocationRowDelete(id)),
        ChangelogTableName::MasterListLine => Box::new(MasterListLineRowDelete(id)),
        ChangelogTableName::MasterListNameJoin => Box::new(MasterListNameJoinRowDelete(id)),
        ChangelogTableName::NameStoreJoin => Box::new(NameStoreJoinRowDelete(id)),
        ChangelogTableName::NameTag => Box::new(NameTagRowDelete(id)),
        ChangelogTableName::NameTagJoin => Box::new(NameTagJoinRowDelete(id)),
        ChangelogTableName::Preference => Box::new(PreferenceRowDelete(id)),
        ChangelogTableName::ProgramRequisitionOrderType => {
            Box::new(ProgramRequisitionOrderTypeRowDelete(id))
        }
        ChangelogTableName::ProgramRequisitionSettings => {
            Box::new(ProgramRequisitionSettingsRowDelete(id))
        }
        ChangelogTableName::PurchaseOrder => Box::new(PurchaseOrderDelete(id)),
        ChangelogTableName::PurchaseOrderLine => Box::new(PurchaseOrderLineDelete(id)),
        ChangelogTableName::Report => Box::new(ReportRowDelete(id)),
        ChangelogTableName::Requisition => Box::new(RequisitionRowDelete(id)),
        ChangelogTableName::RequisitionLine => Box::new(RequisitionLineRowDelete(id)),
        ChangelogTableName::RnrForm => Box::new(RnRFormDelete(id)),
        ChangelogTableName::RnrFormLine => Box::new(RnRFormLineDelete(id)),
        ChangelogTableName::Site => Box::new(SiteRowDelete(id)),
        ChangelogTableName::StockLine => Box::new(StockLineRowDelete(id)),
        ChangelogTableName::PrescriptionOrder => Box::new(PrescriptionOrderRowDelete(id)),
        ChangelogTableName::PrescriptionOrderLine => Box::new(PrescriptionOrderLineRowDelete(id)),
        ChangelogTableName::StockRelocation => Box::new(StockRelocationRowDelete(id)),
        ChangelogTableName::StockRelocationLine => Box::new(StockRelocationLineRowDelete(id)),
        ChangelogTableName::Stocktake => Box::new(StocktakeRowDelete(id)),
        ChangelogTableName::StocktakeLine => Box::new(StocktakeLineRowDelete(id)),
        ChangelogTableName::UserAccount => Box::new(UserAccountRowDelete(id)),
        ChangelogTableName::UserPermission => Box::new(UserPermissionRowDelete(id)),
        ChangelogTableName::VVMStatus => Box::new(VVMStatusRowDelete(id)),
        ChangelogTableName::VVMStatusLog => Box::new(VVMStatusLogRowDelete(id)),
        ChangelogTableName::Unit => Box::new(UnitRowDelete(id)),
        ChangelogTableName::Program => Box::new(ProgramRowDelete(id)),
        ChangelogTableName::Asset => Box::new(AssetRowDelete(id)),
        ChangelogTableName::Category => Box::new(CategoryRowDelete(id)),
        ChangelogTableName::Currency => Box::new(CurrencyRowDelete(id)),
        ChangelogTableName::Item => Box::new(ItemRowDelete(id)),
        ChangelogTableName::Name => Box::new(NameRowDelete(id)),
        ChangelogTableName::Sensor => Box::new(SensorRowDelete(id)),
        // Tables without a delete translator / do not delete
        ChangelogTableName::AncillaryItem
        | ChangelogTableName::AssetCatalogueItem
        | ChangelogTableName::AssetCatalogueType
        | ChangelogTableName::AssetCategory
        | ChangelogTableName::AssetClass
        | ChangelogTableName::AssetLog
        | ChangelogTableName::AssetLogReason
        | ChangelogTableName::AssetProperty
        | ChangelogTableName::Barcode
        | ChangelogTableName::BundledItem
        | ChangelogTableName::Campaign
        | ChangelogTableName::Clinician
        | ChangelogTableName::ContactForm
        | ChangelogTableName::ContactTrace
        | ChangelogTableName::Context
        | ChangelogTableName::Demographic
        | ChangelogTableName::DemographicIndicator
        | ChangelogTableName::Document
        | ChangelogTableName::DocumentRegistry
        | ChangelogTableName::Encounter
        | ChangelogTableName::HelpDocument
        | ChangelogTableName::IndicatorColumn
        | ChangelogTableName::IndicatorLine
        | ChangelogTableName::InsuranceProvider
        | ChangelogTableName::ItemCategoryJoin
        | ChangelogTableName::ItemStoreJoin
        | ChangelogTableName::ItemVariant
        | ChangelogTableName::ItemWarningJoin
        | ChangelogTableName::LocationMovement
        | ChangelogTableName::LocationType
        | ChangelogTableName::MasterList
        | ChangelogTableName::NameInsuranceJoin
        | ChangelogTableName::NameOmsFields
        | ChangelogTableName::NameProperty
        | ChangelogTableName::PackagingVariant
        | ChangelogTableName::Period
        | ChangelogTableName::PeriodSchedule
        | ChangelogTableName::PluginData
        | ChangelogTableName::Printer
        | ChangelogTableName::ProgramEnrolment
        | ChangelogTableName::ProgramEvent
        | ChangelogTableName::ProgramIndicator
        | ChangelogTableName::Property
        | ChangelogTableName::CustomField
        | ChangelogTableName::CustomFieldOption
        | ChangelogTableName::CustomFieldScope
        | ChangelogTableName::ReasonOption
        | ChangelogTableName::ShippingMethod
        | ChangelogTableName::Store
        | ChangelogTableName::StorePreference
        | ChangelogTableName::SyncFileReference
        | ChangelogTableName::SyncMessage
        | ChangelogTableName::SystemLog
        | ChangelogTableName::TemperatureBreach
        | ChangelogTableName::TemperatureLog
        | ChangelogTableName::UserStoreJoin
        | ChangelogTableName::Vaccination
        | ChangelogTableName::VaccineCourse
        | ChangelogTableName::VaccineCourseDose
        | ChangelogTableName::VaccineCourseItem
        | ChangelogTableName::VaccineCourseStoreConfig => {
            return Err(Error::DeleteTranslatorNotFound(table_name.clone()));
        }
        // A table this site doesn't recognise (e.g. added on a newer central). Such
        // records aren't part of `INTEGRATION_ORDER` so they never reach here, but treat
        // it as an unknown table rather than a missing delete translator if one does.
        ChangelogTableName::Other(unknown) => {
            return Err(Error::UnknownTableName(unknown.clone()));
        }
    };

    Ok(delete)
}

fn integrate_delete(
    connection: &StorageConnection,
    delete: Box<dyn Delete>,
    table_name: ChangelogTableName,
    row: &SyncBufferRow,
) -> Result<(), Error> {
    let changelog_row = create_changelog(table_name, RowActionType::Delete, row);
    delete
        .delete_sync(connection, ChangelogSyncType::SyncTypeV7 { changelog_row })
        .map_err(Error::IntegrationError)?;

    Ok(())
}

fn validate_translate_integrate_one(
    connection: &StorageConnection,
    row: &SyncBufferRow,
    sync_context: &SyncContext,
) -> Result<(), Error> {
    let table_name = parse_table_name(&row.table_name)?;

    match sync_context {
        SyncContext::Central {
            source_site_active_store_ids: source_site_store_ids,
            is_multi_device,
        } => validate_on_central(row, &table_name, source_site_store_ids, *is_multi_device)?,
        SyncContext::Remote {
            is_initialising,
            active_stores,
            is_multi_device,
        } => validate_on_remote(
            row,
            &table_name,
            active_stores,
            *is_initialising,
            *is_multi_device,
        )?,
        SyncContext::PatientLookup { .. } => {}
    };

    match row.action {
        SyncAction::Upsert => {
            let upserts = deserialize(connection, &table_name, &row, sync_context)?;
            integrate_upserts(connection, upserts)
        }
        SyncAction::Delete => {
            let delete = translate_delete(&table_name, &row.record_id)?;
            integrate_delete(connection, delete, table_name, row)
        }
        _ => Err(Error::UnsupportedAction(row.action.clone())),
    }
}

pub(crate) fn validate_translate_integrate<'a>(
    connection: &StorageConnection,
    logger: Option<&mut SyncLogger<'a>>,
    source_site_id: i32,
    reference_id: Option<&str>,
    sync_context: SyncContext,
    is_initialising: bool,
) -> Result<(), RepositoryError> {
    // During initialisation we don't need transaction as user can't access database
    // and processors are not running, however we still want it for sqlite as it speeds it up
    let dont_wrap_in_tx = is_initialising && cfg!(not(feature = "postgres"));
    let wrap_in_outer_tx = !dont_wrap_in_tx;

    // When not initialising, isolate each record + changelog write in its own
    // nested transaction so a single failure doesn't roll back the whole batch.
    // This is not needed for sqlite as it doesn't poison transaction on failure
    let wrap_record_in_tx = wrap_in_outer_tx && cfg!(feature = "postgres");

    // Even when initialising
    if wrap_in_outer_tx {
        return connection
            .transaction_sync(move |t_con| {
                validate_translate_integrate_inner(
                    t_con,
                    logger,
                    source_site_id,
                    reference_id,
                    sync_context,
                    wrap_record_in_tx,
                )
            })
            .map_err(|e| e.to_inner_error());
    }

    validate_translate_integrate_inner(
        connection,
        logger,
        source_site_id,
        reference_id,
        sync_context,
        wrap_record_in_tx,
    )
}

fn validate_translate_integrate_inner<'a>(
    connection: &StorageConnection,
    mut logger: Option<&mut SyncLogger<'a>>,
    source_site_id: i32,
    reference_id: Option<&str>,
    sync_context: SyncContext,
    wrap_record_in_tx: bool,
) -> Result<(), RepositoryError> {
    // TODO this is too hacky, prefer active store cache
    let mut sync_context = sync_context;

    let repo = SyncBufferRepository::new(connection);

    let integration_tables: Vec<&str> = INTEGRATION_ORDER.iter().map(|t| t.as_ref()).collect();

    // Latest-wins pre-pass (#12610): only the newest pending row per
    // (table_name, record_id) integrates in this run. Older rows — e.g. a
    // stale Delete that arrived in an earlier pull batch than its re-create
    // Upsert — are marked Ignored here; the upserts-then-deletes phase split
    // below would otherwise apply them out of arrival order and a stale
    // delete would wipe the newer record.
    let keys = repo.pending_keys(
        source_site_id,
        SyncVersion::V7,
        reference_id,
        &integration_tables,
    )?;
    let key_refs: Vec<(&str, &str, i32)> = keys
        .iter()
        .map(|k| (k.table_name.as_str(), k.record_id.as_str(), k.cursor))
        .collect();
    for cursor in superseded_cursors(&key_refs) {
        write_sync_buffer_ignored(
            connection,
            cursor,
            datetime_now(),
            "Superseded by a newer sync buffer row for the same record",
        )?;
    }

    let mut total = repo.count_pending(
        source_site_id,
        SyncVersion::V7,
        reference_id,
        Some(&integration_tables),
    )?;
    let mut last_progress = total / PROGRESS_INTERVAL;

    if let Some(logger) = logger.as_mut() {
        logger.progress(total)?;
    }

    let mut integrate_table = |logger: &mut Option<&mut SyncLogger<'a>>,
                               table: &ChangelogTableName,
                               action: SyncAction,
                               direction: CursorDirection|
     -> Result<(), RepositoryError> {
        log::debug!("Integrating table {table} with action {action}");

        let rows = repo.pending_ordered_by_cursor(PendingQuery {
            source_site_id,
            sync_version: SyncVersion::V7,
            reference_id,
            table_name: table.as_ref(),
            action: action.clone(),
            direction,
            limit: i64::MAX,
        })?;

        log::debug!("Number of records to integrate  {}", rows.len());

        let had_store_records = *table == ChangelogTableName::Store && !rows.is_empty();

        for row in &rows {
            let started = datetime_now();
            let one_result = if wrap_record_in_tx {
                connection
                    .transaction_sync_etc(
                        |sub| validate_translate_integrate_one(sub, row, &sync_context),
                        false,
                    )
                    .map_err(|e| e.to_inner_error())
            } else {
                validate_translate_integrate_one(connection, row, &sync_context)
            };
            match one_result {
                Ok(()) => write_sync_buffer_success(connection, row.cursor, started)?,
                Err(e @ Error::ValidationError(_)) => {
                    write_sync_buffer_ignored(connection, row.cursor, started, &format_error(&e))?;
                }
                Err(e) => {
                    write_sync_buffer_error(connection, row.cursor, started, &format_error(&e))?;
                }
            }

            total -= 1;

            if let Some(logger) = logger.as_mut() {
                if total / PROGRESS_INTERVAL <= last_progress {
                    logger.progress(total)?;
                    last_progress -= 1;
                }
            }
        }

        // Refresh active stores after any Store batch (upsert or delete)
        // so downstream Remote records validate against fresh state.
        // Central path doesn't need refresh — Store rows are Central records
        if had_store_records {
            if let SyncContext::Remote {
                is_initialising: _,
                is_multi_device: _,
                active_stores,
            } = &mut sync_context
            {
                *active_stores = ActiveStoresOnSite::get(connection).unwrap();
            }
        }

        Ok(())
    };

    // Upserts: parents before children, rows ordered by cursor ASC within each table.
    for table in INTEGRATION_ORDER {
        integrate_table(&mut logger, table, SyncAction::Upsert, CursorDirection::Asc)?;
    }

    // Deletes: children before parents, rows ordered by cursor DESC within each table.
    for table in INTEGRATION_ORDER.iter().rev() {
        integrate_table(
            &mut logger,
            table,
            SyncAction::Delete,
            CursorDirection::Desc,
        )?;
    }

    Ok(())
}

pub(crate) fn validate_translate_integrate_in_memory(
    connection: &StorageConnection,
    rows: &[SyncBufferRow],
    sync_context: SyncContext,
) -> Result<(), RepositoryError> {
    // Latest-wins, mirroring `validate_translate_integrate_inner`'s pre-pass:
    // rows here carry the central changelog cursor, so the highest cursor per
    // (table_name, record_id) is the record's latest state. Superseded rows
    // are simply skipped — nothing is persisted for this path.
    let key_refs: Vec<(&str, &str, i32)> = rows
        .iter()
        .map(|r| (r.table_name.as_str(), r.record_id.as_str(), r.cursor))
        .collect();
    let superseded: HashSet<i32> = superseded_cursors(&key_refs).into_iter().collect();

    connection
        .transaction_sync(|con| -> Result<(), RepositoryError> {
            let by_table_action = |table: &ChangelogTableName, action: SyncAction| {
                let table_name = table.to_string();
                let mut filtered: Vec<&SyncBufferRow> = rows
                    .iter()
                    .filter(|r| {
                        r.table_name == table_name
                            && r.action == action
                            && !superseded.contains(&r.cursor)
                    })
                    .collect();
                match action {
                    SyncAction::Delete => filtered.sort_by_key(|r| std::cmp::Reverse(r.cursor)),
                    _ => filtered.sort_by_key(|r| r.cursor),
                };
                filtered
            };

            for table in INTEGRATION_ORDER {
                for row in by_table_action(table, SyncAction::Upsert) {
                    validate_translate_integrate_one(con, row, &sync_context).map_err(|e| {
                        RepositoryError::as_db_error(
                            &format!(
                                "Patient lookup integration ({} {} {})",
                                row.table_name, row.action, row.record_id
                            ),
                            format_error(&e),
                        )
                    })?;
                }
            }
            for table in INTEGRATION_ORDER.iter().rev() {
                for row in by_table_action(table, SyncAction::Delete) {
                    validate_translate_integrate_one(con, row, &sync_context).map_err(|e| {
                        RepositoryError::as_db_error(
                            &format!(
                                "Patient lookup integration ({} {} {})",
                                row.table_name, row.action, row.record_id
                            ),
                            format_error(&e),
                        )
                    })?;
                }
            }
            Ok(())
        })
        .map_err(|e| e.to_inner_error())
}

/// Offline/CLI entry point: integrate whatever is pending in the sync buffer for
/// `source_site_id`, mirroring the remote `integrate` step during initialisation but without an
/// API session or logger. Used by the CLI's `initialise-from-export` for v7 exports, where the
/// buffer rows come from a file rather than a pull.
///
/// Requires `SettingsSyncSiteId` to be set (the CLI sets it from the export
/// before calling this).
pub fn integrate_pending_sync_buffer_v7(
    connection: &StorageConnection,
    source_site_id: i32,
) -> Result<(), RepositoryError> {
    let active_stores = ActiveStoresOnSite::get(connection)
        .map_err(|e| RepositoryError::as_db_error("Failed to load active stores", e))?;

    // Mirrors the v7 synchroniser's integrate step (see `sync.rs`).
    let is_multi_device = KeyValueStoreRepository::new(connection)
        .get_bool(KeyType::SettingsSyncSiteIsMultiDevice)?
        .unwrap_or(false);

    validate_translate_integrate(
        connection,
        None,
        source_site_id,
        None,
        SyncContext::Remote {
            is_initialising: true,
            active_stores,
            is_multi_device,
        },
        true,
    )
}

/// Cursors of rows superseded by a higher-cursor row for the same
/// (table_name, record_id). The buffer cursor is DB arrival order — monotone
/// with the source's changelog order — so the highest cursor is the record's
/// latest state and older rows must not be applied (#12610).
fn superseded_cursors(keys: &[(&str, &str, i32)]) -> Vec<i32> {
    let mut max_by_key: HashMap<(&str, &str), i32> = HashMap::new();
    for (table_name, record_id, cursor) in keys {
        max_by_key
            .entry((table_name, record_id))
            .and_modify(|max| *max = (*max).max(*cursor))
            .or_insert(*cursor);
    }
    keys.iter()
        .filter(|(table_name, record_id, cursor)| *cursor < max_by_key[&(*table_name, *record_id)])
        .map(|(_, _, cursor)| *cursor)
        .collect()
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::sync::ActiveStoresOnSite;
    use repository::{
        mock::{mock_store_a, mock_user_account_a, MockDataInserts},
        test_db::setup_all,
    };

    /// Matches `mock_store_a().site_id`, making store_a active on this site.
    const SITE_ID: i32 = 100;
    const SOURCE_SITE_ID: i32 = 1;

    async fn setup(name: &str, inserts: MockDataInserts) -> StorageConnection {
        let (_, connection, _, _) = setup_all(name, inserts).await;
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(SITE_ID))
            .unwrap();
        connection
    }

    fn buffer_row(
        record_id: &str,
        action: SyncAction,
        data: serde_json::Value,
    ) -> SyncBufferRowInsert {
        SyncBufferRowInsert {
            record_id: record_id.to_string(),
            table_name: "unit".to_string(),
            action,
            data: SyncRecordData(data),
            sync_version: SyncVersion::V7,
            source_site_id: SOURCE_SITE_ID,
            ..Default::default()
        }
    }

    fn unit_data(id: &str) -> serde_json::Value {
        serde_json::to_value(UnitRow {
            id: id.to_string(),
            name: id.to_string(),
            is_active: true,
            ..Default::default()
        })
        .unwrap()
    }

    fn integrate(connection: &StorageConnection, reference_id: Option<&str>) {
        let active_stores = ActiveStoresOnSite::get(connection).unwrap();
        validate_translate_integrate(
            connection,
            None,
            SOURCE_SITE_ID,
            reference_id,
            SyncContext::Remote {
                is_initialising: true,
                active_stores,
                is_multi_device: false,
            },
            true,
        )
        .unwrap();
    }

    /// The buffer row at `cursor` (the PK). The buffer holds a handful of rows
    /// in these tests, so filtering `get_all` is cheaper than a bespoke query.
    fn buffer_at_cursor(connection: &StorageConnection, cursor: i32) -> SyncBufferRow {
        SyncBufferRepository::new(connection)
            .get_all()
            .unwrap()
            .into_iter()
            .find(|row| row.cursor == cursor)
            .unwrap_or_else(|| panic!("no sync buffer row at cursor {}", cursor))
    }

    fn buffer_result(
        connection: &StorageConnection,
        cursor: i32,
    ) -> (Option<IntegrationResult>, Option<String>) {
        let row = buffer_at_cursor(connection, cursor);
        (row.integration_result, row.integration_error)
    }

    #[actix_rt::test]
    async fn integrate_strips_nul_characters() {
        // Sqlite sites accept NUL padded strings (as sent by legacy mSupply), and can
        // push them on over v7. Postgres text columns cannot store a NUL, so they are
        // stripped before integration rather than failing the record with
        // `invalid byte sequence for encoding "UTF8": 0x00`.
        let connection = setup("integrate_strips_nul_characters", MockDataInserts::none()).await;

        let mut data = unit_data("u1");
        data["name"] = serde_json::json!("Tablet\u{0000}\u{0000}");

        SyncBufferRepository::new(&connection)
            .insert_many(&[buffer_row("u1", SyncAction::Upsert, data)])
            .unwrap();

        integrate(&connection, None);

        let unit = UnitRowRepository::new(&connection)
            .find_one_by_id("u1")
            .unwrap()
            .expect("unit must exist after integration");
        assert_eq!(unit.name, "Tablet");

        let (result, error) = buffer_result(&connection, 1);
        assert_eq!(result, Some(IntegrationResult::Success));
        assert_eq!(error, None);
    }

    #[actix_rt::test]
    async fn integrate_marks_stale_delete_superseded() {
        // The #12610 shape: a stale Delete arrives in an earlier batch than the
        // record's re-create Upsert. The delete must be superseded, not applied
        // after the upsert.
        let connection = setup(
            "integrate_marks_stale_delete_superseded",
            MockDataInserts::none(),
        )
        .await;

        SyncBufferRepository::new(&connection)
            .insert_many(&[
                buffer_row("u1", SyncAction::Delete, serde_json::json!({})),
                buffer_row("u1", SyncAction::Upsert, unit_data("u1")),
            ])
            .unwrap();

        integrate(&connection, None);

        let unit = UnitRowRepository::new(&connection)
            .find_one_by_id("u1")
            .unwrap()
            .expect("unit must exist after integration");
        // Without the pre-pass the delete phase runs last and soft-deletes it.
        assert!(unit.is_active);

        let (result, error) = buffer_result(&connection, 1);
        assert_eq!(result, Some(IntegrationResult::Ignored));
        assert!(error.unwrap().contains("Superseded"));
        let (result, _) = buffer_result(&connection, 2);
        assert_eq!(result, Some(IntegrationResult::Success));
    }

    #[actix_rt::test]
    async fn integrate_upsert_then_delete_still_deletes() {
        // The record's latest action is the Delete — the older Upsert is
        // superseded and the record must not exist afterwards.
        let connection = setup(
            "integrate_upsert_then_delete_still_deletes",
            MockDataInserts::none(),
        )
        .await;

        SyncBufferRepository::new(&connection)
            .insert_many(&[
                buffer_row("u1", SyncAction::Upsert, unit_data("u1")),
                buffer_row("u1", SyncAction::Delete, serde_json::json!({})),
            ])
            .unwrap();

        integrate(&connection, None);

        assert_eq!(
            UnitRowRepository::new(&connection)
                .find_one_by_id("u1")
                .unwrap(),
            None
        );
        let (result, _) = buffer_result(&connection, 1);
        assert_eq!(result, Some(IntegrationResult::Ignored));
        let (result, _) = buffer_result(&connection, 2);
        assert_eq!(result, Some(IntegrationResult::Success));
    }

    #[actix_rt::test]
    async fn integrate_distinct_records_unaffected() {
        let connection = setup(
            "integrate_distinct_records_unaffected",
            MockDataInserts::none(),
        )
        .await;

        SyncBufferRepository::new(&connection)
            .insert_many(&[
                buffer_row("u1", SyncAction::Upsert, unit_data("u1")),
                buffer_row("u2", SyncAction::Delete, serde_json::json!({})),
            ])
            .unwrap();

        integrate(&connection, None);

        assert!(UnitRowRepository::new(&connection)
            .find_one_by_id("u1")
            .unwrap()
            .is_some());
        let (result, _) = buffer_result(&connection, 1);
        assert_eq!(result, Some(IntegrationResult::Success));
        let (result, _) = buffer_result(&connection, 2);
        assert_eq!(result, Some(IntegrationResult::Success));
    }

    #[actix_rt::test]
    async fn integrate_does_not_supersede_across_reference_ids() {
        // Supersession is scoped to the rows a run will actually process: a
        // reference-scoped row must not be superseded by (or supersede) a
        // NULL-reference row.
        let connection = setup(
            "integrate_does_not_supersede_across_reference_ids",
            MockDataInserts::none(),
        )
        .await;

        SyncBufferRepository::new(&connection)
            .insert_many(&[
                buffer_row("u1", SyncAction::Delete, serde_json::json!({})),
                SyncBufferRowInsert {
                    reference_id: Some("ref-1".to_string()),
                    ..buffer_row("u1", SyncAction::Upsert, unit_data("u1"))
                },
            ])
            .unwrap();

        // NULL-reference run processes only the delete.
        integrate(&connection, None);
        let (result, _) = buffer_result(&connection, 1);
        assert_eq!(result, Some(IntegrationResult::Success));
        assert!(!buffer_at_cursor(&connection, 2).is_integrated);

        // The reference run then integrates its own upsert.
        integrate(&connection, Some("ref-1"));
        let (result, _) = buffer_result(&connection, 2);
        assert_eq!(result, Some(IntegrationResult::Success));
        assert!(UnitRowRepository::new(&connection)
            .find_one_by_id("u1")
            .unwrap()
            .is_some());
    }

    #[actix_rt::test]
    async fn integrate_user_permission_delete_recreate() {
        // High-fidelity #12610 reproduction: user_permission is hard-deleted,
        // uses deterministic ids, and is Remote-authored (store-scoped).
        let connection = setup(
            "integrate_user_permission_delete_recreate",
            MockDataInserts::none().names().stores().user_accounts(),
        )
        .await;

        let permission = UserPermissionRow {
            id: "perm1".to_string(),
            user_id: mock_user_account_a().id,
            store_id: Some(mock_store_a().id),
            ..Default::default()
        };
        let row = |action: SyncAction, data: serde_json::Value| SyncBufferRowInsert {
            store_id: Some(mock_store_a().id),
            table_name: "user_permission".to_string(),
            ..buffer_row("perm1", action, data)
        };

        SyncBufferRepository::new(&connection)
            .insert_many(&[
                row(SyncAction::Delete, serde_json::json!({})),
                row(
                    SyncAction::Upsert,
                    serde_json::to_value(&permission).unwrap(),
                ),
            ])
            .unwrap();

        integrate(&connection, None);

        assert!(UserPermissionRowRepository::new(&connection)
            .find_one_by_id("perm1")
            .unwrap()
            .is_some());
        let (result, error) = buffer_result(&connection, 1);
        assert_eq!(result, Some(IntegrationResult::Ignored));
        assert!(error.unwrap().contains("Superseded"));
    }

    #[actix_rt::test]
    async fn in_memory_integration_applies_latest_wins() {
        let connection = setup(
            "in_memory_integration_applies_latest_wins",
            MockDataInserts::none(),
        )
        .await;

        let row = |cursor: i32, action: SyncAction, data: serde_json::Value| SyncBufferRow {
            cursor,
            record_id: "u1".to_string(),
            table_name: "unit".to_string(),
            action,
            data: SyncRecordData(data),
            sync_version: SyncVersion::V7,
            source_site_id: SOURCE_SITE_ID,
            ..Default::default()
        };

        let active_stores = ActiveStoresOnSite::get(&connection).unwrap();
        validate_translate_integrate_in_memory(
            &connection,
            &[
                row(1, SyncAction::Delete, serde_json::json!({})),
                row(2, SyncAction::Upsert, unit_data("u1")),
            ],
            SyncContext::PatientLookup { active_stores },
        )
        .unwrap();

        let unit = UnitRowRepository::new(&connection)
            .find_one_by_id("u1")
            .unwrap()
            .expect("unit must exist after in-memory integration");
        assert!(unit.is_active);
    }

    #[test]
    fn superseded_cursors_picks_max_per_key() {
        let keys = [
            ("unit", "u1", 1),
            ("unit", "u1", 5),
            ("unit", "u1", 3),
            ("unit", "u2", 2),
            // Same record_id in a different table is an independent key.
            ("item", "u1", 4),
        ];
        let mut superseded = superseded_cursors(&keys);
        superseded.sort();
        assert_eq!(superseded, vec![1, 3]);
    }
}
