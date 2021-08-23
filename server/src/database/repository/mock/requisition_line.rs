use crate::database::repository::RepositoryError;
use crate::database::schema::{DatabaseRow, RequisitionLineRow};

use log::info;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct RequisitionLineRepository {
    mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>,
}

impl RequisitionLineRepository {
    pub fn new(mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>>) -> RequisitionLineRepository {
        RequisitionLineRepository { mock_data }
    }

    pub async fn insert_one(
        &self,
        requisition_line: &RequisitionLineRow,
    ) -> Result<(), RepositoryError> {
        info!(
            "Inserting requisition_line record (requisition_line.id={})",
            requisition_line.id
        );
        self.mock_data.lock().unwrap().insert(
            requisition_line.id.to_string(),
            DatabaseRow::RequisitionLine(requisition_line.clone()),
        );
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<RequisitionLineRow, RepositoryError> {
        info!("Querying requisition_line record (id={})", id);
        match self.mock_data.lock().unwrap().get(&id.to_string()) {
            Some(DatabaseRow::RequisitionLine(requisition_line)) => Ok(requisition_line.clone()),
            _ => Err(RepositoryError {
                msg: String::from(format!(
                    "Failed to find requisition_line record (requisition_line.id={})",
                    id
                )),
            }),
        }
    }

    pub async fn find_many_by_requisition_id(
        &self,
        requisition_id: &str,
    ) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
        info!(
            "Querying requisition_line records (requisition_line.requisition_id={})",
            requisition_id
        );
        let mut requisition_lines = vec![];
        self.mock_data
            .lock()
            .unwrap()
            .clone()
            .into_iter()
            .for_each(|(_id, row)| {
                if let DatabaseRow::RequisitionLine(requisition_line) = row {
                    if requisition_line.requisition_id == requisition_id {
                        requisition_lines.push(requisition_line);
                    }
                }
            });
        Ok(requisition_lines)
    }
}
