use crate::database::repository::RepositoryError;
use crate::database::schema::{DatabaseRow, ItemRow};

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct ItemRepository {
    mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>,
}

impl ItemRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>) -> ItemRepository {
        ItemRepository { mock_data }
    }

    pub async fn insert_one(&self, item: &ItemRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(item.id.to_string(), DatabaseRow::Item(item.clone()));
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<ItemRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&id.to_string()) {
            Some(DatabaseRow::Item(item)) => Ok(item.clone()),
            _ => Err(RepositoryError {
                msg: String::from(format!("Failed to find item {}", id)),
            }),
        }
    }
}
