use std::{collections::HashMap, ops::Index};

pub mod common;
mod full_invoice;
mod full_master_list;
mod invoice;
mod invoice_line;
mod item;
mod location;
mod log;
mod name;
mod name_store_join;
mod stock_line;
mod stocktake;
mod stocktake_line;
mod store;
mod test_invoice_count_service;
mod test_invoice_loaders;
pub mod test_item_stats;
mod test_master_list_repository;
mod test_name_query;
mod test_name_store_id;
mod test_outbound_shipment_update;
pub mod test_remaining_to_supply;
mod test_remote_pull;
mod test_requisition_line_repository;
mod test_requisition_queries;
mod test_requisition_repository;
mod test_requisition_service;
mod test_service_lines;
mod test_stocktake;
mod test_stocktake_line;
mod test_sync_processor;
mod test_unallocated_line;
mod unit;
mod user_account;

use common::*;
pub use full_invoice::*;
pub use full_master_list::*;
pub use invoice::*;
pub use invoice_line::*;
pub use item::*;
pub use location::*;
pub use name::*;
pub use name_store_join::*;
pub use stock_line::*;
pub use stocktake::*;
pub use stocktake_line::*;
pub use store::*;
pub use test_invoice_count_service::*;
pub use test_invoice_loaders::*;
pub use test_master_list_repository::*;
pub use test_name_query::*;
pub use test_name_store_id::*;
pub use test_outbound_shipment_update::*;
pub use test_remote_pull::*;
pub use test_requisition_line_repository::*;
pub use test_requisition_queries::*;
pub use test_requisition_repository::*;
pub use test_requisition_service::*;
pub use test_service_lines::*;
pub use test_stocktake::*;
pub use test_stocktake_line::*;
pub use test_sync_processor::*;
pub use test_unallocated_line::*;
pub use user_account::*;

use crate::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, ItemRow, LocationRow,
    LocationRowRepository, LogRow, LogRowRepository, RequisitionLineRow,
    RequisitionLineRowRepository, RequisitionRow, RequisitionRowRepository, StockLineRowRepository,
    StocktakeLineRowRepository, StocktakeRowRepository, UserAccountRow, UserAccountRowRepository,
    UserPermissionRow, UserPermissionRowRepository, UserStoreJoinRow, UserStoreJoinRowRepository,
};

use self::{log::mock_logs, unit::mock_units};

use super::{
    InvoiceRowRepository, ItemRowRepository, NameRow, NameRowRepository, NameStoreJoinRepository,
    NameStoreJoinRow, StockLineRow, StocktakeLineRow, StocktakeRow, StorageConnection, StoreRow,
    StoreRowRepository, UnitRow, UnitRowRepository,
};

#[derive(Default, Clone)]
pub struct MockData {
    pub user_accounts: Vec<UserAccountRow>,
    pub user_store_joins: Vec<UserStoreJoinRow>,
    pub user_permissions: Vec<UserPermissionRow>,
    pub names: Vec<NameRow>,
    pub stores: Vec<StoreRow>,
    pub units: Vec<UnitRow>,
    pub items: Vec<ItemRow>,
    pub locations: Vec<LocationRow>,
    pub name_store_joins: Vec<NameStoreJoinRow>,
    pub full_requisitions: Vec<FullMockRequisition>,
    pub invoices: Vec<InvoiceRow>,
    pub stock_lines: Vec<StockLineRow>,
    pub invoice_lines: Vec<InvoiceLineRow>,
    pub full_invoices: HashMap<String, FullMockInvoice>,
    pub full_master_lists: Vec<FullMockMasterList>,
    pub requisitions: Vec<RequisitionRow>,
    pub requisition_lines: Vec<RequisitionLineRow>,
    pub stocktakes: Vec<StocktakeRow>,
    pub stocktake_lines: Vec<StocktakeLineRow>,
    pub logs: Vec<LogRow>,
}

#[derive(Default)]
pub struct MockDataInserts {
    pub user_accounts: bool,
    pub user_store_joins: bool,
    pub user_permissions: bool,
    pub names: bool,
    pub stores: bool,
    pub units: bool,
    pub items: bool,
    pub locations: bool,
    pub name_store_joins: bool,
    pub full_requisitions: bool,
    pub invoices: bool,
    pub stock_lines: bool,
    pub invoice_lines: bool,
    pub full_invoices: bool,
    pub full_master_lists: bool,
    pub requisitions: bool,
    pub requisition_lines: bool,
    pub stocktakes: bool,
    pub stocktake_lines: bool,
    pub logs: bool,
}

impl MockDataInserts {
    pub fn all() -> Self {
        MockDataInserts {
            user_accounts: true,
            user_store_joins: true,
            user_permissions: true,
            names: true,
            stores: true,
            units: true,
            items: true,
            locations: true,
            name_store_joins: true,
            full_requisitions: true,
            invoices: true,
            stock_lines: true,
            invoice_lines: true,
            full_invoices: true,
            full_master_lists: true,
            requisitions: true,
            requisition_lines: true,
            stocktakes: true,
            stocktake_lines: true,
            logs: true,
        }
    }

    pub fn none() -> Self {
        MockDataInserts::default()
    }

    pub fn user_accounts(mut self) -> Self {
        self.user_accounts = true;
        self
    }

    pub fn user_store_joins(mut self) -> Self {
        self.user_store_joins = true;
        self
    }

    pub fn user_permissions(mut self) -> Self {
        self.user_permissions = true;
        self
    }

    pub fn names(mut self) -> Self {
        self.names = true;
        self
    }

    pub fn stores(mut self) -> Self {
        self.stores = true;
        self
    }

    pub fn units(mut self) -> Self {
        self.units = true;
        self
    }

    pub fn items(mut self) -> Self {
        self.items = true;
        self
    }

    pub fn locations(mut self) -> Self {
        self.locations = true;
        self
    }

    pub fn name_store_joins(mut self) -> Self {
        self.name_store_joins = true;
        self
    }

    pub fn invoices(mut self) -> Self {
        self.invoices = true;
        self
    }

    pub fn stock_lines(mut self) -> Self {
        self.stock_lines = true;
        self
    }

    pub fn invoice_lines(mut self) -> Self {
        self.invoice_lines = true;
        self
    }

    pub fn full_invoices(mut self) -> Self {
        self.full_invoices = true;
        self
    }

    pub fn full_master_list(mut self) -> Self {
        self.full_master_lists = true;
        self
    }

    pub fn stocktakes(mut self) -> Self {
        self.stocktakes = true;
        self
    }

    pub fn stocktake_lines(mut self) -> Self {
        self.stocktake_lines = true;
        self
    }

    pub fn logs(mut self) -> Self {
        self.logs = true;
        self
    }
}

#[derive(Default)]
pub struct MockDataCollection {
    // Note: can't use a HashMap since mock data should be inserted in order
    pub data: Vec<(String, MockData)>,
}

impl MockDataCollection {
    pub fn insert(&mut self, name: &str, data: MockData) {
        self.data.push((name.to_string(), data));
    }

    pub fn get_mut(&mut self, name: &str) -> &mut MockData {
        for (n, data) in &mut self.data {
            if n != name {
                continue;
            }
            return data;
        }
        unreachable!("Missing mock data");
    }
}

impl Index<&str> for MockDataCollection {
    type Output = MockData;

    fn index(&self, name: &str) -> &Self::Output {
        &self.data.iter().find(|entry| entry.0 == name).unwrap().1
    }
}

fn all_mock_data() -> MockDataCollection {
    let mut data: MockDataCollection = Default::default();
    data.insert(
        "base",
        MockData {
            user_accounts: mock_user_accounts(),
            user_store_joins: mock_user_store_joins(),
            user_permissions: mock_user_permissions(),
            names: mock_names(),
            stores: mock_stores(),
            units: mock_units(),
            items: mock_items(),
            locations: mock_locations(),
            name_store_joins: mock_name_store_joins(),
            full_requisitions: vec![],
            invoices: mock_invoices(),
            stock_lines: mock_stock_lines(),
            invoice_lines: mock_invoice_lines(),
            full_invoices: mock_full_invoices(),
            full_master_lists: mock_full_master_lists(),
            stocktakes: mock_stocktake_data(),
            stocktake_lines: mock_stocktake_line_data(),
            requisitions: vec![],
            requisition_lines: vec![],
            logs: mock_logs(),
        },
    );
    data.insert(
        "test_invoice_count_service_data",
        test_invoice_count_service_data(),
    );
    data.insert(
        "test_outbound_shipment_update_data",
        test_outbound_shipment_update_data(),
    );
    data.insert("test_stocktake_line_data", test_stocktake_line_data());
    data.insert("test_stocktake_data", test_stocktake_data());
    data.insert("mock_test_unallocated_line", mock_test_unallocated_line());
    data.insert("mock_test_name_store_id", mock_test_name_store_id());
    data.insert(
        "mock_test_requisition_repository",
        mock_test_requisition_repository(),
    );
    data.insert(
        "mock_test_requisition_line_repository",
        mock_test_requisition_line_repository(),
    );
    data.insert(
        "mock_test_requisition_service",
        mock_test_requisition_service(),
    );
    data.insert(
        "mock_test_requisition_queries",
        mock_test_requisition_queries(),
    );
    data.insert(
        "mock_test_master_list_repository",
        mock_test_master_list_repository(),
    );
    data.insert("mock_test_sync_processor", mock_test_sync_processor());
    data.insert("mock_test_invoice_loaders", mock_test_invoice_loaders());
    data.insert("mock_test_remote_pull", mock_test_remote_pull());
    data.insert("mock_test_service_item", mock_test_service_item());
    data.insert("mock_test_name_query", mock_test_name_query());
    data
}

pub async fn insert_all_mock_data(
    connection: &StorageConnection,
    inserts: MockDataInserts,
) -> MockDataCollection {
    insert_mock_data(connection, inserts, all_mock_data()).await
}

pub async fn insert_mock_data(
    connection: &StorageConnection,
    inserts: MockDataInserts,
    mock_data: MockDataCollection,
) -> MockDataCollection {
    for (_, mock_data) in &mock_data.data {
        if inserts.names {
            let repo = NameRowRepository::new(connection);
            for row in &mock_data.names {
                repo.insert_one(&row).await.unwrap();
            }
        }

        if inserts.stores {
            let repo = StoreRowRepository::new(connection);
            for row in &mock_data.stores {
                repo.insert_one(&row).await.unwrap();
            }
        }

        if inserts.user_accounts {
            let repo = UserAccountRowRepository::new(connection);
            for row in &mock_data.user_accounts {
                repo.insert_one(&row).unwrap();
            }
        }

        if inserts.user_store_joins {
            let repo = UserStoreJoinRowRepository::new(connection);
            for row in &mock_data.user_store_joins {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.user_permissions {
            let repo = UserPermissionRowRepository::new(connection);
            for row in &mock_data.user_permissions {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.units {
            let repo = UnitRowRepository::new(connection);
            for row in &mock_data.units {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.items {
            let repo = ItemRowRepository::new(connection);
            for row in &mock_data.items {
                repo.insert_one(&row).await.unwrap();
            }
        }

        if inserts.locations {
            let repo = LocationRowRepository::new(connection);
            for row in &mock_data.locations {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.name_store_joins {
            let repo = NameStoreJoinRepository::new(connection);
            for row in &mock_data.name_store_joins {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.full_requisitions {
            for row in mock_data.full_requisitions.iter() {
                insert_full_mock_requisition(&row, connection)
            }
        }

        if inserts.requisitions {
            for row in &mock_data.requisitions {
                let repo = RequisitionRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.requisition_lines {
            for row in &mock_data.requisition_lines {
                let repo = RequisitionLineRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.invoices {
            let repo = InvoiceRowRepository::new(connection);
            for row in &mock_data.invoices {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.stock_lines {
            let repo = StockLineRowRepository::new(connection);
            for row in &mock_data.stock_lines {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.invoice_lines {
            let repo = InvoiceLineRowRepository::new(connection);
            for row in &mock_data.invoice_lines {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.full_invoices {
            for row in mock_data.full_invoices.values() {
                insert_full_mock_invoice(row, connection)
            }
        }

        if inserts.full_master_lists {
            for row in mock_data.full_master_lists.iter() {
                insert_full_mock_master_list(row, connection)
            }
        }

        if inserts.stocktakes {
            let repo = StocktakeRowRepository::new(connection);
            for row in &mock_data.stocktakes {
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.stocktake_lines {
            for row in &mock_data.stocktake_lines {
                let repo = StocktakeLineRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.logs {
            for row in &mock_data.logs {
                let repo = LogRowRepository::new(connection);
                repo.insert_one(row).unwrap();
            }
        }
    }

    mock_data
}

impl MockData {
    pub fn join(mut self, other: MockData) -> MockData {
        let MockData {
            mut user_accounts,
            mut names,
            mut stores,
            mut units,
            mut items,
            mut locations,
            mut name_store_joins,
            mut full_requisitions,
            mut invoices,
            mut stock_lines,
            mut invoice_lines,
            full_invoices: _,
            mut full_master_lists,
            mut requisitions,
            mut requisition_lines,
            mut stocktakes,
            mut stocktake_lines,
            user_store_joins: _,
            user_permissions: _,
            mut logs,
        } = other;

        self.user_accounts.append(&mut user_accounts);
        self.names.append(&mut names);
        self.stores.append(&mut stores);
        self.units.append(&mut units);
        self.items.append(&mut items);
        self.locations.append(&mut locations);
        self.full_requisitions.append(&mut full_requisitions);
        self.invoices.append(&mut invoices);
        self.invoice_lines.append(&mut invoice_lines);
        // self.full_invoices.append(&mut full_invoices);
        self.full_master_lists.append(&mut full_master_lists);
        self.requisitions.append(&mut requisitions);
        self.requisition_lines.append(&mut requisition_lines);
        self.stocktakes.append(&mut stocktakes);
        self.stocktake_lines.append(&mut stocktake_lines);
        self.name_store_joins.append(&mut name_store_joins);
        self.stock_lines.append(&mut stock_lines);
        self.logs.append(&mut logs);

        self
    }
}
