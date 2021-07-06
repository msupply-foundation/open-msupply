use crate::database::repository::Repository;

mod item;
mod item_line;
mod name;
mod requisition;
mod requisition_line;
mod store;
mod transact;
mod transact_line;
mod user_account;

pub use item::ItemMockRepository;
pub use item_line::ItemLineMockRepository;
pub use name::NameMockRepository;
pub use requisition::RequisitionMockRepository;
pub use requisition_line::RequisitionLineMockRepository;
pub use store::StoreMockRepository;
pub use transact::{CustomerInvoiceMockRepository, TransactMockRepository};
pub use transact_line::TransactLineMockRepository;
pub use user_account::UserAccountMockRepository;

pub trait MockRepository: Repository {}
