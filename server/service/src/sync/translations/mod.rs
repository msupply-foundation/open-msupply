pub(crate) mod activity_log;
pub(crate) mod asset;
pub(crate) mod asset_catalogue_item;
pub(crate) mod asset_category;
pub(crate) mod asset_class;
pub(crate) mod asset_log;
pub(crate) mod asset_log_reason;
pub(crate) mod asset_property;
pub(crate) mod asset_type;
pub(crate) mod barcode;
pub(crate) mod clinician;
pub(crate) mod clinician_store_join;
pub(crate) mod cold_storage_type;
pub(crate) mod currency;
pub(crate) mod demographic;
pub(crate) mod document;
pub(crate) mod document_registry;
pub(crate) mod form_schema;
pub(crate) mod indicator_attribute;
pub(crate) mod indicator_value;
pub(crate) mod invoice;
pub(crate) mod invoice_line;
pub(crate) mod item;
pub(crate) mod item_variant;
pub(crate) mod location;
pub(crate) mod location_movement;
pub(crate) mod master_list;
pub(crate) mod master_list_line;
pub(crate) mod master_list_name_join;
pub(crate) mod name;
pub(crate) mod name_oms_fields;
pub(crate) mod name_property;
pub(crate) mod name_store_join;
pub(crate) mod name_tag;
pub(crate) mod name_tag_join;
pub(crate) mod packaging_variant;
pub(crate) mod period;
pub(crate) mod period_schedule;
pub(crate) mod program_indicator;
pub(crate) mod program_requisition_settings;
pub(crate) mod property;
pub(crate) mod reason;
pub(crate) mod report;
pub(crate) mod requisition;
pub(crate) mod requisition_line;
pub(crate) mod rnr_form;
pub(crate) mod rnr_form_line;
pub(crate) mod sensor;
pub(crate) mod special;
pub(crate) mod stock_line;
pub(crate) mod stocktake;
pub(crate) mod stocktake_line;
pub(crate) mod store;
pub(crate) mod store_preference;
pub(crate) mod sync_file_reference;
pub(crate) mod temperature_breach;
pub(crate) mod temperature_log;
pub(crate) mod unit;
pub(crate) mod user;
pub(crate) mod user_permission;
pub(crate) mod utils;
pub(crate) mod vaccination;
pub(crate) mod vaccine_course;
pub(crate) mod vaccine_course_dose;
pub(crate) mod vaccine_course_item;

use repository::*;
use thiserror::Error;
use topological_sort::TopologicalSort;

use super::api::{CommonSyncRecord, SyncAction};

pub(crate) type SyncTranslators = Vec<Box<dyn SyncTranslation>>;

pub(crate) fn all_translators() -> SyncTranslators {
    vec![
        // Central
        user::boxed(),
        name::boxed(),
        name_tag::boxed(),
        name_tag_join::boxed(),
        unit::boxed(),
        item::boxed(),
        store::boxed(),
        master_list::boxed(),
        master_list_line::boxed(),
        master_list_name_join::boxed(),
        period_schedule::boxed(),
        period::boxed(),
        program_requisition_settings::boxed(),
        program_indicator::boxed(),
        indicator_attribute::boxed(),
        indicator_value::boxed(),
        report::boxed(),
        reason::boxed(),
        store_preference::boxed(),
        form_schema::boxed(),
        document_registry::boxed(),
        property::boxed(),
        name_property::boxed(),
        cold_storage_type::boxed(),
        // Remote
        location::boxed(),
        location_movement::boxed(),
        stock_line::boxed(),
        invoice::boxed(),
        invoice_line::boxed(),
        stocktake::boxed(),
        stocktake_line::boxed(),
        requisition::boxed(),
        requisition_line::boxed(),
        activity_log::boxed(),
        barcode::boxed(),
        clinician::boxed(),
        clinician_store_join::boxed(),
        name_store_join::boxed(),
        user_permission::boxed(),
        document::boxed(),
        currency::boxed(),
        // Cold chain
        sensor::boxed(),
        temperature_breach::boxed(),
        temperature_log::boxed(),
        // Special translations
        name_oms_fields::boxed(),
        special::name_to_name_store_join::boxed(),
        // Merge
        special::name_merge::boxed(),
        special::item_merge::boxed(),
        special::clinician_merge::boxed(),
        // Assets
        asset::boxed(),
        asset_class::boxed(),
        asset_category::boxed(),
        asset_type::boxed(),
        asset_catalogue_item::boxed(),
        asset_log::boxed(),
        asset_log_reason::boxed(),
        asset_property::boxed(),
        //Sync file reference
        sync_file_reference::boxed(),
        // RnR Form
        rnr_form::boxed(),
        rnr_form_line::boxed(),
        // Vaccine course
        vaccine_course::boxed(),
        vaccine_course_dose::boxed(),
        vaccine_course_item::boxed(),
        demographic::boxed(),
        // Vaccination
        vaccination::boxed(),
        // Item Variant
        item_variant::boxed(),
        packaging_variant::boxed(),
    ]
}

/// Calculates the integration order based on the PullDependencies in the SyncTranslators
pub(crate) fn pull_integration_order(translators: &SyncTranslators) -> Vec<&str> {
    // fill output so that tables with the least dependencies come first
    let mut output = vec![];

    let mut ts = TopologicalSort::<&str>::new();
    for translator in translators {
        let pull_deps = translator.pull_dependencies();
        let table = translator.table_name();
        if pull_deps.is_empty() {
            ts.insert(table);
            continue;
        }
        for dep in pull_deps {
            ts.add_dependency(dep, table);
        }
    }

    loop {
        let mut next = ts.pop_all();
        if next.is_empty() {
            if !ts.is_empty() {
                panic!("Circular dependencies");
            }
            break;
        }
        output.append(&mut next);
    }

    output
}

#[derive(Debug)]
pub(crate) enum IntegrationOperation {
    Upsert(Box<dyn Upsert>), // Upsert record
    Delete(Box<dyn Delete>), // Delete record
}

impl IntegrationOperation {
    pub(crate) fn upsert<U>(upsert: U) -> Self
    where
        U: Upsert + 'static,
    {
        Self::Upsert(Box::new(upsert))
    }

    pub(crate) fn delete<U>(delete: U) -> Self
    where
        U: Delete + 'static,
    {
        Self::Delete(Box::new(delete))
    }
}

#[derive(Debug)]
pub(crate) enum PullTranslateResult {
    IntegrationOperations(Vec<IntegrationOperation>),
    // Translator was found for a record, but ignored because of unexpected data or error
    // For example if store is a system store, or report context not found
    Ignored(String),
    // Translator doesn't translates this record
    NotMatched,
}

impl PartialEq for PullTranslateResult {
    fn eq(&self, other: &Self) -> bool {
        format!("{self:?}") == format!("{other:?}")
    }
}

impl PullTranslateResult {
    pub(crate) fn upsert<U>(upsert: U) -> Self
    where
        U: Upsert + 'static,
    {
        Self::upserts(vec![upsert])
    }

    pub(crate) fn upserts<U>(upsert: Vec<U>) -> Self
    where
        U: Upsert + 'static,
    {
        Self::IntegrationOperations(
            upsert
                .into_iter()
                .map(|upsert| IntegrationOperation::Upsert(Box::new(upsert))) // Source site is added later using add_source_site_id
                .collect(),
        )
    }

    pub(crate) fn delete<U>(upsert: U) -> Self
    where
        U: Delete + 'static,
    {
        Self::deletes(vec![upsert])
    }

    pub(crate) fn deletes<U>(upsert: Vec<U>) -> Self
    where
        U: Delete + 'static,
    {
        Self::IntegrationOperations(
            upsert
                .into_iter()
                .map(|upsert| IntegrationOperation::Delete(Box::new(upsert))) // Source site is added later using add_source_site_id
                .collect(),
        )
    }
}

pub(crate) struct PushSyncRecord {
    pub(crate) cursor: i64,
    pub(crate) record: CommonSyncRecord,
}

pub(crate) enum PushTranslateResult {
    PushRecord(Vec<PushSyncRecord>),
    Ignored(String),
    NotMatched,
}

impl PushTranslateResult {
    pub(crate) fn upsert(
        changelog: &ChangelogRow,
        table_name: &str,
        record_data: serde_json::Value,
    ) -> Self {
        Self::PushRecord(vec![PushSyncRecord {
            cursor: changelog.cursor,
            record: CommonSyncRecord {
                table_name: table_name.to_string(),
                record_id: changelog.record_id.clone(),
                action: SyncAction::Update,
                record_data,
            },
        }])
    }
    pub(crate) fn delete(changelog: &ChangelogRow, table_name: &str) -> Self {
        Self::PushRecord(vec![PushSyncRecord {
            cursor: changelog.cursor,
            record: CommonSyncRecord {
                table_name: table_name.to_string(),
                record_id: changelog.record_id.clone(),
                action: SyncAction::Delete,
                record_data: Default::default(),
            },
        }])
    }
}

/// This enum is used in match_to_sync_record to determine
/// if record needs to be translated and pushed or pulled
/// since SyncTranslation is used for translating from database row
/// to sync record when pushing remote records to Legacy Centra, omSupply Central
/// and when omSupply central is preparing records in response to a pull requestion
/// from omSupply remote sites
pub(crate) enum ToSyncRecordTranslationType {
    /// When omSupply remote is pushing to og mSupply central
    PushToLegacyCentral,
    /// When omSupply remote is pushing to omSupply central
    PushToOmSupplyCentral,
    // When omSupply remote is pulling from omSupply central
    PullFromOmSupplyCentral,
}

/// This trait has collection of methods for sync operation translations
/// it is used on remote site when translating records:
///  * pulled from legacy and omSupply central servers
///  * pushed to legacy and omSupply central servers
/// also used on central site when responding to pull requests
/// from remote sites, to translate to sync record sent in response
///
/// "sync_record" in this context refers to transport layer records (json representation of database record alongside metadata like table_name)
pub(crate) trait SyncTranslation {
    /// Returns information about which legacy tables need to be integrated first before this
    /// translation can run.
    fn pull_dependencies(&self) -> Vec<&str>;
    fn table_name(&self) -> &str;
    /// By default matching by table name
    /// used to determine if translation applies when remote site pulls sync records from central
    fn should_translate_from_sync_record(&self, row: &SyncBufferRow) -> bool {
        self.table_name() == row.table_name
    }

    /// Translate an upsert record received from the central server(s)
    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::NotMatched)
    }

    /// Translate a merge record received from the central server(s)
    fn try_translate_from_merge_sync_record(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::NotMatched)
    }

    /// Translate a delete record received from the central server(s)
    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::NotMatched)
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        None
    }

    /// By default matching by change log type, this methods also determines
    /// if records needs to be pushed to legacy or omSupply central and which records
    /// omSupply central should respond with when pull is requested by remote site
    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            // By default will assume records needs to be pushed to central if change_log_type is implemented
            ToSyncRecordTranslationType::PushToLegacyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            // Have to manually specify in the translation
            ToSyncRecordTranslationType::PullFromOmSupplyCentral => false,
            // Have to manually specify in the translation
            ToSyncRecordTranslationType::PushToOmSupplyCentral => false,
        }
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        _: &StorageConnection,
        _: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::NotMatched)
    }

    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        _: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::NotMatched)
    }
}
#[derive(Error, Debug)]
#[error("Problem translation push record: {changelog:?}")]
pub(crate) struct PushTranslationError {
    changelog: ChangelogRow,
    source: anyhow::Error,
}

pub(crate) fn translate_changelogs_to_sync_records(
    connection: &StorageConnection,
    changelogs: Vec<ChangelogRow>,
    r#type: ToSyncRecordTranslationType,
) -> Result<Vec<PushSyncRecord>, PushTranslationError> {
    let translators = all_translators();
    let mut out_records = Vec::new();
    for changelog in changelogs {
        let mut translation_results =
            translate_changelog(connection, &translators, &changelog, &r#type)
                .map_err(|source| PushTranslationError { source, changelog })?;
        out_records.append(&mut translation_results);
    }

    Ok(out_records)
}

fn translate_changelog(
    connection: &StorageConnection,
    translators: &SyncTranslators,
    changelog: &ChangelogRow,
    r#type: &ToSyncRecordTranslationType,
) -> Result<Vec<PushSyncRecord>, anyhow::Error> {
    let mut translation_results = Vec::new();

    for translator in translators.iter() {
        if !translator.should_translate_to_sync_record(changelog, r#type) {
            continue;
        }

        let translation_result = match changelog.row_action {
            RowActionType::Upsert => {
                translator.try_translate_to_upsert_sync_record(connection, changelog)?
            }
            RowActionType::Delete => {
                translator.try_translate_to_delete_sync_record(connection, changelog)?
            }
        };

        match translation_result {
            PushTranslateResult::PushRecord(records) => translation_results.push(records),
            PushTranslateResult::Ignored(ignore_message) => {
                log::debug!("Ignored record in push translation: {}", ignore_message)
            }
            PushTranslateResult::NotMatched => {}
        }
    }

    Ok(translation_results.into_iter().flatten().collect())
}

#[derive(Debug)]
enum ActiveRecordCheck {
    InvoiceLine { invoice_id: String },
}

#[derive(Error, Debug)]
enum ActiveRecordCheckError {
    #[error("Database error while checking record is active on site {0:?}")]
    DatabaseError(RepositoryError),
    #[error("Problem checking record is active on site, site id is not set in database")]
    SiteIdNotSet,
    #[error("Problem checking record is active on site, parent record not found for {0:?}")]
    ParentRecordNotFound(ActiveRecordCheck),
}

fn is_active_record_on_site(
    connection: &StorageConnection,
    record: ActiveRecordCheck,
) -> Result<bool, ActiveRecordCheckError> {
    use ActiveRecordCheckError as Error;
    let site_id = KeyValueStoreRepository::new(connection)
        .get_i32(repository::KeyType::SettingsSyncSiteId)
        .map_err(Error::DatabaseError)?
        .ok_or(Error::SiteIdNotSet)?;

    let result = match &record {
        ActiveRecordCheck::InvoiceLine { invoice_id } => {
            let invoice = InvoiceRepository::new(connection)
                .query_one(InvoiceFilter::new().id(EqualFilter::equal_to(invoice_id)))
                .map_err(Error::DatabaseError)?
                .ok_or(Error::ParentRecordNotFound(record))?;
            invoice.store_row.site_id == site_id
        }
    };

    Ok(result)
}
