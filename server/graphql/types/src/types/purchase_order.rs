use self::dataloader::DataLoader;
use async_graphql::*;
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use graphql_core::loader::{
    NameByIdLoader, NameByIdLoaderInput, PurchaseOrderLinesByPurchaseOrderIdLoader,
    StoreByIdLoader, UserLoader,
};
use graphql_core::ContextExt;
use repository::{PurchaseOrderRow, PurchaseOrderStatus};
use service::ListResult;

use crate::types::{NameNode, PurchaseOrderLineConnector, StoreNode, UserNode};

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
    pub async fn number(&self) -> &i64 {
        &self.row().purchase_order_number
    }
    pub async fn store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();
        Ok(loader
            .load_one(self.row().store_id.clone())
            .await?
            .map(StoreNode::from_domain))
    }
    pub async fn user(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();

        if let Some(user_id) = self.row().user_id.clone() {
            return Ok(loader.load_one(user_id).await?.map(UserNode::from_domain));
        }

        return Ok(None);
    }
    pub async fn supplier_name_link_id(&self) -> &Option<String> {
        &self.row().supplier_name_link_id
    }
    pub async fn supplier(&self, ctx: &Context<'_>) -> Result<Option<NameNode>> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();
        if let Some(supplier_id) = self.row().supplier_name_link_id.clone() {
            return Ok(loader
                .load_one(NameByIdLoaderInput::new(&self.row().store_id, &supplier_id))
                .await?
                .map(NameNode::from_domain));
        }
        return Ok(None);
    }
    pub async fn created_date(&self) -> NaiveDate {
        self.row().created_date
    }
    pub async fn delivered_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .delivered_datetime
            .map(|dt| DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc))
    }
    pub async fn confirmed_date(&self) -> &Option<NaiveDate> {
        &self.row().confirmed_date
    }
    pub async fn status(&self) -> PurchaseOrderNodeStatus {
        PurchaseOrderNodeStatus::from_domain(self.row().status.clone())
    }
    pub async fn target_months(&self) -> &Option<f64> {
        &self.row().target_months
    }
    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }
    pub async fn supplier_discount_percentage(&self) -> &Option<f64> {
        &self.row().supplier_discount_percentage
    }
    pub async fn supplier_discount_amount(&self) -> &Option<f64> {
        &self.row().supplier_discount_amount
    }
    pub async fn donor(&self, ctx: &Context<'_>) -> Result<Option<NameNode>> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();
        if let Some(donor_id) = self.row().donor_link_id.clone() {
            return Ok(loader
                .load_one(NameByIdLoaderInput::new(&self.row().store_id, &donor_id))
                .await?
                .map(NameNode::from_domain));
        }
        return Ok(None);
    }
    pub async fn reference(&self) -> &Option<String> {
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
    pub async fn received_at_port_date(&self) -> &Option<NaiveDate> {
        &self.row().received_at_port_date
    }
    pub async fn expected_delivery_date(&self) -> &Option<NaiveDate> {
        &self.row().expected_delivery_date
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

    pub async fn lines(&self, ctx: &Context<'_>) -> Result<PurchaseOrderLineConnector> {
        let loader = ctx.get_loader::<DataLoader<PurchaseOrderLinesByPurchaseOrderIdLoader>>();
        let result_option = loader.load_one(self.row().id.clone()).await?;

        let result = result_option.unwrap_or(vec![]);
        Ok(PurchaseOrderLineConnector::from_vec(result))
    }
}

impl PurchaseOrderNode {
    pub fn from_domain(purchase_order: PurchaseOrderRow) -> PurchaseOrderNode {
        PurchaseOrderNode { purchase_order }
    }
}

impl PurchaseOrderNode {
    pub fn row(&self) -> &PurchaseOrderRow {
        &self.purchase_order
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum PurchaseOrderNodeStatus {
    New,
    Confirmed,
    Authorised,
    Finalised,
}

impl PurchaseOrderNodeStatus {
    pub fn from_domain(status: PurchaseOrderStatus) -> PurchaseOrderNodeStatus {
        use PurchaseOrderStatus::*;
        match status {
            New => PurchaseOrderNodeStatus::New,
            Confirmed => PurchaseOrderNodeStatus::Confirmed,
            Authorised => PurchaseOrderNodeStatus::Authorised,
            Finalised => PurchaseOrderNodeStatus::Finalised,
        }
    }

    pub fn to_domain(self) -> PurchaseOrderStatus {
        use PurchaseOrderNodeStatus::*;
        match self {
            New => PurchaseOrderStatus::New,
            Confirmed => PurchaseOrderStatus::Confirmed,
            Authorised => PurchaseOrderStatus::Authorised,
            Finalised => PurchaseOrderStatus::Finalised,
        }
    }
}

impl PurchaseOrderConnector {
    pub fn from_domain(purchase_orders: ListResult<PurchaseOrderRow>) -> PurchaseOrderConnector {
        PurchaseOrderConnector {
            total_count: purchase_orders.count,
            nodes: purchase_orders
                .rows
                .into_iter()
                .map(PurchaseOrderNode::from_domain)
                .collect(),
        }
    }
}
