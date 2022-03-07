use std::collections::HashMap;

use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::RequisitionLine;
use service::requisition::requisition_supply_status::RequisitionLineSupplyStatus;
use service::service_provider::ServiceProvider;

use super::{IdPairWithPayload, RequisitionAndItemId};

pub struct RequisitionLineSupplyStatusLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<RequisitionAndItemId> for RequisitionLineSupplyStatusLoader {
    type Value = RequisitionLineSupplyStatus;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_and_item_id: &[RequisitionAndItemId],
    ) -> Result<HashMap<RequisitionAndItemId, Self::Value>, Self::Error> {
        let service_context = self.service_provider.context()?;

        let (requisition_ids, _) = IdPairWithPayload::extract_unique_ids(requisition_and_item_id);

        let requisition_supply_statuses = self
            .service_provider
            .requisition_service
            .get_requisitions_supply_status(&service_context, requisition_ids)?;

        Ok(requisition_supply_statuses
            .into_iter()
            .map(|status| {
                let requisition_line_row = &status.requisition_line.requisition_line_row;
                (
                    RequisitionAndItemId::new(
                        &requisition_line_row.requisition_id,
                        &requisition_line_row.item_id,
                    ),
                    status,
                )
            })
            .collect())
    }
}

pub struct RequisitionLinesRemainingToSupplyLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<String> for RequisitionLinesRemainingToSupplyLoader {
    type Value = RequisitionLine;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.context()?;

        let requisition_supply_statuses = self
            .service_provider
            .requisition_service
            .get_requisitions_supply_status(&service_context, requisition_ids.to_owned())?;

        let remaining_to_supply =
            RequisitionLineSupplyStatus::lines_remaining_to_supply(requisition_supply_statuses);

        Ok(remaining_to_supply
            .into_iter()
            .map(|status| {
                let requisition_line_row = &status.requisition_line.requisition_line_row;
                (
                    requisition_line_row.requisition_id.clone(),
                    status.requisition_line,
                )
            })
            .collect())
    }
}
