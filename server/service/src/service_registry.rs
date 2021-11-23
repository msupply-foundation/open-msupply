use anymap::{any::Any, Map};
use repository::StorageConnectionManager;

use crate::location::{LocationService, LocationServiceQuery};

pub type ServiceMap = Map<AnyService>;
pub type AnyService = dyn Any + Send + Sync;

pub struct ServiceRegistry {
    pub services: ServiceMap,
}

impl ServiceRegistry {
    pub fn get<T: anymap::any::Any + Send + Sync>(&self) -> &T {
        match self.services.get::<T>() {
            Some(service) => service,
            None => unreachable!("{} not found", std::any::type_name::<T>()),
        }
    }
}

pub async fn get_services(connection_manager: &StorageConnectionManager) -> ServiceMap {
    let mut services: ServiceMap = ServiceMap::new();

    let location_service: Box<dyn LocationServiceQuery> =
        Box::new(LocationService::new(connection_manager.clone()));

    services.insert(location_service);

    services
}
