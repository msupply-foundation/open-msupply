use crate::database::repository::{
    MockRepository, Repository, RepositoryError, TransactLineRepository,
};
use crate::database::schema::TransactLineRow;

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct TransactLineMockRepository {
    mock_data: Arc<Mutex<HashMap<String, TransactLineRow>>>,
}

impl Repository for TransactLineMockRepository {}
impl MockRepository for TransactLineMockRepository {}

impl TransactLineMockRepository {
    pub fn new(
        mock_data: Arc<Mutex<HashMap<String, TransactLineRow>>>,
    ) -> TransactLineMockRepository {
        TransactLineMockRepository { mock_data }
    }
}

#[async_trait]
impl TransactLineRepository for TransactLineMockRepository {
    async fn insert_one(&self, transact_line: &TransactLineRow) -> Result<(), RepositoryError> {
        self.mock_data.lock().unwrap().insert(
            String::from(transact_line.id.clone()),
            transact_line.clone(),
        );

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<TransactLineRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(transact_line) => Ok(transact_line.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find transact_line {}", id)),
            }),
        }
    }

    async fn find_many_by_transact_id(
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
