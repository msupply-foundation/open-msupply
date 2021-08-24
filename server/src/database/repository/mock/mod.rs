use {
    crate::{
        database::{
            mock,
            schema::{
                DatabaseRow, ItemLineRow, ItemRow, NameRow, RequisitionLineRow, RequisitionRow,
                StoreRow, TransactLineRow, TransactRow, UserAccountRow,
            },
        },
        server::data::RepositoryMap,
        util::settings::Settings,
    },
    std::{
        collections::HashMap,
        sync::{Arc, Mutex},
    },
};

mod item;
mod item_line;
mod name;
mod requisition;
mod requisition_line;
mod store;
mod transact;
mod transact_line;
mod user_account;

pub use item::ItemRepository;
pub use item_line::ItemLineRepository;
pub use name::NameRepository;
pub use requisition::RequisitionRepository;
pub use requisition_line::RequisitionLineRepository;
pub use store::StoreRepository;
pub use transact::{CustomerInvoiceRepository, TransactRepository};
pub use transact_line::TransactLineRepository;
pub use user_account::UserAccountRepository;

pub async fn get_repositories(_: &Settings) -> RepositoryMap {
    let mut mock_data: HashMap<String, DatabaseRow> = HashMap::new();

    let mock_names: Vec<NameRow> = mock::mock_names();
    let mock_items: Vec<ItemRow> = mock::mock_items();
    let mock_item_lines: Vec<ItemLineRow> = mock::mock_item_lines();
    let mock_requisitions: Vec<RequisitionRow> = mock::mock_requisitions();
    let mock_requisition_lines: Vec<RequisitionLineRow> = mock::mock_requisition_lines();
    let mock_stores: Vec<StoreRow> = mock::mock_stores();
    let mock_transacts: Vec<TransactRow> = mock::mock_transacts();
    let mock_transact_lines: Vec<TransactLineRow> = mock::mock_transact_lines();
    let mock_user_accounts: Vec<UserAccountRow> = mock::mock_user_accounts();

    for name in mock_names {
        mock_data.insert(name.id.to_string(), DatabaseRow::Name(name.clone()));
    }

    for item in mock_items {
        mock_data.insert(item.id.to_string(), DatabaseRow::Item(item.clone()));
    }

    for item_line in mock_item_lines {
        mock_data.insert(
            item_line.id.to_string(),
            DatabaseRow::ItemLine(item_line.clone()),
        );
    }

    for requisition in mock_requisitions {
        mock_data.insert(
            requisition.id.to_string(),
            DatabaseRow::Requisition(requisition.clone()),
        );
    }

    for requisition_line in mock_requisition_lines {
        mock_data.insert(
            requisition_line.id.to_string(),
            DatabaseRow::RequisitionLine(requisition_line.clone()),
        );
    }

    for store in mock_stores {
        mock_data.insert(store.id.to_string(), DatabaseRow::Store(store.clone()));
    }

    for transact in mock_transacts {
        mock_data.insert(
            transact.id.to_string(),
            DatabaseRow::Transact(transact.clone()),
        );
    }

    for transact_line in mock_transact_lines {
        mock_data.insert(
            transact_line.id.to_string(),
            DatabaseRow::TransactLine(transact_line.clone()),
        );
    }

    for user_account in mock_user_accounts {
        mock_data.insert(
            user_account.id.to_string(),
            DatabaseRow::UserAccount(user_account.clone()),
        );
    }

    let mut repositories: RepositoryMap = RepositoryMap::new();
    let mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>> = Arc::new(Mutex::new(mock_data));

    repositories.insert(CustomerInvoiceRepository::new(Arc::clone(&mock_data)));
    repositories.insert(ItemRepository::new(Arc::clone(&mock_data)));
    repositories.insert(ItemLineRepository::new(Arc::clone(&mock_data)));
    repositories.insert(NameRepository::new(Arc::clone(&mock_data)));
    repositories.insert(RequisitionRepository::new(Arc::clone(&mock_data)));
    repositories.insert(RequisitionLineRepository::new(Arc::clone(&mock_data)));
    repositories.insert(StoreRepository::new(Arc::clone(&mock_data)));
    repositories.insert(TransactRepository::new(Arc::clone(&mock_data)));
    repositories.insert(TransactLineRepository::new(Arc::clone(&mock_data)));
    repositories.insert(UserAccountRepository::new(Arc::clone(&mock_data)));

    repositories
}
