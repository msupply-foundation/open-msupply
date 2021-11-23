mod full_invoice;
mod full_master_list;
mod invoice;
mod invoice_line;
mod item;
mod location;
mod name;
mod name_store_join;
mod requisition;
mod requisition_line;
mod stock_line;
mod store;
mod unit;
mod user_account;

use std::collections::HashMap;

pub use full_invoice::mock_full_invoices;
pub use invoice::{mock_invoices, mock_outbound_shipments};
pub use invoice_line::mock_invoice_lines;
pub use item::mock_items;
pub use location::mock_locations;
pub use name::mock_names;
pub use name_store_join::mock_name_store_joins;
pub use requisition::mock_requisitions;
pub use requisition_line::mock_requisition_lines;
pub use stock_line::mock_stock_lines;
pub use store::mock_stores;
pub use user_account::mock_user_accounts;

use crate::{InvoiceLineRowRepository, LocationRowRepository, StockLineRowRepository};

use self::{
    full_invoice::{insert_full_mock_invoice, FullMockInvoice},
    full_master_list::{insert_full_mock_master_list, mock_full_master_list, FullMockMasterList},
    unit::mock_units,
};

use super::{
    db_diesel::{
        InvoiceRepository, ItemRepository, NameRepository, NameStoreJoinRepository,
        StorageConnection, StoreRepository, UnitRowRepository,
    },
    schema::*,
};

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

pub async fn insert_mock_data(
    connection: &StorageConnection,
    inserts: MockDataInserts,
) -> MockData {
    let result = MockData {
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

    if inserts.units {
        let repo = UnitRowRepository::new(connection);
        for row in &result.units {
            repo.upsert_one(&row).unwrap();
        }
    }

    if inserts.items {
        let repo = ItemRepository::new(connection);
        for row in &result.items {
            repo.insert_one(&row).await.unwrap();
        }
    }

    if inserts.locations {
        let repo = LocationRowRepository::new(connection);
        for row in &result.locations {
            repo.upsert_one(&row).unwrap();
        }
    }

    if inserts.name_store_joins {
        let repo = NameStoreJoinRepository::new(connection);
        for row in &result.name_store_joins {
            repo.upsert_one(&row).unwrap();
        }
    }

    if inserts.invoices {
        let repo = InvoiceRepository::new(connection);
        for row in &result.invoices {
            repo.upsert_one(&row).unwrap();
        }
    }

    if inserts.stock_lines {
        let repo = StockLineRowRepository::new(connection);
        for row in &result.stock_lines {
            repo.upsert_one(&row).unwrap();
        }
    }

    if inserts.invoice_lines {
        let repo = InvoiceLineRowRepository::new(connection);
        for row in &result.invoice_lines {
            repo.upsert_one(&row).unwrap();
        }
    }

    if inserts.full_invoices {
        for row in result.full_invoices.values() {
            insert_full_mock_invoice(row, connection)
        }
    }

    if inserts.full_master_list {
        for row in result.full_master_list.values() {
            insert_full_mock_master_list(row, connection)
        }
    }

    result
}
