use crate::database::repository::RepositoryError;
use crate::database::schema::{DatabaseRow, ItemLineRow};

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct ItemLineRepository {
    mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>,
}

impl ItemLineRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>) -> ItemLineRepository {
        ItemLineRepository { mock_data }
    }

    pub async fn insert_one(&self, item_line: &ItemLineRow) -> Result<(), RepositoryError> {
        self.mock_data.lock().unwrap().insert(
            item_line.id.to_string(),
            DatabaseRow::ItemLine(item_line.clone()),
        );
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<ItemLineRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&id.to_string()) {
            Some(DatabaseRow::ItemLine(item_line)) => Ok(item_line.clone()),
            _ => Err(RepositoryError {
                msg: String::from(format!("Failed to find item_line {}", id)),
            }),
        }
    }
}
