use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    map_filter,
    simple_generic_errors::NodeError,
};
use repository::{
    EqualFilter, StringFilter,
    campaign::{
        campaign::{Campaign, CampaignFilter, CampaignSort, CampaignSortField},
        campaign_row::CampaignKind,
    },
};

use service::{ListResult, usize_to_u32};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::campaign::campaign
::CampaignSortField")]
pub enum CampaignSortFieldInput {
    Name,
}

#[derive(InputObject)]
pub struct CampaignSortInput {
    /// Sort query result by `key`
    key: CampaignSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is ascending)
    desc: Option<bool>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum CampaignKindNode {
    Campaign,
    Routine,
}

impl From<&CampaignKind> for CampaignKindNode {
    fn from(kind: &CampaignKind) -> Self {
        match kind {
            CampaignKind::Campaign => CampaignKindNode::Campaign,
            CampaignKind::Routine => CampaignKindNode::Routine,
            CampaignKind::Other(_) => CampaignKindNode::Campaign,
        }
    }
}

impl From<CampaignKindNode> for CampaignKind {
    fn from(kind: CampaignKindNode) -> Self {
        match kind {
            CampaignKindNode::Campaign => CampaignKind::Campaign,
            CampaignKindNode::Routine => CampaignKind::Routine,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct EqualFilterCampaignKindInput {
    pub equal_to: Option<CampaignKindNode>,
    pub equal_any: Option<Vec<CampaignKindNode>>,
    pub not_equal_to: Option<CampaignKindNode>,
    pub not_equal_all: Option<Vec<CampaignKindNode>>,
}

#[derive(InputObject, Clone)]
pub struct CampaignFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
    pub kind: Option<EqualFilterCampaignKindInput>,
}

impl From<CampaignFilterInput> for CampaignFilter {
    fn from(f: CampaignFilterInput) -> Self {
        CampaignFilter {
            id: f.id.map(EqualFilter::from),
            name: f.name.map(StringFilter::from),
            kind: f.kind.map(|t| map_filter!(t, CampaignKind::from)),
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct CampaignNode {
    pub campaign: Campaign,
}

#[derive(SimpleObject)]
pub struct CampaignConnector {
    total_count: u32,
    nodes: Vec<CampaignNode>,
}

#[Object]
impl CampaignNode {
    pub async fn id(&self) -> &str {
        &self.campaign.id
    }

    pub async fn name(&self) -> &str {
        &self.campaign.name
    }

    pub async fn start_date(&self) -> Option<NaiveDate> {
        self.campaign.start_date
    }

    pub async fn end_date(&self) -> Option<NaiveDate> {
        self.campaign.end_date
    }

    pub async fn kind(&self) -> CampaignKindNode {
        CampaignKindNode::from(&self.campaign.kind)
    }
}

#[derive(Union)]
pub enum CampaignsResponse {
    Response(CampaignConnector),
}

#[derive(Union)]
pub enum CampaignResponse {
    Error(NodeError),
    Response(CampaignNode),
}

impl CampaignNode {
    pub fn from_domain(campaign: Campaign) -> CampaignNode {
        CampaignNode { campaign }
    }
}

impl CampaignConnector {
    pub fn from_domain(campaigns: ListResult<Campaign>) -> CampaignConnector {
        CampaignConnector {
            total_count: campaigns.count,
            nodes: campaigns
                .rows
                .into_iter()
                .map(CampaignNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(campaigns: Vec<Campaign>) -> CampaignConnector {
        CampaignConnector {
            total_count: usize_to_u32(campaigns.len()),
            nodes: campaigns
                .into_iter()
                .map(CampaignNode::from_domain)
                .collect(),
        }
    }
}

impl CampaignSortInput {
    pub fn to_domain(self) -> CampaignSort {
        CampaignSort {
            key: CampaignSortField::from(self.key),
            desc: self.desc,
        }
    }
}
