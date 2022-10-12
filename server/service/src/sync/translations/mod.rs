pub(crate) mod activity_log;
pub(crate) mod invoice;
pub(crate) mod invoice_line;
pub(crate) mod item;
pub(crate) mod location;
pub(crate) mod master_list;
pub(crate) mod master_list_line;
pub(crate) mod master_list_name_join;
pub(crate) mod name;
pub(crate) mod name_store_join;
pub(crate) mod number;
pub(crate) mod report;
pub(crate) mod requisition;
pub(crate) mod requisition_line;
pub(crate) mod special;
pub(crate) mod stock_line;
pub(crate) mod stocktake;
pub(crate) mod stocktake_line;
pub(crate) mod store;
pub(crate) mod unit;

use repository::*;
use thiserror::Error;

use super::api::{CommonSyncRecordV5, RemoteSyncRecordV5, SyncActionV5};

pub(crate) type SyncTanslators = Vec<Box<dyn SyncTranslation>>;

pub(crate) fn all_translators() -> SyncTanslators {
    vec![
        // Central
        Box::new(name::NameTranslation {}),
        Box::new(unit::UnitTranslation {}),
        Box::new(item::ItemTranslation {}),
        Box::new(store::StoreTranslation {}),
        Box::new(master_list::MasterListTranslation {}),
        Box::new(master_list_line::MasterListLineTranslation {}),
        Box::new(master_list_name_join::MasterListNameJoinTranslation {}),
        Box::new(report::ReportTranslation {}),
        // Remote
        Box::new(number::NumberTranslation {}),
        Box::new(location::LocationTranslation {}),
        Box::new(stock_line::StockLineTranslation {}),
        Box::new(invoice::InvoiceTranslation {}),
        Box::new(invoice_line::InvoiceLineTranslation {}),
        Box::new(stocktake::StocktakeTranslation {}),
        Box::new(stocktake_line::StocktakeLineTranslation {}),
        Box::new(requisition::RequisitionTranslation {}),
        Box::new(requisition_line::RequisitionLineTranslation {}),
        Box::new(activity_log::ActivityLogTranslation {}),
        // Remote-Central (site specific)
        Box::new(name_store_join::NameStoreJoinTranslation {}),
        // Special translations
        Box::new(special::NameToNameStoreJoinTranslation {}),
    ]
}

#[allow(non_snake_case)]
pub(crate) mod LegacyTableName {
    // Central
    pub(crate) const NAME: &str = "name";
    pub(crate) const UNIT: &str = "unit";
    pub(crate) const ITEM: &str = "item";
    pub(crate) const STORE: &str = "store";
    pub(crate) const LIST_MASTER: &str = "list_master";
    pub(crate) const LIST_MASTER_LINE: &str = "list_master_line";
    pub(crate) const LIST_MASTER_NAME_JOIN: &str = "list_master_name_join";
    pub(crate) const REPORT: &str = "report";
    // Remote
    pub(crate) const NUMBER: &str = "number";
    pub(crate) const LOCATION: &str = "Location";
    pub(crate) const ITEM_LINE: &str = "item_line";
    pub(crate) const TRANSACT: &str = "transact";
    pub(crate) const TRANS_LINE: &str = "trans_line";
    pub(crate) const STOCKTAKE: &str = "Stock_take";
    pub(crate) const STOCKTAKE_LINE: &str = "Stock_take_lines";
    pub(crate) const REQUISITION: &str = "requisition";
    pub(crate) const REQUISITION_LINE: &str = "requisition_line";
    pub(crate) const OM_ACTIVITY_LOG: &str = "om_activity_log";
    // Remote-Central (site specific)
    pub(crate) const NAME_STORE_JOIN: &str = "name_store_join";
}

#[derive(Debug, PartialEq, Clone)]
pub(crate) enum PullUpsertRecord {
    Unit(UnitRow),
    Name(NameRow),
    Item(ItemRow),
    Store(StoreRow),
    MasterList(MasterListRow),
    MasterListLine(MasterListLineRow),
    MasterListNameJoin(MasterListNameJoinRow),
    Report(ReportRow),
    Number(NumberRow),
    Location(LocationRow),
    StockLine(StockLineRow),
    NameStoreJoin(NameStoreJoinRow),
    Invoice(InvoiceRow),
    InvoiceLine(InvoiceLineRow),
    Stocktake(StocktakeRow),
    StocktakeLine(StocktakeLineRow),
    Requisition(RequisitionRow),
    RequisitionLine(RequisitionLineRow),
    ActivityLog(ActivityLogRow),
}

#[derive(Debug, PartialEq, Clone)]
pub(crate) struct PullDeleteRecord {
    pub(crate) id: String,
    pub(crate) table: PullDeleteRecordTable,
}

#[derive(Debug, PartialEq, Clone)]
pub(crate) enum PullDeleteRecordTable {
    // Central
    Unit,
    Item,
    Store,
    MasterList,
    MasterListLine,
    MasterListNameJoin,
    Report,
    Name,
    // Remote-Central (site specific)
    NameStoreJoin,
    // Remote (for other party of transfers)
    Invoice,
    InvoiceLine,
    Requisition,
    RequisitionLine,
    #[cfg(all(test, feature = "integration_test"))]
    Location,
    #[cfg(all(test, feature = "integration_test"))]
    StockLine,
    #[cfg(all(test, feature = "integration_test"))]
    Stocktake,
    #[cfg(all(test, feature = "integration_test"))]
    StocktakeLine,
    #[cfg(all(test, feature = "integration_test"))]
    ActivityLog,
}

#[derive(Debug, PartialEq, Clone)]
pub(crate) struct IntegrationRecords {
    pub(crate) upserts: Vec<PullUpsertRecord>,
    pub(crate) deletes: Vec<PullDeleteRecord>,
}

impl IntegrationRecords {
    pub(crate) fn new() -> IntegrationRecords {
        IntegrationRecords {
            upserts: Vec::new(),
            deletes: Vec::new(),
        }
    }
    pub(crate) fn from_upsert(r: PullUpsertRecord) -> IntegrationRecords {
        IntegrationRecords {
            upserts: vec![r],
            deletes: Vec::new(),
        }
    }
    pub(crate) fn from_upserts(rows: Vec<PullUpsertRecord>) -> IntegrationRecords {
        IntegrationRecords {
            upserts: rows,
            deletes: Vec::new(),
        }
    }

    pub(crate) fn from_delete(id: &str, table: PullDeleteRecordTable) -> IntegrationRecords {
        IntegrationRecords {
            upserts: Vec::new(),
            deletes: vec![PullDeleteRecord {
                id: id.to_owned(),
                table,
            }],
        }
    }

    pub(crate) fn join(self, other: IntegrationRecords) -> IntegrationRecords {
        IntegrationRecords {
            upserts: vec![self.upserts, other.upserts].concat(),
            deletes: vec![self.deletes, other.deletes].concat(),
        }
    }

    pub(crate) fn is_empty(&self) -> bool {
        self.upserts.is_empty() && self.deletes.is_empty()
    }
}

pub(crate) trait SyncTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        Ok(None)
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        Ok(None)
    }

    /// Implementation should return three types of results
    /// * Error - Something completely unexpected that is not recoverable
    /// * None - Translator did not match record type
    /// * Some - Translator did match and either translated record/records or
    ///          empty array if record is deliberatly ignored
    fn try_translate_push_upsert(
        &self,
        _: &StorageConnection,
        _: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        Ok(None)
    }

    fn try_translate_push_delete(
        &self,
        _: &StorageConnection,
        _: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        Ok(None)
    }
}

impl RemoteSyncRecordV5 {
    pub(crate) fn new_upsert(
        changelog: &ChangelogRow,
        table_name: &'static str,
        data: serde_json::Value,
    ) -> Self {
        Self {
            sync_id: changelog.cursor.to_string(),
            record: CommonSyncRecordV5 {
                table_name: table_name.to_string(),
                record_id: changelog.record_id.clone(),
                action: SyncActionV5::Update,
                data,
            },
        }
    }
    pub(crate) fn new_delete(changelog: &ChangelogRow, table_name: &'static str) -> Self {
        Self {
            sync_id: changelog.cursor.to_string(),
            record: CommonSyncRecordV5 {
                table_name: table_name.to_string(),
                record_id: changelog.record_id.clone(),
                action: SyncActionV5::Delete,
                data: Default::default(),
            },
        }
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
) -> Result<Vec<RemoteSyncRecordV5>, PushTranslationError> {
    let translators = all_translators();
    let mut out_records = Vec::new();
    for changelog in changelogs {
        let mut translation_results = translate_changelog(connection, &translators, &changelog)
            .map_err(|source| PushTranslationError { source, changelog })?;
        out_records.append(&mut translation_results);
    }

    Ok(out_records)
}

fn translate_changelog(
    connection: &StorageConnection,
    translators: &SyncTanslators,
    changelog: &ChangelogRow,
) -> Result<Vec<RemoteSyncRecordV5>, anyhow::Error> {
    let mut translation_results = Vec::new();
    let mut skip = false;

    for translator in translators.iter() {
        let translation_result = match changelog.row_action {
            ChangelogAction::Upsert => {
                translator.try_translate_push_upsert(connection, &changelog)?
            }
            ChangelogAction::Delete => {
                translator.try_translate_push_delete(connection, &changelog)?
            }
        };

        if let Some(mut translation_result) = translation_result {
            translation_results.append(&mut translation_result);
            skip = true;
        }
    }

    if !skip {
        return Err(anyhow::anyhow!("Translator for record not found"));
    }

    Ok(translation_results)
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
