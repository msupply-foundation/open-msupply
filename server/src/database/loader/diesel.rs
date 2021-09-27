use crate::{
    database::{
        loader::{
            InvoiceLineLoader, InvoiceLoader, ItemLoader, NameLoader, RequisitionLineLoader,
            RequisitionLoader, StoreLoader, UserAccountLoader,
        },
        repository::{
            InvoiceLineQueryRepository, InvoiceLineRepository, InvoiceRepository, ItemRepository,
            NameRepository, RequisitionLineRepository, RequisitionRepository, StockLineRepository,
            StoreRepository, UserAccountRepository,
        },
    },
    server::data::LoaderMap,
    util::settings::Settings,
};

use async_graphql::dataloader::DataLoader;

use diesel::r2d2::{ConnectionManager, Pool};

#[cfg(feature = "postgres")]
use diesel::PgConnection as DBBackendConnection;

#[cfg(feature = "sqlite")]
use diesel::SqliteConnection as DBBackendConnection;

use super::InvoiceLineStatsLoader;

pub async fn get_loaders(settings: &Settings) -> LoaderMap {
    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&settings.database.connection_string());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");

    let mut loaders: LoaderMap = LoaderMap::new();

    let item_repository = ItemRepository::new(pool.clone());
    let item_loader = DataLoader::new(ItemLoader { item_repository });

    let _stock_line_repository = StockLineRepository::new(pool.clone());

    let requisition_repository = RequisitionRepository::new(pool.clone());
    let requisition_loader = DataLoader::new(RequisitionLoader {
        requisition_repository,
    });

    let requisition_line_repository = RequisitionLineRepository::new(pool.clone());
    let requisition_line_loader = DataLoader::new(RequisitionLineLoader {
        requisition_line_repository,
    });

    let name_repository = NameRepository::new(pool.clone());
    let name_loader = DataLoader::new(NameLoader { name_repository });

    let store_repository = StoreRepository::new(pool.clone());
    let store_loader = DataLoader::new(StoreLoader { store_repository });

    let invoice_repository = InvoiceRepository::new(pool.clone());
    let invoice_loader = DataLoader::new(InvoiceLoader { invoice_repository });

    let invoice_line_repository = InvoiceLineRepository::new(pool.clone());
    let invoice_line_loader = DataLoader::new(InvoiceLineLoader {
        invoice_line_repository,
    });

    let invoice_line_stats_loader = DataLoader::new(InvoiceLineStatsLoader {
        invoice_line_query_repository: InvoiceLineQueryRepository::new(pool.clone()),
    });

    let user_account_repository = UserAccountRepository::new(pool.clone());
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
    loaders.insert(invoice_line_stats_loader);
    loaders.insert(user_account_loader);

    loaders
}
