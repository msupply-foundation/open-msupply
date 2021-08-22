use crate::database::repository::RepositoryError;
use crate::database::schema::{DatabaseRow, RequisitionRow};

use log::info;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct RequisitionRepository {
    mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>,
}

impl RequisitionRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>) -> RequisitionRepository {
        RequisitionRepository { mock_data }
    }

    pub async fn insert_one(&self, requisition: &RequisitionRow) -> Result<(), RepositoryError> {
        info!(
            "Inserting requisition record (requisition.id={})",
            requisition.id
        );
        self.mock_data.lock().unwrap().insert(
            requisition.id.to_string(),
            DatabaseRow::Requisition(requisition.clone()),
        );
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<RequisitionRow, RepositoryError> {
        info!("Querying requisition record (requisition.id={})", id);
        match self.mock_data.lock().unwrap().get(&id.to_string()) {
            Some(DatabaseRow::Requisition(requisition)) => Ok(requisition.clone()),
            _ => Err(RepositoryError {
                msg: String::from(format!(
                    "Failed to find requisition record (requisition.id={})",
                    id
                )),
            }),
        }
    }

    pub async fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<RequisitionRow>, RepositoryError> {
        info!(
            "Querying multiple requisition records (requisition.id=({:?})",
            ids
        );
        let mut requisitions = vec![];
        ids.iter().for_each(|id| {
            if let Some(DatabaseRow::Requisition(requisition)) =
                self.mock_data.lock().unwrap().get(id)
            {
                requisitions.push(requisition.clone());
            }
        });
        Ok(requisitions)
    }
}
