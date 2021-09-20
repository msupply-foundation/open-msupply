mod central_sync_buffer;
mod central_sync_cursor;
mod item;
mod stock_line;
mod master_list;
mod master_list_line;
mod master_list_name_join;
mod name;
mod requisition;
mod requisition_line;
mod store;
mod sync_out;
mod transact;
mod transact_line;
mod user_account;
mod name_store_join;

pub mod diesel_schema;

#[derive(Clone)]
pub enum DatabaseRow {
    Item(ItemRow),
    StockLine(StockLineRow),
    Name(NameRow),
    Requisition(RequisitionRow),
    RequisitionLine(RequisitionLineRow),
    Store(StoreRow),
    Transact(TransactRow),
    TransactLine(TransactLineRow),
    UserAccount(UserAccountRow),
    SyncOut(SyncOutRow),
}

pub use central_sync_buffer::CentralSyncBufferRow;
pub use central_sync_cursor::CentralSyncCursorRow;
pub use item::ItemRow;
pub use stock_line::StockLineRow;
pub use master_list::MasterListRow;
pub use master_list_line::MasterListLineRow;
pub use master_list_name_join::MasterListNameJoinRow;
pub use name::NameRow;
pub use requisition::{RequisitionRow, RequisitionRowType};
pub use requisition_line::RequisitionLineRow;
pub use store::StoreRow;
pub use sync_out::{SyncOutRow, SyncOutRowActionType, SyncOutRowTableNameType};
pub use transact::{TransactRow, TransactRowType};
pub use transact_line::{TransactLineRow, TransactLineRowType};
pub use user_account::UserAccountRow;
pub use name_store_join::NameStoreJoinRow;
