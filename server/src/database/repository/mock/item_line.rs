use crate::database::repository::RepositoryError;
use crate::database::schema::{DatabaseRow, ItemLineRow};

use log::info;
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
        info!("Inserting item_line record (item_line.id={})", item_line.id);
        self.mock_data.lock().unwrap().insert(
            item_line.id.to_string(),
            DatabaseRow::ItemLine(item_line.clone()),
        );
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<ItemLineRow, RepositoryError> {
        info!("Querying item_line record (item_line.id={})", id);
        match self.mock_data.lock().unwrap().get(&id.to_string()) {
            Some(DatabaseRow::ItemLine(item_line)) => Ok(item_line.clone()),
            _ => Err(RepositoryError {
                msg: String::from(format!(
                    "Failed to find item_line record (item_line.id={})",
                    id
                )),
            }),
        }
    }
}
