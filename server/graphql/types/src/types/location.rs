use super::StockLineConnector;
use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use graphql_core::generic_filters::{EqualFilterStringInput, StringFilterInput};
use graphql_core::simple_generic_errors::NodeError;
use graphql_core::{loader::StockLineByLocationIdLoader, ContextExt};
use repository::StringFilter;
use repository::{
    location::{Location, LocationFilter, LocationSort, LocationSortField},
    EqualFilter, LocationRow,
};
use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum LocationSortFieldInput {
    Name,
    Code,
}
#[derive(InputObject)]
pub struct LocationSortInput {
    /// Sort query result by `key`
    key: LocationSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct LocationFilterInput {
    pub name: Option<StringFilterInput>,
    pub code: Option<StringFilterInput>,
    pub on_hold: Option<bool>,
    pub assigned_to_asset: Option<bool>,
    pub store_id: Option<EqualFilterStringInput>,
    pub id: Option<EqualFilterStringInput>,
}

impl From<LocationFilterInput> for LocationFilter {
    fn from(f: LocationFilterInput) -> Self {
        LocationFilter {
            name: f.name.map(StringFilter::from),
            code: f.code.map(StringFilter::from),
            id: f.id.map(EqualFilter::from),
            store_id: f.store_id.map(EqualFilter::from),
            on_hold: f.on_hold,
            assigned_to_asset: f.assigned_to_asset,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct LocationNode {
    pub location: Location,
}

#[derive(SimpleObject)]
pub struct LocationConnector {
    total_count: u32,
    nodes: Vec<LocationNode>,
}

#[Object]
impl LocationNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn on_hold(&self) -> bool {
        self.row().on_hold
    }

    pub async fn stock(&self, ctx: &Context<'_>) -> Result<StockLineConnector> {
        let loader = ctx.get_loader::<DataLoader<StockLineByLocationIdLoader>>();
        let result_option = loader.load_one(self.row().id.clone()).await?;

        Ok(StockLineConnector::from_vec(
            result_option.unwrap_or(vec![]),
        ))
    }
}

#[derive(Union)]
pub enum LocationsResponse {
    Response(LocationConnector),
}

#[derive(Union)]
pub enum LocationResponse {
    Error(NodeError),
    Response(LocationNode),
}

impl LocationNode {
    pub fn from_domain(location: Location) -> LocationNode {
        LocationNode { location }
    }

    pub fn row(&self) -> &LocationRow {
        &self.location.location_row
    }
}

impl LocationConnector {
    pub fn from_domain(locations: ListResult<Location>) -> LocationConnector {
        LocationConnector {
            total_count: locations.count,
            nodes: locations
                .rows
                .into_iter()
                .map(LocationNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(locations: Vec<Location>) -> LocationConnector {
        LocationConnector {
            total_count: usize_to_u32(locations.len()),
            nodes: locations
                .into_iter()
                .map(LocationNode::from_domain)
                .collect(),
        }
    }
}

impl LocationSortInput {
    pub fn to_domain(self) -> LocationSort {
        use LocationSortField as to;
        use LocationSortFieldInput as from;
        let key = match self.key {
            from::Name => to::Name,
            from::Code => to::Code,
        };

        LocationSort {
            key,
            desc: self.desc,
        }
    }
}
