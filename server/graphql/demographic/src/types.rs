use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterNumberInput, EqualFilterStringInput, StringFilterInput},
    simple_generic_errors::NodeError,
};
use repository::{
    demographic_projection::{
        DemographicProjection, DemographicProjectionFilter, DemographicProjectionSort,
        DemographicProjectionSortField,
    },
    DemographicIndicatorFilter, DemographicIndicatorRow, DemographicIndicatorSort,
    DemographicIndicatorSortField, DemographicProjectionRow, EqualFilter, StringFilter,
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

#[derive(SimpleObject)]
pub struct DemographicIndicatorConnector {
    total_count: u32,
    nodes: Vec<DemographicIndicatorNode>,
}

impl DemographicIndicatorConnector {
    pub fn new() -> DemographicIndicatorConnector {
        DemographicIndicatorConnector {
            total_count: 0,
            nodes: Vec::<DemographicIndicatorNode>::new(),
        }
    }
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

#[derive(SimpleObject)]
pub struct DemographicProjectionConnector {
    total_count: u32,
    nodes: Vec<DemographicProjectionNode>,
}

impl DemographicProjectionConnector {
    pub fn new() -> DemographicProjectionConnector {
        DemographicProjectionConnector {
            total_count: 0,
            nodes: Vec::<DemographicProjectionNode>::new(),
        }
    }
}
#[derive(PartialEq, Debug)]
pub struct DemographicIndicatorNode {
    pub demographic_indicator: DemographicIndicatorRow,
}

#[Object]
impl DemographicIndicatorNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn name(&self) -> &str {
        &self.row().name
    }
    pub async fn base_year(&self) -> &i32 {
        &self.row().base_year
    }
    pub async fn base_population(&self) -> &i32 {
        &self.row().base_population
    }
    pub async fn population_percentage(&self) -> &f64 {
        &self.row().population_percentage
    }
    pub async fn year_1_projection(&self) -> &i32 {
        &self.row().year_1_projection
    }
    pub async fn year_2_projection(&self) -> &i32 {
        &self.row().year_2_projection
    }
    pub async fn year_3_projection(&self) -> &i32 {
        &self.row().year_3_projection
    }
    pub async fn year_4_projection(&self) -> &i32 {
        &self.row().year_4_projection
    }
    pub async fn year_5_projection(&self) -> &i32 {
        &self.row().year_5_projection
    }
}

impl DemographicIndicatorNode {
    pub fn from_domain(demographic_indicator: DemographicIndicatorRow) -> DemographicIndicatorNode {
        DemographicIndicatorNode {
            demographic_indicator,
        }
    }

    pub fn row(&self) -> &DemographicIndicatorRow {
        &self.demographic_indicator
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
