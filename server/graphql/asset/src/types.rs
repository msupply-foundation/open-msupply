use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use graphql_core::generic_filters::{
    DateFilterInput, DatetimeFilterInput, EqualFilterStringInput, StringFilterInput,
};
use graphql_core::loader::{AssetCatalogueItemLoader, StoreByIdLoader};
use graphql_core::simple_generic_errors::NodeError;
use graphql_core::ContextExt;
use graphql_types::types::{AssetCatalogueItemNode, StoreNode};
use repository::assets::asset::AssetSortField;
use repository::assets::asset_log::{AssetLog, AssetLogFilter, AssetLogSort, AssetLogSortField};
use repository::{
    assets::asset::{Asset, AssetFilter, AssetSort},
    EqualFilter,
};
use repository::{DateFilter, DatetimeFilter, StringFilter};
use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum AssetSortFieldInput {
    Name,
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
    pub name: Option<StringFilterInput>,
    pub code: Option<StringFilterInput>,
    pub id: Option<EqualFilterStringInput>,
    pub serial_number: Option<StringFilterInput>,
    pub class_id: Option<EqualFilterStringInput>,
    pub category_id: Option<EqualFilterStringInput>,
    pub type_id: Option<EqualFilterStringInput>,
    pub catalogue_item_id: Option<EqualFilterStringInput>,
    pub installation_date: Option<DateFilterInput>,
    pub replacement_date: Option<DateFilterInput>,
}

impl From<AssetFilterInput> for AssetFilter {
    fn from(f: AssetFilterInput) -> Self {
        AssetFilter {
            name: f.name.map(StringFilter::from),
            code: f.code.map(StringFilter::from),
            id: f.id.map(EqualFilter::from),
            serial_number: f.serial_number.map(StringFilter::from),
            class_id: f.class_id.map(EqualFilter::from),
            category_id: f.category_id.map(EqualFilter::from),
            type_id: f.type_id.map(EqualFilter::from),
            catalogue_item_id: f.catalogue_item_id.map(EqualFilter::from),
            installation_date: f.installation_date.map(DateFilter::from),
            replacement_date: f.replacement_date.map(DateFilter::from),
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

#[Object]
impl AssetNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn store_id(&self) -> &Option<String> {
        &self.row().store_id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn serial_number(&self) -> &Option<String> {
        &self.row().serial_number
    }

    // TODO: Loaders for store, class, category, type, catalogue_item

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
    pub fn to_domain(self) -> AssetSort {
        use AssetSortField as to;
        use AssetSortFieldInput as from;
        let key = match self.key {
            from::Name => to::Name,
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
    pub status: Option<StringFilterInput>,
    pub log_datetime: Option<DatetimeFilterInput>,
}

impl From<AssetLogFilterInput> for AssetLogFilter {
    fn from(f: AssetLogFilterInput) -> Self {
        AssetLogFilter {
            id: f.id.map(EqualFilter::from),
            asset_id: f.asset_id.map(EqualFilter::from),
            status: f.status.map(StringFilter::from),
            log_datetime: f.log_datetime.map(DatetimeFilter::from),
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

    pub async fn status(&self) -> &Option<String> {
        &self.row().status
    }

    pub async fn log_datetime(&self) -> &chrono::NaiveDateTime {
        &self.row().log_datetime
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

    pub fn from_vec(assets: Vec<AssetLog>) -> AssetLogConnector {
        AssetLogConnector {
            total_count: usize_to_u32(assets.len()),
            nodes: assets.into_iter().map(AssetLogNode::from_domain).collect(),
        }
    }
}

impl AssetLogSortInput {
    pub fn to_domain(self) -> AssetLogSort {
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
