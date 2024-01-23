pub(crate) mod activity_log;
pub(crate) mod barcode;
pub(crate) mod clinician;
pub(crate) mod clinician_store_join;
pub(crate) mod document;
pub(crate) mod document_registry;
pub(crate) mod form_schema;
pub(crate) mod inventory_adjustment_reason;
pub(crate) mod invoice;
pub(crate) mod invoice_line;
pub(crate) mod item;
pub(crate) mod location;
pub(crate) mod location_movement;
pub(crate) mod master_list;
pub(crate) mod master_list_line;
pub(crate) mod master_list_name_join;
pub(crate) mod name;
pub(crate) mod name_store_join;
pub(crate) mod name_tag;
pub(crate) mod name_tag_join;
pub(crate) mod pack_variant;
pub(crate) mod period;
pub(crate) mod period_schedule;
pub(crate) mod program_requisition_settings;
pub(crate) mod report;
pub(crate) mod requisition;
pub(crate) mod requisition_line;
pub(crate) mod sensor;
pub(crate) mod special;
pub(crate) mod stock_line;
pub(crate) mod stocktake;
pub(crate) mod stocktake_line;
pub(crate) mod store;
pub(crate) mod store_preference;
pub(crate) mod temperature_breach;
pub(crate) mod temperature_log;
pub(crate) mod unit;
pub(crate) mod user_permission;

use repository::*;
use thiserror::Error;
use topological_sort::TopologicalSort;

use super::api::{CommonSyncRecord, SyncAction};

pub(crate) type SyncTranslators = Vec<Box<dyn SyncTranslation>>;

pub(crate) fn all_translators() -> SyncTranslators {
    vec![
        // Central
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
        report::boxed(),
        inventory_adjustment_reason::boxed(),
        store_preference::boxed(),
        form_schema::boxed(),
        document_registry::boxed(),
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
        // Remote-Central (site specific)
        name_store_join::boxed(),
        user_permission::boxed(),
        document::boxed(),
        // Special translations
        special::name_to_name_store_join::boxed(),
        // Cold chain
        sensor::boxed(),
        temperature_breach::boxed(),
        temperature_log::boxed(),
        pack_variant::boxed(),
    ]
}

/// Calculates the integration order based on the PullDependencies in the SyncTranslators
pub(crate) fn pull_integration_order(translators: &SyncTranslators) -> Vec<&'static str> {
    // fill output so that tables with the least dependencies come first
    let mut output = vec![];

    let mut ts = TopologicalSort::<&str>::new();
    for translator in translators {
        let pull_deps = translator.pull_dependencies();
        let table = translator.table_name();
        if pull_deps.len() == 0 {
            ts.insert(table);
            continue;
        }
        for dep in pull_deps {
            ts.add_dependency(dep, table);
        }
    }

    loop {
        let mut next = ts.pop_all();
        if next.len() == 0 {
            if ts.len() != 0 {
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
    Upsert(Box<dyn Upsert>),
    Delete(Box<dyn Delete>),
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
    Ignored(String),
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
                .map(|upsert| IntegrationOperation::Upsert(Box::new(upsert)))
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
                .map(|upsert| IntegrationOperation::Delete(Box::new(upsert)))
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

pub(crate) enum PushTranslationType {
    // When omSupply remote is pushing to og mSupply central
    Legacy,
    // When omSupply remote is pushing to omSupply central
    #[allow(dead_code)]
    OmSupplyRemoteSitePush,
    // When omSupply ceantral is pushing to omSupply remote
    // this is when omSupply central is responding to pull request from omSupply remote
    OmSupplyCentralSitePush,
}

pub(crate) trait SyncTranslation {
    /// Returns information about which legacy tables need to be integrated first before this
    /// translation can run.
    fn pull_dependencies(&self) -> Vec<&'static str>;
    fn table_name(&self) -> &'static str;
    // By default matching by table name
    fn match_pull(&self, row: &SyncBufferRow) -> bool {
        self.table_name() == row.table_name
    }

    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::NotMatched)
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::NotMatched)
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        None
    }

    // By default matching by change log type
    fn match_push(&self, row: &ChangelogRow, r#type: &PushTranslationType) -> bool {
        match r#type {
            PushTranslationType::Legacy => self.change_log_type().as_ref() == Some(&row.table_name),
            // Have to manually specify
            PushTranslationType::OmSupplyRemoteSitePush => unimplemented!(),
            // Have to manually specify for the translation
            PushTranslationType::OmSupplyCentralSitePush => false,
        }
    }

    fn try_translate_push_upsert(
        &self,
        _: &StorageConnection,
        _: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::NotMatched)
    }

    fn try_translate_push_delete(
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

pub(crate) fn translate_changelogs_to_push_records(
    connection: &StorageConnection,
    changelogs: Vec<ChangelogRow>,
    r#type: PushTranslationType,
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
    r#type: &PushTranslationType,
) -> Result<Vec<PushSyncRecord>, anyhow::Error> {
    let mut translation_results = Vec::new();

    for translator in translators.iter() {
        if !translator.match_push(&changelog, r#type) {
            continue;
        }

        let translation_result = match changelog.row_action {
            ChangelogAction::Upsert => {
                translator.try_translate_push_upsert(connection, &changelog)?
            }
            ChangelogAction::Delete => {
                translator.try_translate_push_delete(connection, &changelog)?
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
        .get_i32(repository::KeyValueType::SettingsSyncSiteId)
        .map_err(Error::DatabaseError)?
        .ok_or(Error::SiteIdNotSet)?;

    let result = match &record {
        ActiveRecordCheck::InvoiceLine { invoice_id } => {
            let invoice = InvoiceRepository::new(connection)
                .query_one(InvoiceFilter::new().id(EqualFilter::equal_to(&invoice_id)))
                .map_err(Error::DatabaseError)?
                .ok_or_else(|| Error::ParentRecordNotFound(record))?;
            invoice.store_row.site_id == site_id
        }
    };

    Ok(result)
}
