use std::collections::HashMap;

use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::EqualFilter;
use repository::{RequisitionLine, RequisitionLineFilter};
use service::service_provider::ServiceProvider;

use crate::standard_graphql_error::StandardGraphqlError;

use super::{IdPair, RequisitionAndItemId};

pub struct RequisitionLinesByRequisitionIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<String> for RequisitionLinesByRequisitionIdLoader {
    type Value = Vec<RequisitionLine>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let filter = RequisitionLineFilter::new().requisition_id(EqualFilter::equal_any(
            requisition_ids.iter().map(String::clone).collect(),
        ));

        let requisition_lines = self
            .service_provider
            .requisition_line_service
            .get_requisition_lines(&service_context, Some(filter))
            .map_err(StandardGraphqlError::from_list_error)?;

        let mut result: HashMap<String, Vec<RequisitionLine>> = HashMap::new();
        for requisition_line in requisition_lines.rows {
            let list = result
                .entry(requisition_line.requisition_line_row.requisition_id.clone())
                .or_default();
            list.push(requisition_line);
        }
        Ok(result)
    }
}

pub struct LinkedRequisitionLineLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<RequisitionAndItemId> for LinkedRequisitionLineLoader {
    type Value = RequisitionLine;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_and_item_id: &[RequisitionAndItemId],
    ) -> Result<HashMap<RequisitionAndItemId, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let (requisition_ids, item_ids) = IdPair::extract_unique_ids(requisition_and_item_id);

        let filter = RequisitionLineFilter::new()
            .requisition_id(EqualFilter::equal_any(requisition_ids))
            .item_id(EqualFilter::equal_any(item_ids));

        let requisition_lines = self
            .service_provider
            .requisition_line_service
            .get_requisition_lines(&service_context, Some(filter))
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(requisition_lines
            .rows
            .into_iter()
            .map(|line| {
                (
                    RequisitionAndItemId::new(
                        &line.requisition_line_row.requisition_id,
                        &line.item_row.id,
                    ),
                    line,
                )
            })
            .collect())
    }
}
