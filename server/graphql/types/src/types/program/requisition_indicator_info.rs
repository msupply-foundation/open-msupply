use async_graphql::*;
use chrono::{DateTime, Utc};
use dataloader::DataLoader;
use graphql_core::{
    loader::{IndicatorColumnByIdLoader, NameByIdLoader, NameByIdLoaderInput},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use service::requisition::request_requisition::{
    CustomerIndicatorInformation, IndicatorInformation,
};

use crate::types::NameNode;

use super::program_indicator::IndicatorColumnNode;

#[derive(PartialEq, Debug)]
pub struct CustomerIndicatorInformationNode {
    pub customer_indicators: CustomerIndicatorInformation,
}

#[Object]
impl CustomerIndicatorInformationNode {
    pub async fn id(&self) -> &str {
        &self.customer_indicators.id
    }

    pub async fn customer(&self, ctx: &Context<'_>, store_id: String) -> Result<NameNode, Error> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();
        let result = loader
            .load_one(NameByIdLoaderInput::new(
                &store_id,
                &self.customer_indicators.id,
            ))
            .await?;

        result.map(NameNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find name ({})",
                &self.customer_indicators.id
            ))
            .extend(),
        )
    }

    pub async fn datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.customer_indicators.datetime, Utc)
    }

    pub async fn line_id(&self) -> &str {
        &self.customer_indicators.indicator_line_id
    }

    pub async fn indicator_information(&self) -> Vec<RequisitionIndicatorInformationNode> {
        self.customer_indicators
            .indicator_information
            .iter()
            .map(|indicator| RequisitionIndicatorInformationNode {
                requisition_indicator_information: indicator.clone(),
            })
            .collect()
    }
}

impl CustomerIndicatorInformationNode {
    pub fn from_vec(
        customer_indicator_information: Vec<CustomerIndicatorInformation>,
    ) -> Vec<CustomerIndicatorInformationNode> {
        customer_indicator_information
            .into_iter()
            .map(CustomerIndicatorInformationNode::from_domain)
            .collect()
    }

    pub fn from_domain(
        customer_indicator_information: CustomerIndicatorInformation,
    ) -> CustomerIndicatorInformationNode {
        CustomerIndicatorInformationNode {
            customer_indicators: customer_indicator_information,
        }
    }
}

#[derive(Clone)]
pub struct RequisitionIndicatorInformationNode {
    pub requisition_indicator_information: IndicatorInformation,
}

#[Object]
impl RequisitionIndicatorInformationNode {
    pub async fn column(&self, ctx: &Context<'_>) -> Result<IndicatorColumnNode, Error> {
        let loader = ctx.get_loader::<DataLoader<IndicatorColumnByIdLoader>>();

        match loader
            .load_one(self.requisition_indicator_information.column_id.clone())
            .await?
        {
            Some(column) => Ok(IndicatorColumnNode::from_domain(column, "".to_string())),
            None => Err(StandardGraphqlError::InternalError(format!(
                "Cannot find column ({})",
                &self.requisition_indicator_information.column_id
            ))
            .extend()),
        }
    }

    pub async fn value(&self) -> &str {
        &self.requisition_indicator_information.value
    }
}
