use crate::database::repository::{
    MockRepository, Repository, RepositoryError, RequisitionLineRepository,
};
use crate::database::schema::RequisitionLineRow;

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct RequisitionLineMockRepository {
    mock_data: Arc<Mutex<HashMap<String, RequisitionLineRow>>>,
}

impl Repository for RequisitionLineMockRepository {}
impl MockRepository for RequisitionLineMockRepository {}

impl RequisitionLineMockRepository {
    pub fn new(
        mock_data: Arc<Mutex<HashMap<String, RequisitionLineRow>>>,
    ) -> RequisitionLineMockRepository {
        RequisitionLineMockRepository { mock_data }
    }
}

#[async_trait]
impl RequisitionLineRepository for RequisitionLineMockRepository {
    async fn insert_one(
        &self,
        requisition_line: &RequisitionLineRow,
    ) -> Result<(), RepositoryError> {
        self.mock_data.lock().unwrap().insert(
            String::from(requisition_line.id.clone()),
            requisition_line.clone(),
        );

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<RequisitionLineRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(requisition_line) => Ok(requisition_line.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find requisition_line {}", id)),
            }),
        }
    }

    async fn find_many_by_requisition_id(
        &self,
        requisition_id: &str,
    ) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
        let mut requisition_lines = vec![];
        for (_id, requisition_line) in self.mock_data.lock().unwrap().clone().into_iter() {
            if requisition_line.requisition_id == requisition_id {
                requisition_lines.push(requisition_line);
            }
        }

        Ok(requisition_lines)
    }
}
