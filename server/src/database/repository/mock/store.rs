use crate::database::repository::{MockRepository, Repository, RepositoryError, StoreRepository};
use crate::database::schema::StoreRow;

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct StoreMockRepository {
    mock_data: Arc<Mutex<HashMap<String, StoreRow>>>,
}

impl Repository for StoreMockRepository {}
impl MockRepository for StoreMockRepository {}

impl StoreMockRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, StoreRow>>>) -> StoreMockRepository {
        StoreMockRepository { mock_data }
    }
}

#[async_trait]
impl StoreRepository for StoreMockRepository {
    async fn insert_one(&self, store: &StoreRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(store.id.clone()), store.clone());

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<StoreRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(store) => Ok(store.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find store {}", id)),
            }),
        }
    }
}
