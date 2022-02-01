use std::{collections::HashMap, ops::Index};

mod common;
mod full_invoice;
mod full_master_list;
mod invoice;
mod invoice_line;
mod item;
mod location;
mod name;
mod name_store_join;
mod number;
mod stock_line;
mod stock_take;
mod stock_take_line;
mod store;
mod test_invoice_count_service;
mod test_item_stats_repository;
mod test_master_list_repository;
mod test_name_store_id;
mod test_outbound_shipment_update;
mod test_requisition_line_repository;
mod test_requisition_queries;
mod test_requisition_repository;
mod test_requisition_service;
mod test_stock_take;
mod test_stock_take_line;
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
pub use name_store_join::mock_name_store_joins;
pub use number::*;
pub use stock_line::*;
pub use stock_take::*;
pub use stock_take_line::*;
pub use store::*;
pub use test_invoice_count_service::*;
pub use test_item_stats_repository::*;
pub use test_master_list_repository::*;
pub use test_name_store_id::*;
pub use test_outbound_shipment_update::*;
pub use test_requisition_line_repository::*;
pub use test_requisition_queries::*;
pub use test_requisition_repository::*;
pub use test_requisition_service::*;
pub use test_stock_take::*;
pub use test_stock_take_line::*;
pub use test_unallocated_line::*;
pub use user_account::mock_user_accounts;

use crate::{
    InvoiceLineRowRepository, LocationRowRepository, NumberRowRepository,
    RequisitionLineRowRepository, RequisitionRowRepository, StockLineRowRepository,
    StockTakeLineRowRepository, StockTakeRowRepository,
};

use self::unit::mock_units;

use super::{
    db_diesel::{
        InvoiceRepository, ItemRepository, NameRepository, NameStoreJoinRepository,
        StorageConnection, StoreRowRepository, UnitRowRepository,
    },
    schema::*,
};

#[derive(Default)]
pub struct MockData {
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
    pub numbers: Vec<NumberRow>,
    pub requisitions: Vec<RequisitionRow>,
    pub requisition_lines: Vec<RequisitionLineRow>,
    pub stock_takes: Vec<StockTakeRow>,
    pub stock_take_lines: Vec<StockTakeLineRow>,
}

pub struct MockDataInserts {
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
    pub numbers: bool,
    pub requisitions: bool,
    pub requisition_lines: bool,
    pub stock_takes: bool,
    pub stock_take_lines: bool,
}

impl MockDataInserts {
    pub fn all() -> Self {
        MockDataInserts {
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
            numbers: true,
            requisitions: true,
            requisition_lines: true,
            stock_takes: true,
            stock_take_lines: true,
        }
    }

    pub fn none() -> Self {
        MockDataInserts {
            names: false,
            stores: false,
            units: false,
            items: false,
            locations: false,
            name_store_joins: false,
            full_requisitions: false,
            invoices: false,
            stock_lines: false,
            invoice_lines: false,
            full_invoices: false,
            full_master_lists: false,
            numbers: false,
            requisitions: false,
            requisition_lines: false,
            stock_takes: false,
            stock_take_lines: false,
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

    pub fn stock_takes(mut self) -> Self {
        self.stock_takes = true;
        self
    }

    pub fn stock_take_lines(mut self) -> Self {
        self.stock_take_lines = true;
        self
    }
}

#[derive(Default)]
pub struct MockDataCollection {
    // Note: can't use a HashMap since mock data should be inserted in order
    data: Vec<(String, MockData)>,
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
            numbers: mock_numbers(),
            stock_takes: mock_stock_take_data(),
            stock_take_lines: mock_stock_take_line_data(),
            requisitions: vec![],
            requisition_lines: vec![],
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
    data.insert("test_stock_take_line_data", test_stock_take_line_data());
    data.insert("test_stock_take_data", test_stock_take_data());
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
        "mock_test_item_stats_repository",
        mock_test_item_stats_repository(),
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

    data
}

pub async fn insert_mock_data(
    connection: &StorageConnection,
    inserts: MockDataInserts,
) -> MockDataCollection {
    let all_mock_data = all_mock_data();
    for (_, mock_data) in &all_mock_data.data {
        if inserts.names {
            let repo = NameRepository::new(connection);
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

        if inserts.units {
            let repo = UnitRowRepository::new(connection);
            for row in &mock_data.units {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.items {
            let repo = ItemRepository::new(connection);
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

        if inserts.invoices {
            let repo = InvoiceRepository::new(connection);
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

        if inserts.numbers {
            let repo = NumberRowRepository::new(connection);
            for row in &mock_data.numbers {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.stock_takes {
            let repo = StockTakeRowRepository::new(connection);
            for row in &mock_data.stock_takes {
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.stock_take_lines {
            for row in &mock_data.stock_take_lines {
                let repo = StockTakeLineRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
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
    }

    all_mock_data
}
