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
pub(crate) mod stock_line;
pub(crate) mod stocktake;
pub(crate) mod stocktake_line;
pub(crate) mod store;
pub(crate) mod unit;

use log::{info, warn};
use repository::*;

use super::SyncTranslationError;

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
        // Remote-Central (site specific)
        Box::new(name_store_join::NameStoreJoinTranslation {}),
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
}

#[derive(Debug, PartialEq, Clone)]
pub(crate) struct IntegrationRecords {
    pub(crate) upserts: Vec<PullUpsertRecord>,
}

impl IntegrationRecords {
    pub(crate) fn from_upsert(r: PullUpsertRecord) -> IntegrationRecords {
        IntegrationRecords { upserts: vec![r] }
    }
}

pub(crate) trait SyncTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        Ok(None)
    }

    fn try_translate_push(
        &self,
        _: &StorageConnection,
        _: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, anyhow::Error> {
        Ok(None)
    }
}

#[derive(Debug)]
pub(crate) struct PushUpsertRecord {
    pub(crate) sync_id: i64,
    pub(crate) store_id: Option<String>,
    /// The translated table name
    pub(crate) table_name: &'static str,
    pub(crate) record_id: String,
    pub(crate) data: serde_json::Value,
}

pub(crate) struct PushDeleteRecord {
    pub(crate) sync_id: i64,
    /// The translated table name
    pub(crate) table_name: &'static str,
    pub(crate) record_id: String,
}

pub(crate) enum PushRecord {
    Upsert(PushUpsertRecord),
    Delete(PushDeleteRecord),
}

pub(crate) fn table_name_to_central(table: &ChangelogTableName) -> &'static str {
    match table {
        ChangelogTableName::Number => LegacyTableName::NUMBER,
        ChangelogTableName::Location => LegacyTableName::LOCATION,
        ChangelogTableName::StockLine => LegacyTableName::ITEM_LINE,
        ChangelogTableName::Name => LegacyTableName::NAME,
        ChangelogTableName::NameStoreJoin => LegacyTableName::NAME_STORE_JOIN,
        ChangelogTableName::Invoice => LegacyTableName::TRANSACT,
        ChangelogTableName::InvoiceLine => LegacyTableName::TRANS_LINE,
        ChangelogTableName::Stocktake => LegacyTableName::STOCKTAKE,
        ChangelogTableName::StocktakeLine => LegacyTableName::STOCKTAKE_LINE,
        ChangelogTableName::Requisition => LegacyTableName::REQUISITION,
        ChangelogTableName::RequisitionLine => LegacyTableName::REQUISITION_LINE,
    }
}

pub(crate) fn translate_changelog(
    connection: &StorageConnection,
    changelog: &ChangelogRow,
    results: &mut Vec<PushRecord>,
) -> Result<(), SyncTranslationError> {
    match changelog.row_action {
        ChangelogAction::Upsert => {
            let translations = all_translators();

            for translation in translations {
                if let Some(records) = translation
                    .try_translate_push(connection, changelog)
                    .map_err(|err| SyncTranslationError {
                        table_name: table_name_to_central(&changelog.table_name).to_string(),
                        source: err,
                        record: format!("{:?}", changelog),
                    })?
                {
                    info!("Push record upserts: {:?}", records);
                    for record in records {
                        results.push(PushRecord::Upsert(record));
                    }
                    return Ok(());
                }
            }
        }
        ChangelogAction::Delete => {
            info!(
                "Push record deletion: table: \"{:?}\", record id: {}",
                changelog.table_name, changelog.row_id
            );
            results.push(PushRecord::Delete(PushDeleteRecord {
                sync_id: changelog.id,
                table_name: table_name_to_central(&changelog.table_name),
                record_id: changelog.row_id.clone(),
            }));
            return Ok(());
        }
    };

    warn!("Unhandled push changlog: {:?}", changelog);
    Ok(())
}
