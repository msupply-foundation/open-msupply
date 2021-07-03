use crate::database;

// TODO: implement with hash maps to dynamic trait objects.
#[derive(Clone)]
pub struct Registry {
    pub customer_invoice_repository: database::repository::CustomerInvoiceRepository,
    pub item_repository: database::repository::ItemRepository,
    pub item_line_repository: database::repository::ItemLineRepository,
    pub name_repository: database::repository::NameRepository,
    pub requisition_repository: database::repository::RequisitionRepository,
    pub requisition_line_repository: database::repository::RequisitionLineRepository,
    pub store_repository: database::repository::StoreRepository,
    pub transact_repository: database::repository::TransactRepository,
    pub transact_line_repository: database::repository::TransactLineRepository,
    pub user_account_repository: database::repository::UserAccountRepository,
}
