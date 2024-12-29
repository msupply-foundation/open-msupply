use async_graphql::*;
use chrono::{DateTime, Utc};
use dataloader::DataLoader;
use graphql_core::{
    loader::{NameByIdLoader, NameByIdLoaderInput},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use service::requisition::request_requisition::RequisitionItemInformation;

use super::NameNode;

#[derive(PartialEq, Debug)]
pub struct RequisitionItemInformationNode {
    pub requisition_item_information: RequisitionItemInformation,
}

#[Object]
impl RequisitionItemInformationNode {
    pub async fn id(&self) -> &str {
        &self.requisition_item_information.id
    }

    pub async fn amc_in_units(&self) -> f64 {
        self.requisition_item_information.amc_in_units
    }

    pub async fn stock_in_units(&self) -> f64 {
        self.requisition_item_information.stock_in_units
    }

    pub async fn adjustments_in_units(&self) -> f64 {
        self.requisition_item_information.adjustments_in_units
    }

    pub async fn date_range(&self) -> Option<DateTime<Utc>> {
        self.requisition_item_information
            .date_range
            .map(|naive_date| DateTime::<Utc>::from_naive_utc_and_offset(naive_date, Utc))
    }

    pub async fn outgoing_in_units(&self) -> f64 {
        self.requisition_item_information.outgoing_in_units
    }

    pub async fn name(&self, ctx: &Context<'_>, store_id: String) -> Result<NameNode> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        let response_option = loader
            .load_one(NameByIdLoaderInput::new(
                &store_id,
                &self.requisition_item_information.id,
            ))
            .await?;

        response_option.map(NameNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find name with id {}",
                self.requisition_item_information.id
            ))
            .extend(),
        )
    }
}

impl RequisitionItemInformationNode {
    pub fn from_domain(requisition_item_information: RequisitionItemInformation) -> Self {
        RequisitionItemInformationNode {
            requisition_item_information,
        }
    }

    pub fn from_vec(requisition_item_information: Vec<RequisitionItemInformation>) -> Vec<Self> {
        requisition_item_information
            .into_iter()
            .map(RequisitionItemInformationNode::from_domain)
            .collect()
    }
}
