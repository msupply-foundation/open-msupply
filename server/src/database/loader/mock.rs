use crate::{
    database::{
        loader::{
            InvoiceLineLoader, InvoiceLoader, ItemLoader, NameLoader, RequisitionLineLoader,
            RequisitionLoader, StockLineLoader, StoreLoader, UserAccountLoader,
        },
        mock,
        repository::{
            InvoiceLineRepository, InvoiceRepository, ItemRepository, NameRepository,
            RequisitionLineRepository, RequisitionRepository, StockLineRepository, StoreRepository,
            UserAccountRepository,
        },
        schema::{
            DatabaseRow, InvoiceLineRow, InvoiceRow, ItemRow, NameRow, RequisitionLineRow,
            RequisitionRow, StockLineRow, StoreRow, UserAccountRow,
        },
    },
    server::data::LoaderMap,
    util::settings::Settings,
};

use async_graphql::dataloader::DataLoader;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

pub async fn get_loaders(_settings: &Settings) -> LoaderMap {
    let mut loaders = LoaderMap::new();

    let mut mock_data: HashMap<String, DatabaseRow> = HashMap::new();

    let mock_items: Vec<ItemRow> = mock::mock_items();
    for item in mock_items {
        mock_data.insert(item.id.to_string(), DatabaseRow::Item(item.clone()));
    }

    let mock_stock_lines: Vec<StockLineRow> = mock::mock_stock_lines();
    for stock_line in mock_stock_lines {
        mock_data.insert(
            stock_line.id.to_string(),
            DatabaseRow::StockLine(stock_line.clone()),
        );
    }

    let mock_requisitions: Vec<RequisitionRow> = mock::mock_requisitions();
    for requisition in mock_requisitions {
        mock_data.insert(
            requisition.id.to_string(),
            DatabaseRow::Requisition(requisition.clone()),
        );
    }

    let mock_requisition_lines: Vec<RequisitionLineRow> = mock::mock_requisition_lines();
    for requisition_line in mock_requisition_lines {
        mock_data.insert(
            requisition_line.id.to_string(),
            DatabaseRow::RequisitionLine(requisition_line.clone()),
        );
    }

    let mock_names: Vec<NameRow> = mock::mock_names();
    for name in mock_names {
        mock_data.insert(name.id.to_string(), DatabaseRow::Name(name.clone()));
    }

    let mock_stores: Vec<StoreRow> = mock::mock_stores();
    for store in mock_stores {
        mock_data.insert(store.id.to_string(), DatabaseRow::Store(store.clone()));
    }

    let mock_invoices: Vec<InvoiceRow> = mock::mock_invoices();
    for invoice in mock_invoices {
        mock_data.insert(
            invoice.id.to_string(),
            DatabaseRow::invoice(invoice.clone()),
        );
    }

    let mock_invoice_lines: Vec<InvoiceLineRow> = mock::mock_invoice_lines();
    for invoice_line in mock_invoice_lines {
        mock_data.insert(
            invoice_line.id.to_string(),
            DatabaseRow::invoiceLine(invoice_line.clone()),
        );
    }

    let mock_user_accounts: Vec<UserAccountRow> = mock::mock_user_accounts();
    for user_account in mock_user_accounts {
        mock_data.insert(
            user_account.id.to_string(),
            DatabaseRow::UserAccount(user_account.clone()),
        );
    }

    let mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>> = Arc::new(Mutex::new(mock_data));

    let item_repository = ItemRepository::new(Arc::clone(&mock_data));
    let item_loader = DataLoader::new(ItemLoader { item_repository });

    let requisition_repository = RequisitionRepository::new(Arc::clone(&mock_data));
    let requisition_loader = DataLoader::new(RequisitionLoader {
        requisition_repository,
    });

    let requisition_line_repository = RequisitionLineRepository::new(Arc::clone(&mock_data));
    let requisition_line_loader = DataLoader::new(RequisitionLineLoader {
        requisition_line_repository,
    });

    let name_repository = NameRepository::new(Arc::clone(&mock_data));
    let name_loader = DataLoader::new(NameLoader { name_repository });

    let store_repository = StoreRepository::new(Arc::clone(&mock_data));
    let store_loader = DataLoader::new(StoreLoader { store_repository });

    let invoice_repository = InvoiceRepository::new(Arc::clone(&mock_data));
    let invoice_loader = DataLoader::new(InvoiceLoader { invoice_repository });

    let invoice_line_repository = InvoiceLineRepository::new(Arc::clone(&mock_data));
    let invoice_line_loader = DataLoader::new(InvoiceLineLoader {
        invoice_line_repository,
    });

    let user_account_repository = UserAccountRepository::new(Arc::clone(&mock_data));
    let user_account_loader = DataLoader::new(UserAccountLoader {
        user_account_repository,
    });

    loaders.insert(item_loader);
    loaders.insert(requisition_loader);
    loaders.insert(requisition_line_loader);
    loaders.insert(name_loader);
    loaders.insert(store_loader);
    loaders.insert(invoice_loader);
    loaders.insert(invoice_line_loader);
    loaders.insert(user_account_loader);

    loaders
}
