use crate::database::repository::{
    RepositoryError, RequisitionRepository, StorageConnectionManager,
};
use crate::database::schema::RequisitionRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct RequisitionLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for RequisitionLoader {
    type Value = RequisitionRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = RequisitionRepository::new(&connection);
        Ok(repo
            .find_many_by_id(keys)
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
