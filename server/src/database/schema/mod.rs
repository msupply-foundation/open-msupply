mod central_sync_buffer;
mod item;
mod item_line;
mod name;
mod requisition;
mod requisition_line;
mod store;
mod sync_out;
mod transact;
mod transact_line;
mod user_account;

pub mod diesel_schema;

#[derive(Clone)]
pub enum DatabaseRow {
    Item(ItemRow),
    ItemLine(ItemLineRow),
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
pub use item::{ItemRow, ItemRowType};
pub use item_line::ItemLineRow;
pub use name::NameRow;
pub use requisition::{RequisitionRow, RequisitionRowType};
pub use requisition_line::RequisitionLineRow;
pub use store::StoreRow;
pub use sync_out::{SyncOutRow, SyncOutRowActionType, SyncOutRowTableNameType};
pub use transact::{TransactRow, TransactRowType};
pub use transact_line::{TransactLineRow, TransactLineRowType};
pub use user_account::UserAccountRow;
