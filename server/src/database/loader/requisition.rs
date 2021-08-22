use crate::database::repository::{RepositoryError, RequisitionRepository};
use crate::database::schema::RequisitionRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct RequisitionLoader {
    pub requisition_repository: RequisitionRepository,
}

#[async_trait::async_trait]
impl Loader<String> for RequisitionLoader {
    type Value = RequisitionRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        Ok(self
            .requisition_repository
            .find_many_by_id(keys)
            .await
            .unwrap()
            .iter()
            .map(|requisition: &RequisitionRow| {
                let requisition_id = requisition.id.clone();
                let requisition = requisition.clone();
                (requisition_id, requisition)
            })
            .collect())
    }
}
