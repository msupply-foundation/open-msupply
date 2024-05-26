use std::vec;

use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use graphql_core::generic_filters::{
    DatetimeFilterInput, EqualFilterStringInput, StringFilterInput,
};
use graphql_core::loader::AssetLogReasonLoader;
use graphql_core::loader::SyncFileReferenceLoader;
use graphql_core::loader::UserLoader;
use graphql_core::simple_generic_errors::NodeError;
use graphql_core::{map_filter, ContextExt};
use graphql_types::types::{SyncFileReferenceConnector, UserNode};

use repository::asset_log_reason::{
    AssetLogReason, AssetLogReasonFilter, AssetLogReasonSort, AssetLogReasonSortField,
};

use repository::assets::asset_log::{AssetLog, AssetLogFilter, AssetLogSort, AssetLogSortField};

use repository::EqualFilter;
use repository::{DatetimeFilter, StringFilter};
use service::ListResult;

use repository::asset_log_row::AssetLogStatus;
use serde::Serialize;

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
