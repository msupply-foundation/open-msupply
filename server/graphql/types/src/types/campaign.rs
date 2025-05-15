use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::simple_generic_errors::NodeError;
use graphql_core::ContextExt;
use repository::campaign::campaign::{Campaign, CampaignFilter, CampaignSort, CampaignSortField};
use repository::{EqualFilter, StringFilter};
use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum CampaignSortFieldInput {
    Name,
    StartDate,
}

#[derive(InputObject)]
pub struct CampaignSortInput {
    /// Sort query result by `key`
    key: CampaignSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct CampaignFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterStringInput {
    pub equal_to: Option<String>,
    pub equal_any: Option<Vec<String>>,
    pub not_equal_to: Option<String>,
}

#[derive(InputObject, Clone)]
pub struct StringFilterInput {
    pub equal_to: Option<String>,
    pub like: Option<String>,
}

impl From<EqualFilterStringInput> for EqualFilter<String> {
    fn from(f: EqualFilterStringInput) -> Self {
        EqualFilter {
            equal_to: f.equal_to,
            equal_any: f.equal_any,
            not_equal_to: f.not_equal_to,
            not_equal_any: None, // Not exposed in GraphQL
        }
    }
}

impl From<StringFilterInput> for StringFilter {
    fn from(f: StringFilterInput) -> Self {
        StringFilter {
            equal_to: f.equal_to,
            like: f.like,
            not_equal_to: None, // Not exposed in GraphQL
            starts_with: None,   // Not exposed in GraphQL
            ends_with: None,     // Not exposed in GraphQL
            equal_any: None,     // Not exposed in GraphQL
        }
    }
}

impl From<CampaignFilterInput> for CampaignFilter {
    fn from(f: CampaignFilterInput) -> Self {
        CampaignFilter {
            id: f.id.map(EqualFilter::from),
            name: f.name.map(StringFilter::from),
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
        use CampaignSortField as to;
        use CampaignSortFieldInput as from;
        let key = match self.key {
            from::Name => to::Name,
            from::StartDate => to::StartDate,
        };

        CampaignSort {
            key,
            desc: self.desc,
        }
    }
}
