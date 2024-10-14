use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterNumberInput, EqualFilterStringInput, StringFilterInput},
    simple_generic_errors::NodeError,
};
use graphql_types::types::{DemographicIndicatorNode, DemographicNode};
use repository::{
    demographic::{DemographicFilter, DemographicSort, DemographicSortField},
    demographic_projection::{
        DemographicProjection, DemographicProjectionFilter, DemographicProjectionSort,
        DemographicProjectionSortField,
    },
    DemographicIndicatorFilter, DemographicIndicatorRow, DemographicIndicatorSort,
    DemographicIndicatorSortField, DemographicProjectionRow, DemographicRow, EqualFilter,
    StringFilter,
};
use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum DemographicIndicatorSortFieldInput {
    Id,
    Name,
}

#[derive(InputObject)]
pub struct DemographicIndicatorSortInput {
    key: DemographicIndicatorSortFieldInput,
    desc: Option<bool>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum DemographicSortFieldInput {
    Id,
    Name,
}

#[derive(InputObject)]
pub struct DemographicSortInput {
    key: DemographicSortFieldInput,
    desc: Option<bool>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum DemographicProjectionSortFieldInput {
    Id,
}

#[derive(InputObject)]
pub struct DemographicProjectionSortInput {
    key: DemographicProjectionSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct DemographicIndicatorFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
    pub base_year: Option<EqualFilterNumberInput>,
}

impl From<DemographicIndicatorFilterInput> for DemographicIndicatorFilter {
    fn from(f: DemographicIndicatorFilterInput) -> Self {
        DemographicIndicatorFilter {
            id: f.id.map(EqualFilter::from),
            name: f.name.map(StringFilter::from),
            base_year: f.base_year.map(EqualFilter::from),
        }
    }
}

#[derive(InputObject, Clone)]
pub struct DemographicFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
}

impl From<DemographicFilterInput> for DemographicFilter {
    fn from(f: DemographicFilterInput) -> Self {
        DemographicFilter {
            id: f.id.map(EqualFilter::from),
            name: f.name.map(StringFilter::from),
        }
    }
}

#[derive(InputObject, Clone)]
pub struct DemographicProjectionFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub base_year: Option<EqualFilterNumberInput>,
}

impl From<DemographicProjectionFilterInput> for DemographicProjectionFilter {
    fn from(f: DemographicProjectionFilterInput) -> Self {
        DemographicProjectionFilter {
            id: f.id.map(EqualFilter::from),
            base_year: f.base_year.map(EqualFilter::from),
        }
    }
}

#[derive(Union)]
pub enum DemographicIndicatorsResponse {
    Response(DemographicIndicatorConnector),
}

#[derive(Union)]
pub enum DemographicIndicatorResponse {
    Error(NodeError),
    Response(DemographicIndicatorNode),
}

#[derive(SimpleObject, Default)]
pub struct DemographicIndicatorConnector {
    total_count: u32,
    nodes: Vec<DemographicIndicatorNode>,
}

#[derive(Union)]
pub enum DemographicsResponse {
    Response(DemographicConnector),
}

#[derive(Union)]
pub enum DemographicResponse {
    Error(NodeError),
    Response(DemographicNode),
}

#[derive(SimpleObject, Default)]
pub struct DemographicConnector {
    total_count: u32,
    nodes: Vec<DemographicNode>,
}

#[derive(Union)]
pub enum DemographicProjectionsResponse {
    Response(DemographicProjectionConnector),
}

#[derive(Union)]
pub enum DemographicProjectionResponse {
    Error(NodeError),
    Response(DemographicProjectionNode),
}

#[derive(SimpleObject, Default)]
pub struct DemographicProjectionConnector {
    total_count: u32,
    nodes: Vec<DemographicProjectionNode>,
}

impl DemographicProjectionConnector {
    pub fn new() -> DemographicProjectionConnector {
        Self::default()
    }
}

#[derive(PartialEq, Debug)]
pub struct DemographicProjectionNode {
    pub demographic_projection: DemographicProjection,
}

#[Object]
impl DemographicProjectionNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn base_year(&self) -> &i32 {
        &self.row().base_year
    }
    pub async fn year_1(&self) -> &f64 {
        &self.row().year_1
    }
    pub async fn year_2(&self) -> &f64 {
        &self.row().year_2
    }
    pub async fn year_3(&self) -> &f64 {
        &self.row().year_3
    }
    pub async fn year_4(&self) -> &f64 {
        &self.row().year_4
    }
    pub async fn year_5(&self) -> &f64 {
        &self.row().year_5
    }
}

impl DemographicProjectionNode {
    pub fn from_domain(demographic_projection: DemographicProjection) -> DemographicProjectionNode {
        DemographicProjectionNode {
            demographic_projection,
        }
    }
    pub fn row(&self) -> &DemographicProjectionRow {
        &self.demographic_projection
    }
}

impl DemographicConnector {
    pub fn from_domain(demographic_indicators: ListResult<DemographicRow>) -> DemographicConnector {
        DemographicConnector {
            total_count: demographic_indicators.count,
            nodes: demographic_indicators
                .rows
                .into_iter()
                .map(DemographicNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(demographic_indicators: Vec<DemographicRow>) -> DemographicConnector {
        DemographicConnector {
            total_count: usize_to_u32(demographic_indicators.len()),
            nodes: demographic_indicators
                .into_iter()
                .map(DemographicNode::from_domain)
                .collect(),
        }
    }
}

impl DemographicIndicatorConnector {
    pub fn from_domain(
        demographic_indicators: ListResult<DemographicIndicatorRow>,
    ) -> DemographicIndicatorConnector {
        DemographicIndicatorConnector {
            total_count: demographic_indicators.count,
            nodes: demographic_indicators
                .rows
                .into_iter()
                .map(DemographicIndicatorNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(
        demographic_indicators: Vec<DemographicIndicatorRow>,
    ) -> DemographicIndicatorConnector {
        DemographicIndicatorConnector {
            total_count: usize_to_u32(demographic_indicators.len()),
            nodes: demographic_indicators
                .into_iter()
                .map(DemographicIndicatorNode::from_domain)
                .collect(),
        }
    }
}

impl DemographicProjectionConnector {
    pub fn from_domain(
        demographic_projections: ListResult<DemographicProjection>,
    ) -> DemographicProjectionConnector {
        DemographicProjectionConnector {
            total_count: demographic_projections.count,
            nodes: demographic_projections
                .rows
                .into_iter()
                .map(DemographicProjectionNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(
        demographic_projections: Vec<DemographicProjection>,
    ) -> DemographicProjectionConnector {
        DemographicProjectionConnector {
            total_count: usize_to_u32(demographic_projections.len()),
            nodes: demographic_projections
                .into_iter()
                .map(DemographicProjectionNode::from_domain)
                .collect(),
        }
    }
}

impl DemographicSortInput {
    pub fn to_domain(&self) -> DemographicSort {
        use DemographicSortField as to;
        use DemographicSortFieldInput as from;
        let key = match self.key {
            from::Id => to::Id,
            from::Name => to::Name,
        };

        DemographicSort {
            key,
            desc: self.desc,
        }
    }
}

impl DemographicIndicatorSortInput {
    pub fn to_domain(&self) -> DemographicIndicatorSort {
        use DemographicIndicatorSortField as to;
        use DemographicIndicatorSortFieldInput as from;
        let key = match self.key {
            from::Id => to::Id,
            from::Name => to::Name,
        };

        DemographicIndicatorSort {
            key,
            desc: self.desc,
        }
    }
}

impl DemographicProjectionSortInput {
    pub fn to_domain(&self) -> DemographicProjectionSort {
        use DemographicProjectionSortField as to;
        use DemographicProjectionSortFieldInput as from;
        let key = match self.key {
            from::Id => to::Id,
        };

        DemographicProjectionSort {
            key,
            desc: self.desc,
        }
    }
}
