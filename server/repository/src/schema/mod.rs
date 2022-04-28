mod central_sync_buffer;
mod changelog;
mod master_list;
mod master_list_line;
mod master_list_name_join;
pub mod pricing;
mod remote_sync_buffer;
pub mod report;
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

pub use central_sync_buffer::CentralSyncBufferRow;
pub use changelog::*;
pub use master_list::*;
pub use master_list_line::*;
pub use master_list_name_join::MasterListNameJoinRow;
pub use pricing::PricingRow;
pub use remote_sync_buffer::*;
pub use sync_out::{SyncOutRow, SyncOutRowActionType, SyncOutRowTableNameType};
