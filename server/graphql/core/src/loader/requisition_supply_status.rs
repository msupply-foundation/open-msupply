use std::collections::HashMap;

use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::RequisitionLine;
use service::requisition::requisition_supply_status::RequisitionLineSupplyStatus;
use service::service_provider::ServiceProvider;

use super::RequisitionAndItemId;

pub struct RequisitionLineSupplyStatusLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<RequisitionAndItemId> for RequisitionLineSupplyStatusLoader {
    type Value = RequisitionLineSupplyStatus;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_and_item_id: &[RequisitionAndItemId],
    ) -> Result<HashMap<RequisitionAndItemId, Self::Value>, Self::Error> {
        let service_provider = self.service_provider.clone();
        let requisition_and_item_id = requisition_and_item_id.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<
                HashMap<RequisitionAndItemId, RequisitionLineSupplyStatus>,
                async_graphql::Error,
            > {
                let service_context = service_provider.basic_context()?;

                let requisition_ids = util::dedup_iter(
                    requisition_and_item_id
                        .iter()
                        .map(|input| input.requisition_id.clone()),
                );

                let requisition_supply_statuses = service_provider
                    .requisition_service
                    .get_requisitions_supply_status(&service_context, requisition_ids)?;

                Ok(requisition_supply_statuses
                    .into_iter()
                    .map(|status| {
                        let requisition_line_row = &status.requisition_line.requisition_line_row;
                        let item_row = &status.requisition_line.item_row;
                        (
                            RequisitionAndItemId::new(
                                &requisition_line_row.requisition_id,
                                &item_row.id,
                            ),
                            status,
                        )
                    })
                    .collect())
            },
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Loader blocking task failed: {e}")))?
    }
}

pub struct RequisitionLinesRemainingToSupplyLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for RequisitionLinesRemainingToSupplyLoader {
    type Value = Vec<RequisitionLine>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_provider = self.service_provider.clone();
        let requisition_ids = requisition_ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Vec<RequisitionLine>>, async_graphql::Error> {
                let service_context = service_provider.basic_context()?;

                let requisition_supply_statuses = service_provider
                    .requisition_service
                    .get_requisitions_supply_status(&service_context, requisition_ids)?;

                let remaining_to_supply = RequisitionLineSupplyStatus::lines_remaining_to_supply(
                    requisition_supply_statuses,
                );

                let mut result: HashMap<String, Vec<RequisitionLine>> = HashMap::new();
                for supply_status in remaining_to_supply {
                    let requisition_line = supply_status.requisition_line;
                    let list = result
                        .entry(requisition_line.requisition_line_row.requisition_id.clone())
                        .or_default();
                    list.push(requisition_line);
                }
                Ok(result)
            },
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Loader blocking task failed: {e}")))?
    }
}
