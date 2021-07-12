use crate::database::repository::RepositoryError;
use crate::database::schema::ItemLineRow;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct ItemLineRepository {
    mock_data: Arc<Mutex<HashMap<String, ItemLineRow>>>,
}

impl ItemLineRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, ItemLineRow>>>) -> ItemLineRepository {
        ItemLineRepository { mock_data }
    }

    pub async fn insert_one(&self, item_line: &ItemLineRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(item_line.id.clone()), item_line.clone());

        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<ItemLineRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(item_line) => Ok(item_line.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find item_line {}", id)),
            }),
        }
    }
}
