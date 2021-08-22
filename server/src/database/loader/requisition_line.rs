use crate::database::repository::{RepositoryError, RequisitionLineRepository};
use crate::database::schema::RequisitionLineRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct RequisitionLineLoader {
    pub requisition_line_repository: RequisitionLineRepository,
}

#[async_trait::async_trait]
impl Loader<String> for RequisitionLineLoader {
    type Value = RequisitionLineRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        Ok(self
            .requisition_line_repository
            .find_many_by_id(keys)
            .await
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
