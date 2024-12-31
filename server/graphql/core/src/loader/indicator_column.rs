use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{
    indicator_column::{IndicatorColumnFilter, IndicatorColumnRepository},
    EqualFilter, IndicatorColumnRow,
};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct IndicatorColumnByIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for IndicatorColumnByIdLoader {
    type Value = IndicatorColumnRow;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        column_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let indicator_columns = IndicatorColumnRepository::new(&service_context.connection)
            .query_by_filter(IndicatorColumnFilter::new().id(EqualFilter::equal_any(
                column_ids.iter().map(String::clone).collect(),
            )))?;

        Ok(indicator_columns
            .into_iter()
            .map(|column| (column.id.clone(), column))
            .collect())
    }
}
