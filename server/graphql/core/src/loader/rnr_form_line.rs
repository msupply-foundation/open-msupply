use std::collections::HashMap;

use async_graphql::dataloader::*;
use repository::{
    EqualFilter, RnRFormLine, RnRFormLineFilter, RnRFormLineRepository, StorageConnectionManager,
};

use crate::standard_graphql_error::StandardGraphqlError;

pub struct RnRFormLinesByRnRFormIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for RnRFormLinesByRnRFormIdLoader {
    type Value = Vec<RnRFormLine>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        rnr_form_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let rnr_form_ids = rnr_form_ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Vec<RnRFormLine>>, async_graphql::Error> {
                let connection = connection_manager.connection()?;
                let repository = RnRFormLineRepository::new(&connection);

                let rnr_form_lines = repository
                    .query_by_filter(
                        RnRFormLineFilter::new()
                            .rnr_form_id(EqualFilter::equal_any(rnr_form_ids)),
                    )
                    .map_err(StandardGraphqlError::from_repository_error)?;

                let mut result: HashMap<String, Vec<RnRFormLine>> = HashMap::new();
                for rnr_form_line in rnr_form_lines {
                    let list = result
                        .entry(rnr_form_line.rnr_form_line_row.rnr_form_id.clone())
                        .or_default();
                    list.push(rnr_form_line);
                }
                Ok(result)
            },
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Loader blocking task failed: {e}")))?
    }
}
