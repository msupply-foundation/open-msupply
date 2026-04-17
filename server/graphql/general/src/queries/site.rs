use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterNumberInput, StringFilterInput},
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{
    EqualFilter, PaginationOption, SiteFilter, SiteRow, SiteSort, SiteSortField, StringFilter,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    ListResult,
};

pub fn sites(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<SiteFilterInput>,
    sort: Option<Vec<SiteSortInput>>,
) -> Result<SitesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateSites,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .site_service
        .get_sites(
            &service_context,
            page.map(PaginationOption::from),
            filter.map(|f| f.into()),
            sort.and_then(|mut s| s.pop()).map(|s| s.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(SitesResponse::Response(SiteConnector::from_domain(result)))
}

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
