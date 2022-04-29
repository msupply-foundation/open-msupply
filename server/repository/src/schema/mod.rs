pub mod pricing;
mod sync_out;

pub mod diesel_schema;

use crate::db_diesel::{
    InvoiceLineRow, InvoiceRow, ItemRow, NameRow, RequisitionLineRow, RequisitionRow, StockLineRow,
    StoreRow, UnitRow, UserAccountRow,
};

#[derive(Clone)]
pub enum DatabaseRow {
    Unit(UnitRow),
    Item(ItemRow),
    StockLine(StockLineRow),
    Name(NameRow),
    Requisition(RequisitionRow),
    RequisitionLine(RequisitionLineRow),
    Store(StoreRow),
    Invoice(InvoiceRow),
    InvoiceLine(InvoiceLineRow),
    UserAccount(UserAccountRow),
    SyncOut(SyncOutRow),
}

pub use pricing::PricingRow;
pub use sync_out::{SyncOutRow, SyncOutRowActionType, SyncOutRowTableNameType};
