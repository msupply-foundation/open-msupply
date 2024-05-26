use async_graphql::*;

use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

pub mod types;
use repository::{DemographicIndicatorFilter, DemographicProjectionFilter, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};
use types::{
    DemographicIndicatorConnector, DemographicIndicatorSortInput, DemographicProjectionConnector,
    DemographicProjectionFilterInput, DemographicProjectionSortInput,
    DemographicProjectionsResponse,
};
use types::{DemographicIndicatorFilterInput, DemographicIndicatorsResponse};

#[derive(Default, Clone)]
pub struct DemographicIndicatorQueries;

#[Object]
impl DemographicIndicatorQueries {
    pub async fn demographic_indicators(
        &self,
        ctx: &Context<'_>,
        page: Option<PaginationInput>,
        filter: Option<DemographicIndicatorFilterInput>,
        sort: Option<Vec<DemographicIndicatorSortInput>>,
    ) -> Result<DemographicIndicatorsResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryAsset,
                store_id: None,
            },
        )?;
        let service_provider = ctx.service_provider();
        let service_context = service_provider.context("".to_string(), user.user_id)?;

        let assets = service_provider
            .demographic_service
            .get_demographic_indicators(
                &service_context.connection,
                page.map(PaginationOption::from),
                filter.map(DemographicIndicatorFilter::from),
                // Currently only one sort option is supported, use the first from the list.
                sort.and_then(|mut sort_list| sort_list.pop())
                    .map(|sort| sort.to_domain()),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(DemographicIndicatorsResponse::Response(
            DemographicIndicatorConnector::from_domain(assets),
        ))
    }

    pub async fn demographic_projections(
        &self,
        ctx: &Context<'_>,
        page: Option<PaginationInput>,
        filter: Option<DemographicProjectionFilterInput>,
        sort: Option<Vec<DemographicProjectionSortInput>>,
    ) -> Result<DemographicProjectionsResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryAsset,
                store_id: None,
            },
        )?;
        let service_provider = ctx.service_provider();
        let service_context = service_provider.context("".to_string(), user.user_id)?;

        let assets = service_provider
            .demographic_service
            .get_demographic_projections(
                &service_context.connection,
                page.map(PaginationOption::from),
                filter.map(DemographicProjectionFilter::from),
                // Currently only one sort option is supported, use the first from the list.
                sort.and_then(|mut sort_list| sort_list.pop())
                    .map(|sort| sort.to_domain()),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(DemographicProjectionsResponse::Response(
            DemographicProjectionConnector::from_domain(assets),
        ))
    }
}
