use crate::database::repository::RepositoryError;
use crate::database::schema::TransactLineRow;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct TransactLineRepository {
    mock_data: Arc<Mutex<HashMap<String, TransactLineRow>>>,
}

impl TransactLineRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, TransactLineRow>>>) -> TransactLineRepository {
        TransactLineRepository { mock_data }
    }

    pub async fn insert_one(&self, transact_line: &TransactLineRow) -> Result<(), RepositoryError> {
        self.mock_data.lock().unwrap().insert(
            String::from(transact_line.id.clone()),
            transact_line.clone(),
        );

        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<TransactLineRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(transact_line) => Ok(transact_line.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find transact_line {}", id)),
            }),
        }
    }

    pub async fn find_many_by_transact_id(
        &self,
        transact_id: &str,
    ) -> Result<Vec<TransactLineRow>, RepositoryError> {
        let mut transact_lines = vec![];
        for (_id, transact_line) in self.mock_data.lock().unwrap().clone().into_iter() {
            if transact_line.transact_id == transact_id {
                transact_lines.push(transact_line);
            }
        }

        Ok(transact_lines)
    }
}
