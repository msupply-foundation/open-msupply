use std::collections::HashMap;

use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::EqualFilter;
use repository::{Requisition, RequisitionFilter};
use service::service_provider::ServiceProvider;

use crate::standard_graphql_error::StandardGraphqlError;

pub struct RequisitionsByIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<String> for RequisitionsByIdLoader {
    type Value = Requisition;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let filter = RequisitionFilter::new().id(EqualFilter::equal_any(
            requisition_ids.iter().map(String::clone).collect(),
        ));

        let requisitions = self
            .service_provider
            .requisition_service
            .get_requisitions(&service_context, None, None, Some(filter), None)
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(requisitions
            .rows
            .into_iter()
            .map(|requisition| (requisition.requisition_row.id.clone(), requisition))
            .collect())
    }
}
