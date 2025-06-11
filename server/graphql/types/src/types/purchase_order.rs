use self::dataloader::DataLoader;
use async_graphql::*;
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use graphql_core::loader::PurchaseOrderLinesByPurchaseOrderIdLoader;
use graphql_core::ContextExt;
use repository::PurchaseOrderRow;

use crate::types::PurchaseOrderLineConnector;

#[derive(PartialEq, Debug)]
pub struct PurchaseOrderNode {
    pub purchase_order: PurchaseOrderRow,
}
#[derive(SimpleObject)]
pub struct PurchaseOrderConnector {
    pub total_count: u32,
    pub nodes: Vec<PurchaseOrderNode>,
}

#[Object]
impl PurchaseOrderNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }
    pub async fn delivery_datetime(&self) -> &Option<NaiveDateTime> {
        &self.row().delivery_datetime
    }
    pub async fn status(&self) -> &Option<String> {
        &self.row().status
    }
    pub async fn target_months(&self) -> &Option<f64> {
        &self.row().target_months
    }
    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }
    pub async fn supplier_id(&self) -> &Option<String> {
        &self.row().supplier_id
    }
    pub async fn supplier_discount_percentage(&self) -> &Option<f64> {
        &self.row().supplier_discount_percentage
    }
    pub async fn supplier_discount_amount(&self) -> &Option<f64> {
        &self.row().supplier_discount_amount
    }
    pub async fn donor_link_id(&self) -> &Option<String> {
        &self.row().donor_link_id
    }
    pub async fn reference(&self) -> &str {
        &self.row().reference
    }
    pub async fn currency_id(&self) -> &Option<String> {
        &self.row().currency_id
    }
    pub async fn foreign_exchange_rate(&self) -> &Option<f64> {
        &self.row().foreign_exchange_rate
    }
    pub async fn shipping_method(&self) -> &Option<String> {
        &self.row().shipping_method
    }
    pub async fn sent_datetime(&self) -> &Option<NaiveDateTime> {
        &self.row().sent_datetime
    }
    pub async fn contract_signed_datetime(&self) -> &Option<NaiveDateTime> {
        &self.row().contract_signed_datetime
    }
    pub async fn advance_paid_datetime(&self) -> &Option<NaiveDateTime> {
        &self.row().advance_paid_datetime
    }
    pub async fn received_at_port_datetime(&self) -> &Option<NaiveDate> {
        &self.row().received_at_port_datetime
    }
    pub async fn expected_delivery_datetime(&self) -> &Option<NaiveDate> {
        &self.row().expected_delivery_datetime
    }
    pub async fn supplier_agent(&self) -> &Option<String> {
        &self.row().supplier_agent
    }
    pub async fn authorising_officer_1(&self) -> &Option<String> {
        &self.row().authorising_officer_1
    }
    pub async fn authorising_officer_2(&self) -> &Option<String> {
        &self.row().authorising_officer_2
    }
    pub async fn additional_instructions(&self) -> &Option<String> {
        &self.row().additional_instructions
    }
    pub async fn heading_message(&self) -> &Option<String> {
        &self.row().heading_message
    }
    pub async fn agent_commission(&self) -> &Option<f64> {
        &self.row().agent_commission
    }
    pub async fn document_charge(&self) -> &Option<f64> {
        &self.row().document_charge
    }
    pub async fn communications_charge(&self) -> &Option<f64> {
        &self.row().communications_charge
    }
    pub async fn insurance_charge(&self) -> &Option<f64> {
        &self.row().insurance_charge
    }
    pub async fn freight_charge(&self) -> &Option<f64> {
        &self.row().freight_charge
    }
    pub async fn freight_conditions(&self) -> &Option<String> {
        &self.row().freight_conditions
    }
    pub async fn store_id(&self) -> &str {
        &self.row().store_id
    }

    pub async fn lines(&self, ctx: &Context<'_>) -> Result<PurchaseOrderLineConnector> {
        let loader = ctx.get_loader::<DataLoader<PurchaseOrderLinesByPurchaseOrderIdLoader>>();
        let result_option = loader.load_one(self.row().id.clone()).await?;

        let result = result_option.unwrap_or(vec![]);
        Ok(PurchaseOrderLineConnector::from_vec(result))
    }
}

impl PurchaseOrderNode {
    pub fn row(&self) -> &PurchaseOrderRow {
        &self.purchase_order
    }
}
