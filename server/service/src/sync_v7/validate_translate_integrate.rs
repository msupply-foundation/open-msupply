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
use repository::*;
use repository::syncv7::{SyncRecordSerializeError, INTEGRATION_ORDER};
use serde::de::Error as _;
use thiserror::Error;
use util::{datetime_now, format_error};

const PROGRESS_INTERVAL: i64 = 1000;

pub(crate) enum SyncContext {
    Central {
        source_site_active_store_ids: Vec<String>,
    },
    Remote {
        is_initialising: bool,
        active_stores: ActiveStoresOnSite,
    },
    /// Records arrived via a patient-lookup pull. They belong to other sites'
    /// stores.
    PatientLookup,
}

#[derive(Error, Debug)]
enum Error {
    #[error(transparent)]
    RepositoryError(#[from] RepositoryError),
    #[error("Error during record translation")]
    TranslationError(#[from] serde_json::Error),
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

fn parse_table_name(table_name: &str) -> Result<ChangelogTableName, Error> {
    table_name
        .parse::<ChangelogTableName>()
        .map_err(|_| Error::UnknownTableName(table_name.to_string()))
}

fn changelog(
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

fn integrate_upsert(
    connection: &StorageConnection,
    upsert: Box<dyn Upsert>,
    table_name: ChangelogTableName,
    row: &SyncBufferRow,
) -> Result<(), Error> {
    let changelog = changelog(table_name, RowActionType::Upsert, row);
    upsert
        .upsert_sync(
            connection,
            ChangelogSyncType::SyncTypeV7 {
                changelog_row: changelog,
            },
        )
        .map_err(Error::IntegrationError)?;

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
        ChangelogTableName::AssetCatalogueItem
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
            return Err(Error::TranslationError(serde_json::Error::custom(format!(
                "No delete translator for table {:?}",
                table_name
            ))));
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
    let changelog = changelog(table_name, RowActionType::Delete, row);
    delete
        .delete_sync(
            connection,
            ChangelogSyncType::SyncTypeV7 {
                changelog_row: changelog,
            },
        )
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
        } => validate_on_central(row, &table_name, source_site_store_ids)?,
        SyncContext::Remote {
            is_initialising,
            active_stores,
        } => validate_on_remote(row, &table_name, active_stores, *is_initialising)?,
        SyncContext::PatientLookup => {} // Patient records belong to another store
    };

    match row.action {
        SyncAction::Upsert => {
            let upsert = deserialize(&table_name, &row.data)?;
            integrate_upsert(connection, upsert, table_name, row)
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
    reference: Option<&str>,
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
                    reference,
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
        reference,
        sync_context,
        wrap_record_in_tx,
    )
}

fn validate_translate_integrate_inner<'a>(
    connection: &StorageConnection,
    mut logger: Option<&mut SyncLogger<'a>>,
    source_site_id: i32,
    reference: Option<&str>,
    sync_context: SyncContext,
    wrap_record_in_tx: bool,
) -> Result<(), RepositoryError> {
    // TODO this is too hacky, prefer active store cache
    let mut sync_context = sync_context;

    let repo = SyncBufferRepository::new(connection);

    let mut total = repo.count_pending(source_site_id, SyncVersion::V7, reference)?;
    let mut last_progress = total / PROGRESS_INTERVAL;

    if let Some(logger) = logger.as_mut() {
        logger.progress(total)?;
    }

    let mut integrate_table = |logger: &mut Option<&mut SyncLogger<'a>>,
                               table: &ChangelogTableName,
                               action: SyncAction,
                               direction: CursorDirection|
     -> Result<(), RepositoryError> {
        log::info!("Integrating table {table} with action {action}");

        let rows = repo.pending_ordered_by_cursor(PendingQuery {
            source_site_id,
            sync_version: SyncVersion::V7,
            reference,
            table_name: table.as_ref(),
            action: action.clone(),
            direction,
        })?;

        log::info!("Number of records to integrate  {}", rows.len());

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
    connection
        .transaction_sync(|con| -> Result<(), RepositoryError> {
            let by_table_action = |table: &ChangelogTableName, action: SyncAction| {
                let table_name = table.to_string();
                let mut filtered: Vec<&SyncBufferRow> = rows
                    .iter()
                    .filter(|r| r.table_name == table_name && r.action == action)
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
