use crate::database::repository::{ItemRepository, MockRepository, Repository, RepositoryError};
use crate::database::schema::ItemRow;

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct ItemMockRepository {
    mock_data: Arc<Mutex<HashMap<String, ItemRow>>>,
}

impl Repository for ItemMockRepository {}
impl MockRepository for ItemMockRepository {}

impl ItemMockRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, ItemRow>>>) -> ItemMockRepository {
        ItemMockRepository { mock_data }
    }
}

#[async_trait]
impl ItemRepository for ItemMockRepository {
    async fn insert_one(&self, item: &ItemRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(item.id.clone()), item.clone());

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<ItemRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(item) => Ok(item.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find item {}", id)),
            }),
        }
    }
}
