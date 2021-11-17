use async_graphql::*;
use domain::{
    location::{Location, LocationFilter},
    EqualFilter,
};

use super::{Connector, ConnectorError, EqualFilterStringInput, SortInput};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "domain::location::LocationSortField")]
#[graphql(rename_items = "camelCase")]
pub enum LocationSortFieldInput {
    Name,
    Code,
}
pub type LocationSortInput = SortInput<LocationSortFieldInput>;

#[derive(InputObject, Clone)]
pub struct LocationFilterInput {
    pub name: Option<EqualFilterStringInput>,
    pub code: Option<EqualFilterStringInput>,
    pub id: Option<EqualFilterStringInput>,
}

impl From<LocationFilterInput> for LocationFilter {
    fn from(f: LocationFilterInput) -> Self {
        LocationFilter {
            name: f.name.map(EqualFilter::from),
            code: f.code.map(EqualFilter::from),
            id: f.id.map(EqualFilter::from),
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct LocationNode {
    location: Location,
}

#[Object]
impl LocationNode {
    pub async fn id(&self) -> &str {
        &self.location.id
    }

    pub async fn name(&self) -> &str {
        &self.location.name
    }

    pub async fn code(&self) -> &str {
        &self.location.code
    }

    pub async fn on_hold(&self) -> bool {
        self.location.on_hold
    }
}

#[derive(Union)]
pub enum LocationsResponse {
    Error(ConnectorError),
    Response(Connector<LocationNode>),
}

impl From<Location> for LocationNode {
    fn from(location: Location) -> Self {
        LocationNode { location }
    }
}
