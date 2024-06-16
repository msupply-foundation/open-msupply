use async_graphql::*;

use graphql_core::{
    pagination::PaginationInput,
    simple_generic_errors::{NodeError, NodeErrorInterface},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

pub mod mutations;
pub use mutations::*;
pub mod types;
use repository::{
    demographic_projection::DemographicProjectionFilter, DemographicIndicatorFilter,
    PaginationOption,
};
use service::auth::{Resource, ResourceAccessRequest};
use types::{
    DemographicIndicatorConnector, DemographicIndicatorSortInput, DemographicProjectionConnector,
    DemographicProjectionFilterInput, DemographicProjectionNode, DemographicProjectionSortInput,
    DemographicProjectionsResponse,
};
use types::{DemographicIndicatorFilterInput, DemographicIndicatorsResponse};

#[derive(Default, Clone)]
pub struct DemographicIndicatorQueries;

#[derive(Union)]
pub enum DemographicProjectionResponse {
    Error(NodeError),
    Response(DemographicProjectionNode),
}

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

        let demographic_indicators = service_provider
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
            DemographicIndicatorConnector::from_domain(demographic_indicators),
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
    pub async fn demographic_projection_by_base_year(
        &self,
        ctx: &Context<'_>,
        base_year: i32,
    ) -> Result<DemographicProjectionResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryAsset,
                store_id: None,
            },
        )?;
        let service_provider = ctx.service_provider();
        let service_context = service_provider.context("".to_string(), user.user_id)?;

        let projection_option = service_provider
            .demographic_service
            .get_projection_by_base_year(&service_context, base_year)
            .map_err(StandardGraphqlError::from_repository_error)?;

        let response = match projection_option {
            Some(projection) => DemographicProjectionResponse::Response(
                DemographicProjectionNode::from_domain(projection),
            ),
            None => DemographicProjectionResponse::Error(NodeError {
                error: NodeErrorInterface::record_not_found(),
            }),
        };

        Ok(response)
    }
}

#[derive(Default, Clone)]
pub struct DemographicMutations;

#[Object]
impl DemographicMutations {
    async fn insert_demographic_indicator(
        &self,
        ctx: &Context<'_>,
        input: InsertDemographicIndicatorInput,
    ) -> Result<InsertDemographicIndicatorResponse> {
        insert_demographic_indicator(ctx, input)
    }

    async fn insert_demographic_projection(
        &self,
        ctx: &Context<'_>,
        input: InsertDemographicProjectionInput,
    ) -> Result<InsertDemographicProjectionResponse> {
        insert_demographic_projection(ctx, input)
    }

    async fn update_demographic_indicator(
        &self,
        ctx: &Context<'_>,
        input: UpdateDemographicIndicatorInput,
    ) -> Result<UpdateDemographicIndicatorResponse> {
        update_demographic_indicator(ctx, input)
    }

    async fn update_demographic_projection(
        &self,
        ctx: &Context<'_>,
        input: UpdateDemographicProjectionInput,
    ) -> Result<UpdateDemographicProjectionResponse> {
        update_demographic_projection(ctx, input)
    }
}
