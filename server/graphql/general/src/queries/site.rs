use async_graphql::*;
use graphql_core::generic_filters::{EqualFilterNumberInput, StringFilterInput};
use repository::{EqualFilter, SiteFilter, SiteRow, SiteSort, SiteSortField, StringFilter};
use service::ListResult;

pub struct SiteNode {
    pub site: SiteRow,
}

#[Object]
impl SiteNode {
    pub async fn id(&self) -> i32 {
        self.site.id
    }

    pub async fn name(&self) -> &str {
        &self.site.name
    }

    pub async fn hardware_id(&self) -> Option<&str> {
        self.site.hardware_id.as_deref()
    }
}

#[derive(InputObject, Clone)]
pub struct SiteFilterInput {
    pub id: Option<EqualFilterNumberInput>,
    pub name: Option<StringFilterInput>,
}

impl From<SiteFilterInput> for SiteFilter {
    fn from(f: SiteFilterInput) -> Self {
        SiteFilter {
            id: f.id.map(EqualFilter::from),
            name: f.name.map(StringFilter::from),
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::SiteSortField")]
pub enum SiteSortFieldInput {
    Id,
    Name,
}

#[derive(InputObject)]
pub struct SiteSortInput {
    key: SiteSortFieldInput,
    desc: Option<bool>,
}

impl SiteSortInput {
    pub fn to_domain(self) -> SiteSort {
        SiteSort {
            key: SiteSortField::from(self.key),
            desc: self.desc,
        }
    }
}

#[derive(SimpleObject)]
pub struct SiteConnector {
    pub total_count: u32,
    pub nodes: Vec<SiteNode>,
}

impl SiteConnector {
    pub fn from_domain(result: ListResult<SiteRow>) -> Self {
        SiteConnector {
            total_count: result.count,
            nodes: result
                .rows
                .into_iter()
                .map(|site| SiteNode { site })
                .collect(),
        }
    }
}

#[derive(Union)]
pub enum SitesResponse {
    Response(SiteConnector),
}
