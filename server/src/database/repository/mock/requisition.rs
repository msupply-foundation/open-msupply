use crate::database::repository::RepositoryError;
use crate::database::schema::RequisitionRow;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct RequisitionRepository {
    mock_data: Arc<Mutex<HashMap<String, RequisitionRow>>>,
}

impl RequisitionRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, RequisitionRow>>>) -> RequisitionRepository {
        RequisitionRepository { mock_data }
    }

    pub async fn insert_one(&self, requisition: &RequisitionRow) -> Result<(), RepositoryError> {
        self.mock_data
            .lock()
            .unwrap()
            .insert(String::from(requisition.id.clone()), requisition.clone());

        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<RequisitionRow, RepositoryError> {
        match self.mock_data.lock().unwrap().get(&String::from(id)) {
            Some(requisition) => Ok(requisition.clone()),
            None => Err(RepositoryError {
                msg: String::from(format!("Failed to find requisition {}", id)),
            }),
        }
    }
}
