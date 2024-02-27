use async_graphql::*;
use graphql_core::generic_filters::{DateFilterInput, EqualFilterStringInput, StringFilterInput};
use graphql_core::simple_generic_errors::NodeError;
use repository::assets::asset::AssetSortField;
use repository::{
    assets::asset::{Asset, AssetFilter, AssetSort},
    EqualFilter,
};
use repository::{DateFilter, StringFilter};
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
