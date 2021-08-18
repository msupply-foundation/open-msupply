use crate::util::sync::SyncSenderActor;
use anymap::{any::CloneAny, Map};
use std::sync::{Arc, Mutex};

pub type RepositoryMap = Map<AnyRepository>;
pub type AnyRepository = dyn CloneAny + Send + Sync;

pub struct RepositoryRegistry {
    pub sync_sender: Arc<Mutex<SyncSenderActor>>,
    pub repositories: RepositoryMap,
}

impl RepositoryRegistry {
    pub fn get<T: anymap::any::CloneAny + Send + Sync>(&self) -> &T {
        match self.repositories.get::<T>() {
            Some(repository) => repository,
            None => unreachable!("{} not found", std::any::type_name::<T>()),
        }
    }
}
