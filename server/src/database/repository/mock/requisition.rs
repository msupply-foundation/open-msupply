use crate::database::repository::{
    MockRepository, Repository, RepositoryError, RequisitionRepository,
};
use crate::database::schema::RequisitionRow;

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct RequisitionMockRepository {
    mock_data: Arc<Mutex<HashMap<String, RequisitionRow>>>,
}

impl Repository for RequisitionMockRepository {}
impl MockRepository for RequisitionMockRepository {}

impl RequisitionMockRepository {
    pub fn new(
        mock_data: Arc<Mutex<HashMap<String, RequisitionRow>>>,
    ) -> RequisitionMockRepository {
        RequisitionMockRepository { mock_data }
    }
}

#[async_trait]
impl RequisitionRepository for RequisitionMockRepository {
    async fn insert_one(&self, requisition: &RequisitionRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(requisition.id.clone()), requisition.clone());

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<RequisitionRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(requisition) => Ok(requisition.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find requisition {}", id)),
            }),
        }
    }
}
