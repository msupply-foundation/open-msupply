mod full_invoice;
mod full_master_list;
mod invoice;
mod invoice_line;
mod item;
mod location;
mod name;
mod name_store_join;
mod number;
mod requisition;
mod requisition_line;
mod stock_line;
mod store;
mod test_invoice_count_service;
mod test_outbound_shipment_update;
mod unit;
mod user_account;
use std::{collections::HashMap, ops::Index};

pub use full_invoice::mock_full_invoices;
pub use full_master_list::*;
pub use invoice::{mock_invoices, mock_outbound_shipment_a, mock_outbound_shipments};
pub use invoice_line::{mock_invoice_lines, mock_outbound_shipment_invoice_lines};
pub use item::mock_items;
pub use location::mock_locations;
pub use name::{mock_name_store_a, mock_name_store_b, mock_names};
pub use name_store_join::mock_name_store_joins;
pub use number::*;
pub use requisition::mock_requisitions;
pub use requisition_line::mock_requisition_lines;
pub use stock_line::mock_stock_lines;
pub use store::{mock_store_b, mock_stores};
pub use test_invoice_count_service::*;
pub use test_outbound_shipment_update::*;
pub use user_account::mock_user_accounts;

use crate::{
    InvoiceLineRowRepository, LocationRowRepository, NumberRowRepository, StockLineRowRepository,
};

use self::{
    full_invoice::{insert_full_mock_invoice, FullMockInvoice},
    unit::mock_units,
};

use super::{
    db_diesel::{
        InvoiceRepository, ItemRepository, NameRepository, NameStoreJoinRepository,
        StorageConnection, StoreRepository, UnitRowRepository,
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
    pub invoices: Vec<InvoiceRow>,
    pub stock_lines: Vec<StockLineRow>,
    pub invoice_lines: Vec<InvoiceLineRow>,
    pub full_invoices: HashMap<String, FullMockInvoice>,
    pub full_master_list: HashMap<String, FullMockMasterList>,
    pub numbers: Vec<NumberRow>,
}
pub struct MockDataInserts {
    pub names: bool,
    pub stores: bool,
    pub units: bool,
    pub items: bool,
    pub locations: bool,
    pub name_store_joins: bool,
    pub invoices: bool,
    pub stock_lines: bool,
    pub invoice_lines: bool,
    pub full_invoices: bool,
    pub full_master_list: bool,
    pub numbers: bool,
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
            invoices: true,
            stock_lines: true,
            invoice_lines: true,
            full_invoices: true,
            full_master_list: true,
            numbers: true,
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
            invoices: false,
            stock_lines: false,
            invoice_lines: false,
            full_invoices: false,
            full_master_list: false,
            numbers: false,
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
        self.full_master_list = true;
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
            invoices: mock_invoices(),
            stock_lines: mock_stock_lines(),
            invoice_lines: mock_invoice_lines(),
            full_invoices: mock_full_invoices(),
            full_master_list: mock_full_master_list(),
            numbers: mock_numbers(),
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
            let repo = StoreRepository::new(connection);
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

        if inserts.full_master_list {
            for row in mock_data.full_master_list.values() {
                insert_full_mock_master_list(row, connection)
            }
        }

        if inserts.numbers {
            let repo = NumberRowRepository::new(connection);
            for row in &mock_data.numbers {
                repo.upsert_one(&row).unwrap();
            }
        }
    }

    all_mock_data
}
