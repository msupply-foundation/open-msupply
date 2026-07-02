use async_graphql::*;
use chrono::NaiveDateTime;
use graphql_core::{
    generic_filters::{EqualFilterNumberInput, StringFilterInput},
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{
    EqualFilter, PaginationOption, SiteFilter, SiteRow, SiteSort, SiteSortField, StringFilter,
    SyncVersion,
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
            require_central_standalone: false,
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

    pub async fn code(&self) -> &str {
        &self.site.code
    }

    pub async fn name(&self) -> &str {
        &self.site.name
    }

    pub async fn hardware_id(&self) -> Option<&str> {
        self.site.hardware_id.as_deref()
    }

    /// Which sync flow the site runs. Hardware-id / token clearing is only
    /// permitted for v7 sites. See issue #11784.
    pub async fn sync_version(&self) -> SyncVersionNode {
        self.site.sync_version.into()
    }

    /// Client application of the remote site (e.g. "open mSupply"). Tracked from
    /// v7 sync activity; null for sites that have not synced over v7.
    pub async fn app_name(&self) -> Option<&str> {
        self.site.app_name.as_deref()
    }

    /// Remote site's application version, as last reported during v7 sync.
    pub async fn app_version(&self) -> Option<&str> {
        self.site.app_version.as_deref()
    }

    /// Last time the remote made any authenticated v7 request.
    pub async fn last_connection_datetime(&self) -> Option<NaiveDateTime> {
        self.site.last_connection_datetime
    }

    /// Last time the remote fully pulled from this central server.
    pub async fn last_sync_datetime(&self) -> Option<NaiveDateTime> {
        self.site.last_sync_datetime
    }

    /// First time the remote completed an initialising pull.
    pub async fn first_sync_datetime(&self) -> Option<NaiveDateTime> {
        self.site.first_sync_datetime
    }

    pub async fn is_multi_device(&self) -> bool {
        self.site.is_multi_device
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum SyncVersionNode {
    V5V6,
    V7,
}

impl From<SyncVersion> for SyncVersionNode {
    fn from(version: SyncVersion) -> Self {
        match version {
            SyncVersion::V5V6 => SyncVersionNode::V5V6,
            SyncVersion::V7 => SyncVersionNode::V7,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct SiteFilterInput {
    pub id: Option<EqualFilterNumberInput>,
    pub code: Option<StringFilterInput>,
    pub name: Option<StringFilterInput>,
}

impl From<SiteFilterInput> for SiteFilter {
    fn from(f: SiteFilterInput) -> Self {
        SiteFilter {
            id: f.id.map(EqualFilter::from),
            code: f.code.map(StringFilter::from),
            name: f.name.map(StringFilter::from),
            token: None,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::SiteSortField")]
pub enum SiteSortFieldInput {
    Id,
    Code,
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
