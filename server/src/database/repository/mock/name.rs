use crate::database::repository::RepositoryError;
use crate::database::schema::NameRow;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct NameRepository {
    mock_data: Arc<Mutex<HashMap<String, NameRow>>>,
}

impl NameRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, NameRow>>>) -> NameRepository {
        NameRepository { mock_data }
    }

    pub async fn insert_one(&self, name: &NameRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(name.id.clone()), name.clone());

        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<NameRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(name) => Ok(name.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find name {}", id)),
            }),
        }
    }
}
