use crate::database;

use std::sync::Arc;
use std::sync::Mutex;

#[derive(Clone)]
pub struct RepositoryRegistry {
    // TODO: implement with hash maps to dynamic trait objects.
    // pub repositories: HashMap<String, Arc<dyn database::repository::Repository>>
    pub customer_invoice_repository:
        Option<Arc<dyn database::repository::CustomerInvoiceRepository>>,
    pub item_repository: Option<Arc<dyn database::repository::ItemRepository>>,
    pub item_line_repository: Option<Arc<dyn database::repository::ItemLineRepository>>,
    pub name_repository: Option<Arc<dyn database::repository::NameRepository>>,
    pub requisition_repository: Option<Arc<dyn database::repository::RequisitionRepository>>,
    pub requisition_line_repository:
        Option<Arc<dyn database::repository::RequisitionLineRepository>>,
    pub store_repository: Option<Arc<dyn database::repository::StoreRepository>>,
    pub transact_repository: Option<Arc<dyn database::repository::TransactRepository>>,
    pub transact_line_repository: Option<Arc<dyn database::repository::TransactLineRepository>>,
    pub user_account_repository: Option<Arc<dyn database::repository::UserAccountRepository>>,
    pub sync_sender: Arc<Mutex<tokio::sync::mpsc::Sender<()>>>,
}
