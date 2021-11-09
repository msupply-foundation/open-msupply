use anymap::{any::Any, Map};

use crate::loader::{
    InvoiceLineLoader, InvoiceLoader, ItemLoader, RequisitionLineLoader, RequisitionLoader,
    StoreLoader, UserAccountLoader,
};

use repository::repository::StorageConnectionManager;

use async_graphql::dataloader::DataLoader;

use super::{
    name::NameByIdLoader, InvoiceLineQueryLoader, InvoiceLineStatsLoader, StockLineByIdLoader,
    StockLineByItemIdLoader,
};

pub type LoaderMap = Map<AnyLoader>;
pub type AnyLoader = dyn Any + Send + Sync;

pub struct LoaderRegistry {
    pub loaders: LoaderMap,
}

impl LoaderRegistry {
    pub fn get<T: anymap::any::Any + Send + Sync>(&self) -> &T {
        match self.loaders.get::<T>() {
            Some(loader) => loader,
            None => unreachable!("{} not found", std::any::type_name::<T>()),
        }
    }
}

pub async fn get_loaders(connection_manager: &StorageConnectionManager) -> LoaderMap {
    let mut loaders: LoaderMap = LoaderMap::new();

    let item_loader = DataLoader::new(ItemLoader {
        connection_manager: connection_manager.clone(),
    });

    let requisition_loader = DataLoader::new(RequisitionLoader {
        connection_manager: connection_manager.clone(),
    });

    let requisition_line_loader = DataLoader::new(RequisitionLineLoader {
        connection_manager: connection_manager.clone(),
    });

    let store_loader = DataLoader::new(StoreLoader {
        connection_manager: connection_manager.clone(),
    });

    let invoice_loader = DataLoader::new(InvoiceLoader {
        connection_manager: connection_manager.clone(),
    });

    let invoice_line_loader = DataLoader::new(InvoiceLineLoader {
        connection_manager: connection_manager.clone(),
    });

    let invoice_line_query_loader = DataLoader::new(InvoiceLineQueryLoader {
        connection_manager: connection_manager.clone(),
    });

    let invoice_line_stats_loader = DataLoader::new(InvoiceLineStatsLoader {
        connection_manager: connection_manager.clone(),
    });

    let stock_line_by_item_id_loader = DataLoader::new(StockLineByItemIdLoader {
        connection_manager: connection_manager.clone(),
    });

    let stock_line_by_id_loader = DataLoader::new(StockLineByIdLoader {
        connection_manager: connection_manager.clone(),
    });

    let user_account_loader = DataLoader::new(UserAccountLoader {
        connection_manager: connection_manager.clone(),
    });

    let name_by_id_loader = DataLoader::new(NameByIdLoader {
        connection_manager: connection_manager.clone(),
    });

    loaders.insert(item_loader);
    loaders.insert(requisition_loader);
    loaders.insert(requisition_line_loader);
    loaders.insert(name_by_id_loader);
    loaders.insert(store_loader);
    loaders.insert(invoice_loader);
    loaders.insert(invoice_line_loader);
    loaders.insert(invoice_line_query_loader);
    loaders.insert(invoice_line_stats_loader);
    loaders.insert(stock_line_by_item_id_loader);
    loaders.insert(stock_line_by_id_loader);
    loaders.insert(user_account_loader);

    loaders
}
