use actix_web::web::Data;
use anymap::{any::Any, Map};
use service::service_provider::ServiceProvider;

use crate::loader::{InvoiceLineLoader, InvoiceLoader, ItemLoader, StoreLoader, UserAccountLoader};

use repository::StorageConnectionManager;

use async_graphql::dataloader::DataLoader;

use super::{
    invoice::InvoiceByRequisitionIdLoader, name::NameByIdLoader, InvoiceLineForRequisitionLine,
    InvoiceLineQueryLoader, InvoiceQueryLoader, InvoiceStatsLoader, ItemsStatsForItemLoader,
    LinkedRequisitionLineLoader, LocationByIdLoader, MasterListLineByMasterListId,
    RequisitionLinesByRequisitionIdLoader, RequisitionsByIdLoader, StockLineByIdLoader,
    StockLineByItemIdLoader, StockLineByLocationIdLoader, StockTakeLineByStockTakeIdLoader,
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

pub async fn get_loaders(
    connection_manager: &StorageConnectionManager,
    service_provider: Data<ServiceProvider>,
) -> LoaderMap {
    let mut loaders: LoaderMap = LoaderMap::new();

    let item_loader = DataLoader::new(ItemLoader {
        connection_manager: connection_manager.clone(),
    });

    let store_loader = DataLoader::new(StoreLoader {
        connection_manager: connection_manager.clone(),
    });

    let invoice_loader = DataLoader::new(InvoiceLoader {
        connection_manager: connection_manager.clone(),
    });

    let invoice_query_loader = DataLoader::new(InvoiceQueryLoader {
        connection_manager: connection_manager.clone(),
    });

    let invoice_by_requisition_id_loader = DataLoader::new(InvoiceByRequisitionIdLoader {
        connection_manager: connection_manager.clone(),
    });

    let invoice_line_loader = DataLoader::new(InvoiceLineLoader {
        connection_manager: connection_manager.clone(),
    });

    let invoice_line_query_loader = DataLoader::new(InvoiceLineQueryLoader {
        connection_manager: connection_manager.clone(),
    });

    let invoice_line_for_requisition_line = DataLoader::new(InvoiceLineForRequisitionLine {
        connection_manager: connection_manager.clone(),
    });

    let invoice_line_stats_loader = DataLoader::new(InvoiceStatsLoader {
        connection_manager: connection_manager.clone(),
    });

    let stock_line_by_item_id_loader = DataLoader::new(StockLineByItemIdLoader {
        connection_manager: connection_manager.clone(),
    });

    let stock_line_by_location_id_loader = DataLoader::new(StockLineByLocationIdLoader {
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

    let location_by_id_loader = DataLoader::new(LocationByIdLoader {
        connection_manager: connection_manager.clone(),
    });

    let master_list_line_by_master_list_id = DataLoader::new(MasterListLineByMasterListId {
        connection_manager: connection_manager.clone(),
    });

    let stocktake_line_loader = DataLoader::new(StocktakeLineByStocktakeIdLoader {
        connection_manager: connection_manager.clone(),
    });

    let requisitions_by_id_loader = DataLoader::new(RequisitionsByIdLoader {
        service_provider: service_provider.clone(),
    });

    let requisition_line_by_requisition_id_loader =
        DataLoader::new(RequisitionLinesByRequisitionIdLoader {
            service_provider: service_provider.clone(),
        });

    let requisition_line_by_linked_requisition_line_id_loader =
        DataLoader::new(LinkedRequisitionLineLoader {
            service_provider: service_provider.clone(),
        });

    let item_stats_for_item_loader = DataLoader::new(ItemsStatsForItemLoader {
        service_provider: service_provider.clone(),
    });

    loaders.insert(item_loader);
    loaders.insert(name_by_id_loader);
    loaders.insert(store_loader);
    loaders.insert(invoice_loader);
    loaders.insert(invoice_query_loader);
    loaders.insert(invoice_by_requisition_id_loader);
    loaders.insert(invoice_line_loader);
    loaders.insert(invoice_line_query_loader);
    loaders.insert(invoice_line_stats_loader);
    loaders.insert(invoice_line_for_requisition_line);
    loaders.insert(stock_line_by_item_id_loader);
    loaders.insert(stock_line_by_location_id_loader);
    loaders.insert(stock_line_by_id_loader);
    loaders.insert(user_account_loader);
    loaders.insert(location_by_id_loader);
    loaders.insert(master_list_line_by_master_list_id);
    loaders.insert(stock_take_line_loader);
    loaders.insert(requisitions_by_id_loader);
    loaders.insert(requisition_line_by_requisition_id_loader);
    loaders.insert(requisition_line_by_linked_requisition_line_id_loader);
    loaders.insert(item_stats_for_item_loader);
    loaders.insert(stocktake_line_loader);

    loaders
}
