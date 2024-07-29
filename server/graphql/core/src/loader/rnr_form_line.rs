use std::collections::HashMap;

use async_graphql::dataloader::*;
use repository::{RnRFormLineRow, RnRFormLineRowRepository, StorageConnectionManager};

use crate::standard_graphql_error::StandardGraphqlError;

pub struct RnRFormLinesByRnRFormIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for RnRFormLinesByRnRFormIdLoader {
    type Value = Vec<RnRFormLineRow>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        rnr_form_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repository = RnRFormLineRowRepository::new(&connection);

        let rnr_form_lines = repository
            .find_many_by_rnr_form_ids(rnr_form_ids.iter().map(String::clone).collect())
            .map_err(StandardGraphqlError::from_repository_error)?;

        let mut result: HashMap<String, Vec<RnRFormLineRow>> = HashMap::new();
        for rnr_form_line in rnr_form_lines {
            let list = result.entry(rnr_form_line.rnr_form_id.clone()).or_default();
            list.push(rnr_form_line);
        }
        Ok(result)
    }
}
