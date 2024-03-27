use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};

pub struct RequisitionCounts {
    store_id: String,
}

pub struct ResponseRequisitionCounts {
    store_id: String,
}

pub struct RequestRequisitionCounts {
    store_id: String,
}

#[Object]
impl ResponseRequisitionCounts {
    async fn new(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.context(self.store_id.clone(), "".to_string())?;
        let service = &service_provider.requisition_count_service;
        let count = service
            .new_response_requisition_count(&service_ctx, &self.store_id)
            .map_err(StandardGraphqlError::from)?;

        Ok(count)
    }
}

#[Object]
impl RequestRequisitionCounts {
    async fn draft(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.context(self.store_id.clone(), "".to_string())?;
        let service = &service_provider.requisition_count_service;
        let count = service
            .draft_request_requisition_count(&service_ctx, &self.store_id)
            .map_err(StandardGraphqlError::from)?;

        Ok(count)
    }
}

#[Object]
impl RequisitionCounts {
    async fn response(&self) -> ResponseRequisitionCounts {
        ResponseRequisitionCounts {
            store_id: self.store_id.clone(),
        }
    }

    async fn request(&self) -> RequestRequisitionCounts {
        RequestRequisitionCounts {
            store_id: self.store_id.clone(),
        }
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
