use crate::database::repository::{
    ItemLineRepository, MockRepository, Repository, RepositoryError,
};
use crate::database::schema::ItemLineRow;

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct ItemLineMockRepository {
    mock_data: Arc<Mutex<HashMap<String, ItemLineRow>>>,
}

impl Repository for ItemLineMockRepository {}
impl MockRepository for ItemLineMockRepository {}

impl ItemLineMockRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, ItemLineRow>>>) -> ItemLineMockRepository {
        ItemLineMockRepository { mock_data }
    }
}

#[async_trait]
impl ItemLineRepository for ItemLineMockRepository {
    async fn insert_one(&self, item_line: &ItemLineRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(item_line.id.clone()), item_line.clone());

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<ItemLineRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(item_line) => Ok(item_line.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find item_line {}", id)),
            }),
        }
    }
}
