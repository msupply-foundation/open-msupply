use crate::database::repository::RepositoryError;
use crate::database::schema::{DatabaseRow, NameRow};

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct NameRepository {
    mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>,
}

impl NameRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>) -> NameRepository {
        NameRepository { mock_data }
    }

    pub async fn insert_one(&self, name: &NameRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(name.id.to_string(), DatabaseRow::Name(name.clone()));
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<NameRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&id.to_string()) {
            Some(DatabaseRow::Name(name)) => Ok(name.clone()),
            _ => Err(RepositoryError {
                msg: String::from(format!("Failed to find name {}", id)),
            }),
        }
    }
}
