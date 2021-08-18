use crate::database::repository::RepositoryError;
use crate::database::schema::{DatabaseRow, TransactLineRow};

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct TransactLineRepository {
    mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>,
}

impl TransactLineRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>) -> TransactLineRepository {
        TransactLineRepository { mock_data }
    }

    pub async fn insert_one(&self, transact_line: &TransactLineRow) -> Result<(), RepositoryError> {
        self.mock_data.lock().unwrap().insert(
            transact_line.id.to_string(),
            DatabaseRow::TransactLine(transact_line.clone()),
        );
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<TransactLineRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&id.to_string()) {
            Some(DatabaseRow::TransactLine(transact_line)) => Ok(transact_line.clone()),
            _ => Err(RepositoryError {
                msg: String::from(format!("Failed to find transact_line {}", id)),
            }),
        }
    }

    pub async fn find_many_by_transact_id(
        &self,
        transact_id: &str,
    ) -> Result<Vec<TransactLineRow>, RepositoryError> {
        let mut transact_lines = vec![];
        self.mock_data
            .lock()
            .unwrap()
            .clone()
            .into_iter()
            .for_each(|(_id, row)| {
                if let DatabaseRow::TransactLine(transact_line) = row {
                    if transact_line.transact_id == transact_id {
                        transact_lines.push(transact_line);
                    }
                }
            });
        Ok(transact_lines)
    }
}
