use crate::database::repository::RepositoryError;
use crate::database::schema::StoreRow;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct StoreRepository {
    mock_data: Arc<Mutex<HashMap<String, StoreRow>>>,
}

impl StoreRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, StoreRow>>>) -> StoreRepository {
        StoreRepository { mock_data }
    }

    pub async fn insert_one(&self, store: &StoreRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(store.id.clone()), store.clone());

        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<StoreRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(store) => Ok(store.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find store {}", id)),
            }),
        }
    }
}
