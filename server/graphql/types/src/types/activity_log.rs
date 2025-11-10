use super::{StoreNode, UserNode};
use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    loader::{StoreByIdLoader, UserLoader},
    ContextExt,
};
use repository::{activity_log::ActivityLog, ActivityLogRow};
use service::ListResult;

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
#[graphql(remote = "repository::db_diesel::activity_log_row
::ActivityLogType")]
pub enum ActivityLogNodeType {
    UserLoggedIn,
    InvoiceCreated,
    InvoiceDeleted,
    InvoiceNumberAllocated,
    InvoiceStatusAllocated,
    InvoiceStatusPicked,
    InvoiceStatusShipped,
    InvoiceStatusDelivered,
    InvoiceStatusReceived,
    InvoiceStatusVerified,
    InventoryAdjustment,
    StocktakeCreated,
    StocktakeDeleted,
    StocktakeStatusFinalised,
    RequisitionCreated,
    RequisitionDeleted,
    RequisitionNumberAllocated,
    RequisitionApproved,
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
    PrescriptionStatusCancelled,
    SensorLocationChanged,
    AssetCreated,
    AssetUpdated,
    AssetDeleted,
    AssetLogCreated,
    AssetCatalogueItemCreated,
    QuantityForLineHasBeenSetToZero,
    AssetCatalogueItemPropertyCreated,
    AssetLogReasonCreated,
    AssetLogReasonDeleted,
    AssetPropertyCreated,
    VaccineCourseCreated,
    ProgramCreated,
    ProgramUpdated,
    VaccineCourseUpdated,
    RnrFormCreated,
    RnrFormUpdated,
    RnrFormDeleted,
    RnrFormFinalised,
    VaccinationCreated,
    VaccinationUpdated,
    VaccinationDeleted,
    DemographicIndicatorCreated,
    DemographicIndicatorUpdated,
    DemographicProjectionCreated,
    DemographicProjectionUpdated,
    InvoiceStatusCancelled,
    ItemVariantCreated,
    ItemVariantDeleted,
    ItemVariantUpdatedName,
    ItemVariantUpdateLocationType,
    ItemVariantUpdateManufacturer,
    ItemVariantUpdateDosePerUnit,
    ItemVariantUpdateVVMType,
    VVMStatusLogUpdated,
    VolumePerPackChanged,
    GoodsReceivedCreated,
    GoodsReceivedDeleted,
    GoodsReceivedStatusFinalised,
    // Purchase Orders
    PurchaseOrderCreated,
    PurchaseOrderRequestApproval,
    PurchaseOrderUnauthorised,
    PurchaseOrderSent,
    PurchaseOrderConfirmed,
    PurchaseOrderFinalised,
    PurchaseOrderDeleted,
    PurchaseOrderLineCreated,
    PurchaseOrderLineUpdated,
    PurchaseOrderLineDeleted,

    PurchaseOrderStatusChangedFromSentToConfirmed,
    PurchaseOrderLineStatusClosed,
    PurchaseOrderLineStatusChangedFromSentToNew,
    // Patients
    PatientCreated,
    PatientUpdated,
}

#[Object]
impl ActivityLogNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn r#type(&self) -> ActivityLogNodeType {
        ActivityLogNodeType::from(self.row().r#type.clone())
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
