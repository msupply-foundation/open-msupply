use anymap::{any::Any, Map};
use repository::{database_settings::DatabaseSettings, get_storage_connection_manager};

pub type AnyRepository = dyn Any + Send + Sync;
pub type RepositoryMap = Map<AnyRepository>;

pub struct RepositoryRegistry {
    pub repositories: RepositoryMap,
}

impl RepositoryRegistry {
    pub fn get<T: anymap::any::Any + Send + Sync>(&self) -> &T {
        match self.repositories.get::<T>() {
            Some(repository) => repository,
            None => unreachable!("{} not found", std::any::type_name::<T>()),
        }
    }
}

pub async fn get_repositories(settings: &DatabaseSettings) -> RepositoryMap {
    let connection_manager = get_storage_connection_manager(&settings);
    let mut repositories: RepositoryMap = RepositoryMap::new();
    repositories.insert(connection_manager);
    repositories
}
