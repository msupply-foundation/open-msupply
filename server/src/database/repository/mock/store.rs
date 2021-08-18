use crate::database::repository::RepositoryError;
use crate::database::schema::{DatabaseRow, StoreRow};

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct StoreRepository {
    mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>,
}

impl StoreRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>) -> StoreRepository {
        StoreRepository { mock_data }
    }

    pub async fn insert_one(&self, store: &StoreRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(store.id.to_string(), DatabaseRow::Store(store.clone()));
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<StoreRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(DatabaseRow::Store(store)) => Ok(store.clone()),
            _ => Err(RepositoryError {
                msg: String::from(format!("Failed to find store {}", id)),
            }),
        }
    }
}
