use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};

pub struct RequisitionCounts {
    store_id: String,
}

pub struct RequestRequisitionsNotSentCount {
    store_id: String,
}

#[Object]
impl RequisitionCounts {
    async fn new_response_requisition_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.context(self.store_id.clone(), "".to_string())?;
        let service = &service_provider.requisition_count_service;
        let count = service
            .new_response_requisition_count(&service_ctx, &self.store_id)
            .map_err(|err| StandardGraphqlError::from(err))?;

        Ok(count)
    }
}

#[Object]
impl RequestRequisitionsNotSentCount {
    async fn draft_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.context(self.store_id.clone(), "".to_string())?;
        let service = &service_provider.requisition_count_service;
        let count = service
            .draft_request_requisition_count(&service_ctx, &self.store_id)
            .map_err(|err| StandardGraphqlError::from(err))?;

        Ok(count)
    }
}

pub fn requisition_counts(ctx: &Context<'_>, store_id: String) -> Result<RequisitionCounts> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::RequisitionStats,
            store_id: Some(store_id.clone()),
        },
    )?;

    Ok(RequisitionCounts { store_id })
}

pub fn request_requisition_counts(
    ctx: &Context<'_>,
    store_id: String,
) -> Result<RequestRequisitionsNotSentCount> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::RequisitionStats,
            store_id: Some(store_id.clone()),
        },
    )?;

    Ok(RequestRequisitionsNotSentCount { store_id })
}
