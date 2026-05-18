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
    demographic::DemographicFilter, demographic_projection::DemographicProjectionFilter,
    DemographicIndicatorFilter, PaginationOption, RepositoryError,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    ListError,
};
use types::{
    DemographicConnector, DemographicFilterInput, DemographicIndicatorConnector,
    DemographicIndicatorSortInput, DemographicProjectionConnector,
    DemographicProjectionFilterInput, DemographicProjectionNode, DemographicProjectionSortInput,
    DemographicProjectionsResponse, DemographicSortInput, DemographicsResponse,
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
    pub async fn demographics(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<DemographicFilterInput>,
        sort: Option<Vec<DemographicSortInput>>,
    ) -> Result<DemographicsResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryDemographic,
                store_id: Some(store_id.clone()),
            },
        )?;
        let service_provider = ctx.service_provider_data();
        let pagination = page.map(PaginationOption::from);
        let domain_filter = filter.map(DemographicFilter::from);
        // Currently only one sort option is supported, use the first from the list.
        let domain_sort = sort
            .and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain());

        let demographics = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
            let service_context = service_provider.context(store_id, user.user_id)?;
            service_provider.demographic_service.get_demographics(
                &service_context.connection,
                pagination,
                domain_filter,
                domain_sort,
            )
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
        .map_err(StandardGraphqlError::from_list_error)?;

        Ok(DemographicsResponse::Response(
            DemographicConnector::from_domain(demographics),
        ))
    }

    pub async fn demographic_indicators(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<DemographicIndicatorFilterInput>,
        sort: Option<Vec<DemographicIndicatorSortInput>>,
    ) -> Result<DemographicIndicatorsResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryDemographic,
                store_id: Some(store_id.clone()),
            },
        )?;
        let service_provider = ctx.service_provider_data();
        let pagination = page.map(PaginationOption::from);
        let domain_filter = filter.map(DemographicIndicatorFilter::from);
        // Currently only one sort option is supported, use the first from the list.
        let domain_sort = sort
            .and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain());

        let demographic_indicators = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
            let service_context = service_provider.context(store_id, user.user_id)?;
            service_provider
                .demographic_service
                .get_demographic_indicators(
                    &service_context.connection,
                    pagination,
                    domain_filter,
                    domain_sort,
                )
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
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
                resource: Resource::QueryDemographic,
                store_id: None,
            },
        )?;
        let service_provider = ctx.service_provider_data();
        let pagination = page.map(PaginationOption::from);
        let domain_filter = filter.map(DemographicProjectionFilter::from);
        // Currently only one sort option is supported, use the first from the list.
        let domain_sort = sort
            .and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain());

        let assets = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
            let service_context = service_provider.context("".to_string(), user.user_id)?;
            service_provider
                .demographic_service
                .get_demographic_projections(
                    &service_context.connection,
                    pagination,
                    domain_filter,
                    domain_sort,
                )
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
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
                resource: Resource::QueryDemographic,
                store_id: None,
            },
        )?;
        let service_provider = ctx.service_provider_data();

        let projection_option =
            tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
                let service_context = service_provider.context("".to_string(), user.user_id)?;
                service_provider
                    .demographic_service
                    .get_projection_by_base_year(&service_context, base_year)
            })
            .await
            .map_err(StandardGraphqlError::from_join_error)??;

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
        insert_demographic_indicator(ctx, input).await
    }

    async fn insert_demographic_projection(
        &self,
        ctx: &Context<'_>,
        input: InsertDemographicProjectionInput,
    ) -> Result<InsertDemographicProjectionResponse> {
        insert_demographic_projection(ctx, input).await
    }

    async fn update_demographic_indicator(
        &self,
        ctx: &Context<'_>,
        input: UpdateDemographicIndicatorInput,
    ) -> Result<UpdateDemographicIndicatorResponse> {
        update_demographic_indicator(ctx, input).await
    }

    async fn update_demographic_projection(
        &self,
        ctx: &Context<'_>,
        input: UpdateDemographicProjectionInput,
    ) -> Result<UpdateDemographicProjectionResponse> {
        update_demographic_projection(ctx, input).await
    }
}
