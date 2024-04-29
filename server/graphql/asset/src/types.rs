use std::vec;

use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use graphql_asset_catalogue::types::asset_catalogue_item::AssetCatalogueItemNode;
use graphql_asset_catalogue::types::asset_catalogue_property::PropertyNodeValueType;
use graphql_asset_catalogue::types::asset_category::AssetCategoryNode;
use graphql_asset_catalogue::types::asset_class::AssetClassNode;
use graphql_asset_catalogue::types::asset_type::AssetTypeNode;
use graphql_core::generic_filters::{
    DateFilterInput, DatetimeFilterInput, EqualFilterStringInput, StringFilterInput,
};
use graphql_core::loader::SyncFileReferenceLoader;
use graphql_core::loader::{
    AssetCatalogueItemLoader, AssetCatalogueItemPropertyLoader, AssetCategoryLoader,
    AssetClassLoader, AssetLocationLoader, AssetTypeLoader, StoreByIdLoader, UserLoader,
};
use graphql_core::loader::{AssetLogReasonLoader, AssetStatusLogLoader};
use graphql_core::simple_generic_errors::NodeError;
use graphql_core::{map_filter, ContextExt};
use graphql_types::types::{LocationConnector, StoreNode, SyncFileReferenceConnector, UserNode};

use repository::asset_catalogue_item_property::AssetCatalogueItemPropertyValue;
use repository::asset_catalogue_item_property_row::AssetCatalogueItemPropertyRow;
use repository::asset_catalogue_property_row::AssetCataloguePropertyRow;
use repository::asset_log_reason::{
    AssetLogReason, AssetLogReasonFilter, AssetLogReasonSort, AssetLogReasonSortField,
};
use repository::assets::asset::AssetSortField;
use repository::assets::asset_log::{AssetLog, AssetLogFilter, AssetLogSort, AssetLogSortField};

use repository::{
    assets::asset::{Asset, AssetFilter, AssetSort},
    EqualFilter,
};
use repository::{DateFilter, DatetimeFilter, StringFilter};
use service::{usize_to_u32, ListResult};

use repository::asset_log_row::AssetLogStatus;
use serde::Serialize;

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum AssetSortFieldInput {
    SerialNumber,
    InstallationDate,
    ReplacementDate,
    ModifiedDatetime,
}

#[derive(InputObject)]
pub struct AssetSortInput {
    /// Sort query result by `key`
    key: AssetSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct AssetFilterInput {
    pub notes: Option<StringFilterInput>,
    pub asset_number: Option<StringFilterInput>,
    pub id: Option<EqualFilterStringInput>,
    pub serial_number: Option<StringFilterInput>,
    pub class_id: Option<EqualFilterStringInput>,
    pub category_id: Option<EqualFilterStringInput>,
    pub type_id: Option<EqualFilterStringInput>,
    pub catalogue_item_id: Option<EqualFilterStringInput>,
    pub is_non_catalogue: Option<bool>,
    pub installation_date: Option<DateFilterInput>,
    pub replacement_date: Option<DateFilterInput>,
    pub store: Option<StringFilterInput>,
}

impl From<AssetFilterInput> for AssetFilter {
    fn from(f: AssetFilterInput) -> Self {
        AssetFilter {
            notes: f.notes.map(StringFilter::from),
            asset_number: f.asset_number.map(StringFilter::from),
            id: f.id.map(EqualFilter::from),
            serial_number: f.serial_number.map(StringFilter::from),
            class_id: f.class_id.map(EqualFilter::from),
            category_id: f.category_id.map(EqualFilter::from),
            type_id: f.type_id.map(EqualFilter::from),
            catalogue_item_id: f.catalogue_item_id.map(EqualFilter::from),
            installation_date: f.installation_date.map(DateFilter::from),
            replacement_date: f.replacement_date.map(DateFilter::from),
            is_non_catalogue: f.is_non_catalogue,
            store: f.store.map(StringFilter::from),
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct AssetNode {
    pub asset: Asset,
}

#[derive(SimpleObject)]
pub struct AssetConnector {
    total_count: u32,
    nodes: Vec<AssetNode>,
}

impl AssetConnector {
    pub fn new() -> AssetConnector {
        AssetConnector {
            total_count: 0,
            nodes: Vec::<AssetNode>::new(),
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct AssetCatalogueItemPropertyValueNode {
    pub value: AssetCatalogueItemPropertyRow,
    pub property: AssetCataloguePropertyRow,
}

#[derive(SimpleObject)]
pub struct AssetCatalogueItemPropertyConnector {
    nodes: Vec<AssetCatalogueItemPropertyValueNode>,
}

#[Object]
impl AssetCatalogueItemPropertyValueNode {
    pub async fn id(&self) -> &str {
        &self.value().id
    }
    pub async fn catalogue_item_id(&self) -> &str {
        &self.value().catalogue_item_id
    }
    pub async fn catalogue_property_id(&self) -> &str {
        &self.value().catalogue_property_id
    }
    pub async fn name(&self) -> &str {
        &self.property().name
    }
    pub async fn value_type(&self) -> PropertyNodeValueType {
        PropertyNodeValueType::from_domain(&self.property().value_type)
    }
    pub async fn value_string(&self) -> &Option<String> {
        &self.value().value_string
    }
    pub async fn value_int(&self) -> &Option<i32> {
        &self.value().value_int
    }
    pub async fn value_float(&self) -> &Option<f64> {
        &self.value().value_float
    }
    pub async fn value_bool(&self) -> &Option<bool> {
        &self.value().value_bool
    }
}
impl AssetCatalogueItemPropertyValueNode {
    pub fn from_domain(
        property_and_value: AssetCatalogueItemPropertyValue,
    ) -> AssetCatalogueItemPropertyValueNode {
        let AssetCatalogueItemPropertyValue { property, value } = property_and_value;
        AssetCatalogueItemPropertyValueNode { property, value }
    }

    pub fn property(&self) -> &AssetCataloguePropertyRow {
        &self.property
    }

    pub fn value(&self) -> &AssetCatalogueItemPropertyRow {
        &self.value
    }
}

impl AssetCatalogueItemPropertyConnector {
    pub fn from_domain(
        properties_and_values: Vec<AssetCatalogueItemPropertyValue>,
    ) -> AssetCatalogueItemPropertyConnector {
        AssetCatalogueItemPropertyConnector {
            nodes: properties_and_values
                .into_iter()
                .map(AssetCatalogueItemPropertyValueNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(
        properties_and_values: Vec<AssetCatalogueItemPropertyValue>,
    ) -> AssetCatalogueItemPropertyConnector {
        AssetCatalogueItemPropertyConnector {
            nodes: properties_and_values
                .into_iter()
                .map(AssetCatalogueItemPropertyValueNode::from_domain)
                .collect(),
        }
    }
}

#[Object]
impl AssetNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn store_id(&self) -> &Option<String> {
        &self.row().store_id
    }

    pub async fn notes(&self) -> &Option<String> {
        &self.row().notes
    }

    pub async fn asset_number(&self) -> &Option<String> {
        &self.row().asset_number
    }

    pub async fn serial_number(&self) -> &Option<String> {
        &self.row().serial_number
    }

    pub async fn catalogue_item_id(&self) -> &Option<String> {
        &self.row().catalogue_item_id
    }

    pub async fn installation_date(&self) -> &Option<chrono::NaiveDate> {
        &self.row().installation_date
    }

    pub async fn replacement_date(&self) -> &Option<chrono::NaiveDate> {
        &self.row().replacement_date
    }

    pub async fn created_datetime(&self) -> &chrono::NaiveDateTime {
        &self.row().created_datetime
    }

    pub async fn modified_datetime(&self) -> &chrono::NaiveDateTime {
        &self.row().modified_datetime
    }

    pub async fn store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let store_id = match &self.row().store_id {
            Some(store_id) => store_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();
        Ok(loader
            .load_one(store_id.clone())
            .await?
            .map(StoreNode::from_domain))
    }

    pub async fn catalogue_item(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<AssetCatalogueItemNode>> {
        let catalogue_item_id = match &self.row().catalogue_item_id {
            Some(catalogue_item_id) => catalogue_item_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<AssetCatalogueItemLoader>>();
        Ok(loader
            .load_one(catalogue_item_id.clone())
            .await?
            .map(AssetCatalogueItemNode::from_domain))
    }

    pub async fn locations(&self, ctx: &Context<'_>) -> Result<LocationConnector> {
        let asset_id = &self.row().id;
        let loader = ctx.get_loader::<DataLoader<AssetLocationLoader>>();
        let result_option = loader.load_one(asset_id.to_string()).await?;

        let locations = LocationConnector::from_vec(result_option.unwrap_or(vec![]));

        Ok(locations)
    }

    pub async fn documents(&self, ctx: &Context<'_>) -> Result<SyncFileReferenceConnector> {
        let asset_id = &self.row().id;
        let loader = ctx.get_loader::<DataLoader<SyncFileReferenceLoader>>();
        let result_option = loader.load_one(asset_id.to_string()).await?;

        let documents = SyncFileReferenceConnector::from_vec(result_option.unwrap_or(vec![]));

        Ok(documents)
    }

    pub async fn properties(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Vec<AssetCatalogueItemPropertyValueNode>> {
        let properties = match &self.row().catalogue_item_id {
            Some(catalogue_item_id) => {
                let loader = ctx.get_loader::<DataLoader<AssetCatalogueItemPropertyLoader>>();
                let result_option = loader.load_one(catalogue_item_id.to_string()).await?;

                result_option
                    .unwrap_or(Vec::<AssetCatalogueItemPropertyValue>::new())
                    .iter()
                    .map(|p| AssetCatalogueItemPropertyValueNode::from_domain(p.to_owned()))
                    .into_iter()
                    .collect()
            }
            None => vec![],
        };

        Ok(properties)
    }

    pub async fn asset_category(&self, ctx: &Context<'_>) -> Result<Option<AssetCategoryNode>> {
        let loader = ctx.get_loader::<DataLoader<AssetCategoryLoader>>();
        let category_id = match self.row().asset_category_id.clone() {
            Some(category_id) => category_id,
            None => return Ok(None),
        };

        Ok(loader
            .load_one(category_id)
            .await?
            .map(AssetCategoryNode::from_domain))
    }

    pub async fn asset_class(&self, ctx: &Context<'_>) -> Result<Option<AssetClassNode>> {
        let loader = ctx.get_loader::<DataLoader<AssetClassLoader>>();
        let class_id = match self.row().asset_class_id.clone() {
            Some(class_id) => class_id,
            None => return Ok(None),
        };

        Ok(loader
            .load_one(class_id)
            .await?
            .map(AssetClassNode::from_domain))
    }

    pub async fn asset_type(&self, ctx: &Context<'_>) -> Result<Option<AssetTypeNode>> {
        let loader = ctx.get_loader::<DataLoader<AssetTypeLoader>>();
        let type_id = match self.row().asset_type_id.clone() {
            Some(type_id) => type_id,
            None => return Ok(None),
        };

        Ok(loader
            .load_one(type_id)
            .await?
            .map(AssetTypeNode::from_domain))
    }

    pub async fn status_log(&self, ctx: &Context<'_>) -> Result<Option<AssetLogNode>> {
        let asset_id = self.row().id.clone();
        let loader = ctx.get_loader::<DataLoader<AssetStatusLogLoader>>();

        Ok(loader
            .load_one(asset_id.clone())
            .await?
            .map(AssetLogNode::from_domain))
    }
}

#[derive(Union)]
pub enum AssetsResponse {
    Response(AssetConnector),
}

#[derive(Union)]
pub enum AssetResponse {
    Error(NodeError),
    Response(AssetNode),
}

impl AssetNode {
    pub fn from_domain(asset: Asset) -> AssetNode {
        AssetNode { asset }
    }

    pub fn row(&self) -> &Asset {
        &self.asset
    }
}

impl AssetConnector {
    pub fn from_domain(assets: ListResult<Asset>) -> AssetConnector {
        AssetConnector {
            total_count: assets.count,
            nodes: assets
                .rows
                .into_iter()
                .map(AssetNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(assets: Vec<Asset>) -> AssetConnector {
        AssetConnector {
            total_count: usize_to_u32(assets.len()),
            nodes: assets.into_iter().map(AssetNode::from_domain).collect(),
        }
    }
}

impl AssetSortInput {
    pub fn to_domain(&self) -> AssetSort {
        use AssetSortField as to;
        use AssetSortFieldInput as from;
        let key = match self.key {
            from::SerialNumber => to::SerialNumber,
            from::InstallationDate => to::InstallationDate,
            from::ReplacementDate => to::ReplacementDate,
            from::ModifiedDatetime => to::ModifiedDatetime,
        };

        AssetSort {
            key,
            desc: self.desc,
        }
    }
}

// Asset log types

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests

pub enum AssetLogStatusInput {
    NotInUse,
    Functioning,
    FunctioningButNeedsAttention,
    NotFunctioning,
    Decommissioned,
}

impl AssetLogStatusInput {
    pub fn to_domain(self) -> AssetLogStatus {
        match self {
            AssetLogStatusInput::NotInUse => AssetLogStatus::NotInUse,
            AssetLogStatusInput::Functioning => AssetLogStatus::Functioning,
            AssetLogStatusInput::FunctioningButNeedsAttention => {
                AssetLogStatus::FunctioningButNeedsAttention
            }
            AssetLogStatusInput::NotFunctioning => AssetLogStatus::NotFunctioning,
            AssetLogStatusInput::Decommissioned => AssetLogStatus::Decommissioned,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum AssetLogSortFieldInput {
    Status,
    LogDatetime,
}

#[derive(InputObject)]
pub struct AssetLogSortInput {
    /// Sort query result by `key`
    key: AssetLogSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}
#[derive(InputObject, Clone)]

pub struct AssetLogFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub asset_id: Option<EqualFilterStringInput>,
    pub status: Option<EqualFilterStatusInput>,
    pub log_datetime: Option<DatetimeFilterInput>,
    pub user: Option<StringFilterInput>,
    pub reason_id: Option<EqualFilterStringInput>,
}

impl From<AssetLogFilterInput> for AssetLogFilter {
    fn from(f: AssetLogFilterInput) -> Self {
        AssetLogFilter {
            id: f.id.map(EqualFilter::from),
            asset_id: f.asset_id.map(EqualFilter::from),
            status: f
                .status
                .map(|s| map_filter!(s, AssetLogStatusInput::to_domain)),
            log_datetime: f.log_datetime.map(DatetimeFilter::from),
            user: f.user.map(StringFilter::from),
            reason_id: f.reason_id.map(EqualFilter::from),
        }
    }
}

#[derive(InputObject, Clone)]
pub struct EqualFilterStatusInput {
    pub equal_to: Option<AssetLogStatusInput>,
    pub equal_any: Option<Vec<AssetLogStatusInput>>,
    pub not_equal_to: Option<AssetLogStatusInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests

pub enum StatusType {
    NotInUse,
    Functioning,
    FunctioningButNeedsAttention,
    NotFunctioning,
    Decommissioned,
}
impl StatusType {
    pub fn from_domain(status: &AssetLogStatus) -> Self {
        match status {
            AssetLogStatus::NotInUse => StatusType::NotInUse,
            AssetLogStatus::Functioning => StatusType::Functioning,
            AssetLogStatus::FunctioningButNeedsAttention => {
                StatusType::FunctioningButNeedsAttention
            }
            AssetLogStatus::NotFunctioning => StatusType::NotFunctioning,
            AssetLogStatus::Decommissioned => StatusType::Decommissioned,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct AssetLogNode {
    pub asset_log: AssetLog,
}

#[derive(SimpleObject)]
pub struct AssetLogConnector {
    total_count: u32,
    nodes: Vec<AssetLogNode>,
}

#[Object]
impl AssetLogNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn asset_id(&self) -> &str {
        &self.row().asset_id
    }

    pub async fn user(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        let user_id = &self.row().user_id;
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();
        Ok(loader
            .load_one(user_id.clone())
            .await?
            .map(UserNode::from_domain))
    }

    pub async fn status(&self) -> Option<StatusType> {
        self.row().status.as_ref().map(StatusType::from_domain)
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    pub async fn r#type(&self) -> &Option<String> {
        &self.row().r#type
    }

    pub async fn reason(&self, ctx: &Context<'_>) -> Result<Option<AssetLogReasonNode>> {
        match &self.row().reason_id {
            Some(reason_id) => {
                let loader = ctx.get_loader::<DataLoader<AssetLogReasonLoader>>();
                Ok(loader
                    .load_one(reason_id.clone())
                    .await?
                    .map(AssetLogReasonNode::from_domain))
            }
            None => Ok(None),
        }
    }

    pub async fn log_datetime(&self) -> &chrono::NaiveDateTime {
        &self.row().log_datetime
    }

    pub async fn documents(&self, ctx: &Context<'_>) -> Result<SyncFileReferenceConnector> {
        let asset_log_id = &self.row().id;
        let loader = ctx.get_loader::<DataLoader<SyncFileReferenceLoader>>();
        let result_option = loader.load_one(asset_log_id.to_string()).await?;

        let documents = SyncFileReferenceConnector::from_vec(result_option.unwrap_or(vec![]));

        Ok(documents)
    }
}

#[derive(Union)]
pub enum AssetLogsResponse {
    Response(AssetLogConnector),
}

#[derive(Union)]
pub enum AssetLogResponse {
    Error(NodeError),
    Response(AssetLogNode),
}

impl AssetLogNode {
    pub fn from_domain(asset_log: AssetLog) -> AssetLogNode {
        AssetLogNode { asset_log }
    }

    pub fn row(&self) -> &AssetLog {
        &self.asset_log
    }
}

impl AssetLogConnector {
    pub fn from_domain(assets: ListResult<AssetLog>) -> AssetLogConnector {
        AssetLogConnector {
            total_count: assets.count,
            nodes: assets
                .rows
                .into_iter()
                .map(AssetLogNode::from_domain)
                .collect(),
        }
    }
}

impl AssetLogSortInput {
    pub fn to_domain(&self) -> AssetLogSort {
        use AssetLogSortField as to;
        use AssetLogSortFieldInput as from;
        let key = match self.key {
            from::Status => to::Status,
            from::LogDatetime => to::LogDatetime,
        };

        AssetLogSort {
            key,
            desc: self.desc,
        }
    }
}

// asset log reason

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum AssetLogReasonSortFieldInput {
    Status,
}

#[derive(InputObject)]
pub struct AssetLogReasonSortInput {
    /// Sort query result by `key`
    key: AssetLogReasonSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(PartialEq, Debug)]
pub struct AssetLogReasonNode {
    pub asset_log_reason: AssetLogReason,
}

#[derive(SimpleObject)]
pub struct AssetLogReasonConnector {
    total_count: u32,
    nodes: Vec<AssetLogReasonNode>,
}

#[Object]
impl AssetLogReasonNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn asset_log_status(&self) -> StatusType {
        let asset_log_status = &self.row().asset_log_status;
        StatusType::from_domain(&asset_log_status)
    }

    pub async fn reason(&self) -> &str {
        &self.row().reason
    }
}

#[derive(Union)]
pub enum AssetLogReasonsResponse {
    Response(AssetLogReasonConnector),
}

#[derive(Union)]
pub enum AssetLogReasonResponse {
    Error(NodeError),
    Response(AssetLogReasonNode),
}

#[derive(InputObject, Clone)]

pub struct AssetLogReasonFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub asset_log_status: Option<EqualFilterStatusInput>,
    pub reason: Option<StringFilterInput>,
}

impl From<AssetLogReasonFilterInput> for AssetLogReasonFilter {
    fn from(f: AssetLogReasonFilterInput) -> Self {
        AssetLogReasonFilter {
            id: f.id.map(EqualFilter::from),
            asset_log_status: f
                .asset_log_status
                .map(|s| map_filter!(s, AssetLogStatusInput::to_domain)),
            reason: f.reason.map(StringFilter::from),
        }
    }
}

impl AssetLogReasonNode {
    pub fn from_domain(asset_log_reason: AssetLogReason) -> AssetLogReasonNode {
        AssetLogReasonNode { asset_log_reason }
    }

    pub fn row(&self) -> &AssetLogReason {
        &self.asset_log_reason
    }
}

impl AssetLogReasonConnector {
    pub fn from_domain(assets: ListResult<AssetLogReason>) -> AssetLogReasonConnector {
        AssetLogReasonConnector {
            total_count: assets.count,
            nodes: assets
                .rows
                .into_iter()
                .map(AssetLogReasonNode::from_domain)
                .collect(),
        }
    }
}

impl AssetLogReasonSortInput {
    pub fn to_domain(&self) -> AssetLogReasonSort {
        use AssetLogReasonSortField as to;
        use AssetLogReasonSortFieldInput as from;
        let key = match self.key {
            from::Status => to::AssetLogStatus,
        };

        AssetLogReasonSort {
            key,
            desc: self.desc,
        }
    }
}
