use std::sync::Arc;
use std::sync::Mutex;

pub struct RepositoryRegistry {
    pub repositories: anymap::Map<dyn anymap::any::CloneAny + Send + Sync>,
    pub sync_sender: Arc<Mutex<tokio::sync::mpsc::Sender<()>>>,
}

impl RepositoryRegistry {
    pub fn get<T: anymap::any::CloneAny + Send + Sync>(&self) -> &T {
        match self.repositories.get::<T>() {
            Some(repository) => repository,
            None => unreachable!("{} not found", std::any::type_name::<T>()),
        }
    }
}
