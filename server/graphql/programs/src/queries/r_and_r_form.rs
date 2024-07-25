use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    simple_generic_errors::{ErrorWrapper, NodeErrorInterface, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use graphql_types::types::rnr_form::RnRFormNode;
use repository::{PaginationOption, RnRFormFilter};
use service::auth::{Resource, ResourceAccessRequest};

use crate::types::{
    period_schedule::{PeriodSchedulesConnector, PeriodSchedulesResponse},
    r_and_r_form::{
        RnRFormConnector, RnRFormFilterInput, RnRFormResponse, RnRFormSortInput, RnRFormsResponse,
    },
};

pub fn r_and_r_forms(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<RnRFormFilterInput>,
    sort: Option<RnRFormSortInput>,
) -> Result<RnRFormsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryRnRForms,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let context = service_provider.context(store_id.clone(), user.user_id)?;

    let list_result = service_provider
        .rnr_form_service
        .get_rnr_forms(
            &context,
            &store_id,
            page.map(PaginationOption::from),
            filter.map(RnRFormFilter::from),
            sort.map(RnRFormSortInput::to_domain),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(RnRFormsResponse::Response(RnRFormConnector::from_domain(
        list_result,
    )))
}

pub fn r_and_r_form(
    ctx: &Context<'_>,
    store_id: String,
    rnr_form_id: String,
) -> Result<RnRFormResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryRnRForms,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let context = service_provider.context(store_id.clone(), user.user_id)?;

    match service_provider
        .rnr_form_service
        .get_rnr_form(&context, &store_id, rnr_form_id)
        .map_err(StandardGraphqlError::from_repository_error)
    {
        Ok(form) => {
            let result = match form {
                Some(r_and_r_form) => {
                    RnRFormResponse::Response(RnRFormNode::from_domain(r_and_r_form))
                }
                None => RnRFormResponse::Error(ErrorWrapper {
                    error: NodeErrorInterface::RecordNotFound(RecordNotFound {}),
                }),
            };
            Ok(result)
        }

        Err(err) => Err(err),
    }
}

pub fn get_schedules_with_periods_by_program(
    ctx: &Context<'_>,
    store_id: String,
    program_id: String,
) -> Result<PeriodSchedulesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryRnRForms,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let context = service_provider.context(store_id, user.user_id)?;

    let result = service_provider
        .rnr_form_service
        .get_schedules_with_periods_by_program(&context, &program_id)
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(PeriodSchedulesResponse::Response(
        PeriodSchedulesConnector::from_domain(result),
    ))
}
