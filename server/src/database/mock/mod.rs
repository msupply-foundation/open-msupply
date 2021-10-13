mod invoice;
mod invoice_line;
mod item;
mod name;
mod name_store_join;
mod requisition;
mod requisition_line;
mod stock_line;
mod store;
mod user_account;

pub use invoice::{mock_customer_invoices, mock_invoices};
pub use invoice_line::mock_invoice_lines;
pub use item::mock_items;
pub use name::mock_names;
pub use name_store_join::mock_name_store_joins;
pub use requisition::mock_requisitions;
pub use requisition_line::mock_requisition_lines;
pub use stock_line::mock_stock_lines;
pub use store::mock_stores;
pub use user_account::mock_user_accounts;

use super::{
    repository::{
        ItemRepository, NameRepository, NameStoreJoinRepository, StorageConnection, StoreRepository,
    },
    schema::*,
};

pub struct MockData {
    pub names: Vec<NameRow>,
    pub stores: Vec<StoreRow>,
    pub items: Vec<ItemRow>,
    pub name_store_joins: Vec<NameStoreJoinRow>,
}
pub struct MockDataInserts {
    pub names: bool,
    pub stores: bool,
    pub items: bool,
    pub name_store_joins: bool,
}

impl MockDataInserts {
    pub fn all() -> Self {
        MockDataInserts {
            names: true,
            stores: true,
            items: true,
            name_store_joins: true,
        }
    }

    pub fn none() -> Self {
        MockDataInserts {
            names: false,
            stores: false,
            items: false,
            name_store_joins: false,
        }
    }

    pub fn names(mut self) -> Self {
        self.names = true;
        self
    }

    pub fn stores(mut self) -> Self {
        self.stores = true;
        self
    }

    pub fn items(mut self) -> Self {
        self.items = true;
        self
    }

    pub fn name_store_joins(mut self) -> Self {
        self.name_store_joins = true;
        self
    }
}

pub async fn insert_mock_data(
    connection: &StorageConnection,
    inserts: MockDataInserts,
) -> MockData {
    let result = MockData {
        names: mock_names(),
        stores: mock_stores(),
        items: mock_items(),
        name_store_joins: mock_name_store_joins(),
    };

    if inserts.names {
        let repo = NameRepository::new(connection);
        for row in &result.names {
            repo.insert_one(&row).await.unwrap();
        }
    }

    if inserts.stores {
        let repo = StoreRepository::new(connection);
        for row in &result.stores {
            repo.insert_one(&row).await.unwrap();
        }
    }

    if inserts.items {
        let repo = ItemRepository::new(connection);
        for row in &result.items {
            repo.insert_one(&row).await.unwrap();
        }
    }

    if inserts.name_store_joins {
        let repo = NameStoreJoinRepository::new(connection);
        for row in &result.name_store_joins {
            repo.upsert_one(&row).unwrap();
        }
    }

    result
}
