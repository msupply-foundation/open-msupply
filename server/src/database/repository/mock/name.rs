use crate::database::repository::{MockRepository, NameRepository, Repository, RepositoryError};

use crate::database::schema::NameRow;

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct NameMockRepository {
    mock_data: Arc<Mutex<HashMap<String, NameRow>>>,
}

impl Repository for NameMockRepository {}
impl MockRepository for NameMockRepository {}

impl NameMockRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, NameRow>>>) -> NameMockRepository {
        NameMockRepository { mock_data }
    }
}

#[async_trait]
impl NameRepository for NameMockRepository {
    async fn insert_one(&self, name: &NameRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(name.id.clone()), name.clone());

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<NameRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(name) => Ok(name.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find name {}", id)),
            }),
        }
    }
}
