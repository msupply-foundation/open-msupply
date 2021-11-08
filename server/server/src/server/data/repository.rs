use anymap::{any::Any, Map};

pub type RepositoryMap = Map<AnyRepository>;
pub type AnyRepository = dyn Any + Send + Sync;

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
