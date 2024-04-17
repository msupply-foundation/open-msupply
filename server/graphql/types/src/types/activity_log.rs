use async_graphql::{dataloader::DataLoader, *};
use chrono::DateTime;
use chrono::Utc;
use graphql_core::{
    loader::{StoreByIdLoader, UserLoader},
    ContextExt,
};
use repository::{activity_log::ActivityLog, ActivityLogRow, ActivityLogType};
use service::ListResult;

use super::{StoreNode, UserNode};

#[derive(PartialEq, Debug)]
pub struct ActivityLogNode {
    activity_log: ActivityLog,
}

#[derive(SimpleObject)]
pub struct ActivityLogConnector {
    total_count: u32,
    nodes: Vec<ActivityLogNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum ActivityLogNodeType {
    UserLoggedIn,
    InvoiceCreated,
    InvoiceDeleted,
    InvoiceNumberAllocated,
    InvoiceStatusAllocated,
    InvoiceStatusPicked,
    InvoiceStatusShipped,
    InvoiceStatusDelivered,
    InvoiceStatusVerified,
    InventoryAdjustment,
    StocktakeCreated,
    StocktakeDeleted,
    StocktakeStatusFinalised,
    RequisitionCreated,
    RequisitionDeleted,
    RequisitionNumberAllocated,
    RequisitionStatusSent,
    RequisitionStatusFinalised,
    StockLocationChange,
    StockCostPriceChange,
    StockSellPriceChange,
    StockExpiryDateChange,
    StockBatchChange,
    StockOnHold,
    StockOffHold,
    Repack,
    PrescriptionCreated,
    PrescriptionDeleted,
    PrescriptionStatusPicked,
    PrescriptionStatusVerified,
    SensorLocationChanged,
    AssetCreated,
    AssetUpdated,
    AssetDeleted,
    AssetLogCreated,
    AssetCatalogueItemCreated,
    QuantityForLineHasBeenSetToZero,
    AssetCatalogueItemPropertyCreated,
}

#[Object]
impl ActivityLogNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn r#type(&self) -> ActivityLogNodeType {
        ActivityLogNodeType::from_domain(&self.row().r#type)
    }

    pub async fn store_id(&self) -> &Option<String> {
        &self.row().store_id
    }

    pub async fn record_id(&self) -> &Option<String> {
        &self.row().record_id
    }

    pub async fn datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().datetime, Utc)
    }

    pub async fn to(&self) -> &Option<String> {
        &self.row().changed_to
    }

    pub async fn from(&self) -> &Option<String> {
        &self.row().changed_from
    }

    pub async fn user(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();

        let user_id = match &self.row().user_id {
            Some(user_id) => user_id,
            None => return Ok(None),
        };

        let result = loader
            .load_one(user_id.clone())
            .await?
            .map(UserNode::from_domain);

        Ok(result)
    }

    pub async fn store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();

        let store_id = match &self.row().store_id {
            Some(store_id) => store_id,
            None => return Ok(None),
        };

        let result = loader.load_one(store_id.clone()).await?.unwrap();

        Ok(Some(StoreNode::from_domain(result)))
    }
}

impl ActivityLogNode {
    pub fn from_domain(activity_log: ActivityLog) -> Self {
        ActivityLogNode { activity_log }
    }

    pub fn row(&self) -> &ActivityLogRow {
        &self.activity_log.activity_log_row
    }
}

impl ActivityLogNodeType {
    pub fn from_domain(from: &ActivityLogType) -> ActivityLogNodeType {
        use ActivityLogNodeType as to;
        use ActivityLogType as from;

        match from {
            from::UserLoggedIn => to::UserLoggedIn,
            from::InvoiceCreated => to::InvoiceCreated,
            from::InvoiceDeleted => to::InvoiceDeleted,
            from::InvoiceStatusAllocated => to::InvoiceStatusAllocated,
            from::InvoiceStatusPicked => to::InvoiceStatusPicked,
            from::InvoiceStatusShipped => to::InvoiceStatusShipped,
            from::InvoiceStatusDelivered => to::InvoiceStatusDelivered,
            from::InvoiceStatusVerified => to::InvoiceStatusVerified,
            from::InventoryAdjustment => to::InventoryAdjustment,
            from::StocktakeCreated => to::StocktakeCreated,
            from::StocktakeDeleted => to::StocktakeDeleted,
            from::StocktakeStatusFinalised => to::StocktakeStatusFinalised,
            from::RequisitionCreated => to::RequisitionCreated,
            from::RequisitionDeleted => to::RequisitionDeleted,
            from::RequisitionStatusSent => to::RequisitionStatusSent,
            from::RequisitionStatusFinalised => to::RequisitionStatusFinalised,
            from::StockLocationChange => to::StockLocationChange,
            from::StockCostPriceChange => to::StockCostPriceChange,
            from::StockSellPriceChange => to::StockSellPriceChange,
            from::StockExpiryDateChange => to::StockExpiryDateChange,
            from::StockBatchChange => to::StockBatchChange,
            from::StockOnHold => to::StockOnHold,
            from::StockOffHold => to::StockOffHold,
            from::InvoiceNumberAllocated => to::InvoiceNumberAllocated,
            from::RequisitionNumberAllocated => to::RequisitionNumberAllocated,
            from::Repack => to::Repack,
            from::PrescriptionCreated => to::PrescriptionCreated,
            from::PrescriptionDeleted => to::PrescriptionDeleted,
            from::PrescriptionStatusPicked => to::PrescriptionStatusPicked,
            from::PrescriptionStatusVerified => to::PrescriptionStatusVerified,
            from::SensorLocationChanged => to::SensorLocationChanged,
            from::AssetCreated => to::AssetCreated,
            from::AssetUpdated => to::AssetUpdated,
            from::AssetDeleted => to::AssetDeleted,
            from::AssetLogCreated => to::AssetLogCreated,
            from::AssetCatalogueItemCreated => to::AssetCatalogueItemCreated,
            from::QuantityForLineHasBeenSetToZero => to::QuantityForLineHasBeenSetToZero,
            from::AssetCatalogueItemPropertyCreated => to::AssetCatalogueItemPropertyCreated,
        }
    }

    pub fn to_domain(self) -> ActivityLogType {
        use ActivityLogNodeType as from;
        use ActivityLogType as to;

        match self {
            from::UserLoggedIn => to::UserLoggedIn,
            from::InvoiceCreated => to::InvoiceCreated,
            from::InvoiceDeleted => to::InvoiceDeleted,
            from::InvoiceStatusAllocated => to::InvoiceStatusAllocated,
            from::InvoiceStatusPicked => to::InvoiceStatusPicked,
            from::InvoiceStatusShipped => to::InvoiceStatusShipped,
            from::InvoiceStatusDelivered => to::InvoiceStatusDelivered,
            from::InvoiceStatusVerified => to::InvoiceStatusVerified,
            from::InventoryAdjustment => to::InventoryAdjustment,
            from::StocktakeCreated => to::StocktakeCreated,
            from::StocktakeDeleted => to::StocktakeDeleted,
            from::StocktakeStatusFinalised => to::StocktakeStatusFinalised,
            from::RequisitionCreated => to::RequisitionCreated,
            from::RequisitionDeleted => to::RequisitionDeleted,
            from::RequisitionStatusSent => to::RequisitionStatusSent,
            from::RequisitionStatusFinalised => to::RequisitionStatusFinalised,
            from::StockLocationChange => to::StockLocationChange,
            from::StockCostPriceChange => to::StockCostPriceChange,
            from::StockSellPriceChange => to::StockSellPriceChange,
            from::StockExpiryDateChange => to::StockExpiryDateChange,
            from::StockBatchChange => to::StockBatchChange,
            from::StockOnHold => to::StockOnHold,
            from::StockOffHold => to::StockOffHold,
            from::InvoiceNumberAllocated => to::InvoiceNumberAllocated,
            from::RequisitionNumberAllocated => to::RequisitionNumberAllocated,
            from::Repack => to::Repack,
            from::PrescriptionCreated => to::PrescriptionCreated,
            from::PrescriptionDeleted => to::PrescriptionDeleted,
            from::PrescriptionStatusPicked => to::PrescriptionStatusPicked,
            from::PrescriptionStatusVerified => to::PrescriptionStatusVerified,
            from::SensorLocationChanged => to::SensorLocationChanged,
            from::AssetCreated => to::AssetCreated,
            from::AssetUpdated => to::AssetUpdated,
            from::AssetDeleted => to::AssetDeleted,
            from::AssetLogCreated => to::AssetLogCreated,
            from::AssetCatalogueItemCreated => to::AssetCatalogueItemCreated,
            from::QuantityForLineHasBeenSetToZero => to::QuantityForLineHasBeenSetToZero,
            from::AssetCatalogueItemPropertyCreated => to::AssetCatalogueItemPropertyCreated,
        }
    }
}

impl ActivityLogConnector {
    pub fn from_domain(activity_logs: ListResult<ActivityLog>) -> ActivityLogConnector {
        ActivityLogConnector {
            total_count: activity_logs.count,
            nodes: activity_logs
                .rows
                .into_iter()
                .map(ActivityLogNode::from_domain)
                .collect(),
        }
    }
}
