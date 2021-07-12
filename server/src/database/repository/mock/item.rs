use crate::database::repository::RepositoryError;
use crate::database::schema::ItemRow;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct ItemRepository {
    mock_data: Arc<Mutex<HashMap<String, ItemRow>>>,
}

impl ItemRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, ItemRow>>>) -> ItemRepository {
        ItemRepository { mock_data }
    }

    pub async fn insert_one(&self, item: &ItemRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(item.id.clone()), item.clone());

        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<ItemRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(item) => Ok(item.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find item {}", id)),
            }),
        }
    }
}
