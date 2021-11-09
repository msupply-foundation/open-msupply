use repository::{
    repository::{RepositoryError, RequisitionLineRepository, StorageConnectionManager},
    schema::RequisitionLineRow,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct RequisitionLineLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for RequisitionLineLoader {
    type Value = RequisitionLineRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = RequisitionLineRepository::new(&connection);
        Ok(repo
            .find_many_by_id(keys)
            .unwrap()
            .iter()
            .map(|requisition_line: &RequisitionLineRow| {
                let requisition_line_id = requisition_line.id.clone();
                let requisition_line = requisition_line.clone();
                (requisition_line_id, requisition_line)
            })
            .collect())
    }
}
