use repository::ChangelogTableName;

mod invoice;
mod invoice_line;
mod location;
mod name;
mod name_store_join;
mod requisition;
mod requisition_line;
mod stock_line;
mod stocktake;
mod stocktake_line;

pub mod pull;
pub mod push;

#[cfg(test)]
pub mod test_data;

pub const TRANSLATION_RECORD_LOCATION: &'static str = "Location";
/// stock line
pub const TRANSLATION_RECORD_ITEM_LINE: &'static str = "item_line";
pub const TRANSLATION_RECORD_NAME: &'static str = "name";
pub const TRANSLATION_RECORD_NAME_STORE_JOIN: &'static str = "name_store_join";
pub const TRANSLATION_RECORD_TRANSACT: &'static str = "transact";
pub const TRANSLATION_RECORD_TRANS_LINE: &'static str = "trans_line";
pub const TRANSLATION_RECORD_STOCKTAKE: &'static str = "Stock_take";
pub const TRANSLATION_RECORD_STOCKTAKE_LINE: &'static str = "Stock_take_lines";
pub const TRANSLATION_RECORD_REQUISITION: &'static str = "requisition";
pub const TRANSLATION_RECORD_REQUISITION_LINE: &'static str = "requisition_line";

/// Returns a list of records that can be translated. The list is topologically sorted, i.e. items
/// at the beginning of the list don't rely on later items to be translated first.
pub const REMOTE_TRANSLATION_RECORDS: &[&str] = &[
    TRANSLATION_RECORD_LOCATION,
    TRANSLATION_RECORD_ITEM_LINE,
    TRANSLATION_RECORD_NAME,
    TRANSLATION_RECORD_NAME_STORE_JOIN,
    TRANSLATION_RECORD_TRANSACT,
    TRANSLATION_RECORD_TRANS_LINE,
    TRANSLATION_RECORD_STOCKTAKE,
    TRANSLATION_RECORD_STOCKTAKE_LINE,
    TRANSLATION_RECORD_REQUISITION,
    TRANSLATION_RECORD_REQUISITION_LINE,
];

pub fn table_name_to_central(table: &ChangelogTableName) -> &'static str {
    match table {
        ChangelogTableName::Location => TRANSLATION_RECORD_LOCATION,
        ChangelogTableName::StockLine => TRANSLATION_RECORD_ITEM_LINE,
        ChangelogTableName::Name => TRANSLATION_RECORD_NAME,
        ChangelogTableName::NameStoreJoin => TRANSLATION_RECORD_NAME_STORE_JOIN,
        ChangelogTableName::Invoice => TRANSLATION_RECORD_TRANSACT,
        ChangelogTableName::InvoiceLine => TRANSLATION_RECORD_TRANS_LINE,
        ChangelogTableName::Stocktake => TRANSLATION_RECORD_STOCKTAKE,
        ChangelogTableName::StocktakeLine => TRANSLATION_RECORD_STOCKTAKE_LINE,
        ChangelogTableName::Requisition => TRANSLATION_RECORD_REQUISITION,
        ChangelogTableName::RequisitionLine => TRANSLATION_RECORD_REQUISITION_LINE,
    }
}
