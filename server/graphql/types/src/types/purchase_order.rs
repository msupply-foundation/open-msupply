use self::dataloader::DataLoader;
use crate::types::{
    CurrencyNode, NameNode, PurchaseOrderLineConnector, StoreNode, SyncFileReferenceConnector,
    UserNode,
};
use async_graphql::*;
use chrono::{DateTime, NaiveDate, Utc};
use graphql_core::loader::{CurrencyByIdLoader, PurchaseOrderLinesByPurchaseOrderIdLoader};
use graphql_core::loader::{
    NameByIdLoader, NameByIdLoaderInput, StoreByIdLoader, SyncFileReferenceLoader, UserLoader,
};
use graphql_core::ContextExt;
use repository::{PurchaseOrder, PurchaseOrderRow, PurchaseOrderStatsRow};
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct PurchaseOrderNode {
    pub purchase_order: PurchaseOrderRow,
    pub stats: Option<PurchaseOrderStatsRow>,
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

        if let Some(user_id) = self.row().created_by.clone() {
            return Ok(loader.load_one(user_id).await?.map(UserNode::from_domain));
        }

        return Ok(None);
    }

    pub async fn order_total_after_discount(&self) -> f64 {
        match &self.stats {
            Some(stats) => stats.order_total_after_discount,
            None => 0.0,
        }
    }

    pub async fn order_total_before_discount(&self) -> f64 {
        match &self.stats {
            Some(stats) => stats.order_total_before_discount,
            None => 0.0,
        }
    }

    pub async fn supplier(&self, ctx: &Context<'_>) -> Result<Option<NameNode>> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();
        let name = loader
            .load_one(NameByIdLoaderInput::new(
                &self.row().store_id,
                &self.row().supplier_name_id,
            ))
            .await?
            .map(NameNode::from_domain);
        return Ok(name);
    }
    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }
    pub async fn confirmed_datetime(&self) -> Option<DateTime<Utc>> {
        let confirmed_datetime = self.row().confirmed_datetime;
        confirmed_datetime.map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
    pub async fn status(&self) -> PurchaseOrderNodeStatus {
        PurchaseOrderNodeStatus::from(self.row().status.clone())
    }
    pub async fn target_months(&self) -> &Option<f64> {
        &self.row().target_months
    }
    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    pub async fn donor(&self, ctx: &Context<'_>) -> Result<Option<NameNode>> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();
        if let Some(donor_id) = self.row().donor_id.clone() {
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
    pub async fn sent_datetime(&self) -> Option<DateTime<Utc>> {
        let sent_datetime = self.row().sent_datetime;
        sent_datetime.map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
    pub async fn contract_signed_date(&self) -> &Option<NaiveDate> {
        &self.row().contract_signed_date
    }
    pub async fn advance_paid_date(&self) -> &Option<NaiveDate> {
        &self.row().advance_paid_date
    }
    pub async fn received_at_port_date(&self) -> &Option<NaiveDate> {
        &self.row().received_at_port_date
    }
    pub async fn requested_delivery_date(&self) -> &Option<NaiveDate> {
        &self.row().requested_delivery_date
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

    pub async fn supplier_discount_amount(&self) -> f64 {
        let line_total_before_discount = match &self.stats {
            Some(stats) => stats.order_total_before_discount,
            None => 0.0,
        };

        let discount_percentage = self.row().supplier_discount_percentage.unwrap_or(0.0) / 100.0;

        line_total_before_discount * discount_percentage
    }
    pub async fn supplier_discount_percentage(&self) -> &Option<f64> {
        &self.row().supplier_discount_percentage
    }
    pub async fn request_approval_datetime(&self) -> Option<DateTime<Utc>> {
        let request_approval_datetime = self.row().request_approval_datetime;
        request_approval_datetime.map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
    pub async fn finalised_datetime(&self) -> Option<DateTime<Utc>> {
        let finalised_datetime = self.row().finalised_datetime;
        finalised_datetime.map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    pub async fn documents(&self, ctx: &Context<'_>) -> Result<SyncFileReferenceConnector> {
        let purchase_order_id = &self.row().id;
        let loader = ctx.get_loader::<DataLoader<SyncFileReferenceLoader>>();
        let result_option = loader.load_one(purchase_order_id.to_string()).await?;

        let documents = SyncFileReferenceConnector::from_vec(result_option.unwrap_or(vec![]));

        Ok(documents)
    }

    pub async fn lines(&self, ctx: &Context<'_>) -> Result<PurchaseOrderLineConnector> {
        let loader = ctx.get_loader::<DataLoader<PurchaseOrderLinesByPurchaseOrderIdLoader>>();
        let result_option = loader.load_one(self.row().id.clone()).await?;

        let result = result_option.unwrap_or(vec![]);
        Ok(PurchaseOrderLineConnector::from_vec(result))
    }

    pub async fn currency(&self, ctx: &Context<'_>) -> Result<Option<CurrencyNode>> {
        let currency_id = match &self.row().currency_id {
            Some(currency_id) => currency_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<CurrencyByIdLoader>>();

        let result = loader
            .load_one(currency_id.clone())
            .await?
            .map(CurrencyNode::from_domain);

        Ok(result)
    }
}

impl PurchaseOrderNode {
    pub fn from_domain(purchase_order: PurchaseOrder) -> PurchaseOrderNode {
        PurchaseOrderNode {
            purchase_order: purchase_order.purchase_order_row,
            stats: purchase_order.purchase_order_stats_row,
        }
    }
}

impl PurchaseOrderNode {
    pub fn row(&self) -> &PurchaseOrderRow {
        &self.purchase_order
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::db_diesel::purchase_order_row
::PurchaseOrderStatus")]
pub enum PurchaseOrderNodeStatus {
    New,
    RequestApproval,
    Confirmed,
    Sent,
    Finalised,
}

impl PurchaseOrderConnector {
    pub fn from_domain(purchase_orders: ListResult<PurchaseOrder>) -> PurchaseOrderConnector {
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
