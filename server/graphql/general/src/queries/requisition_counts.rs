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

pub struct EmergencyResponseRequisitionCounts {
    store_id: String,
}

#[Object]
impl ResponseRequisitionCounts {
    async fn new(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider_data();
        let store_id = self.store_id.clone();

        let count = tokio::task::spawn_blocking(move || -> Result<i64, repository::RepositoryError> {
            let service_ctx = service_provider.context(store_id.clone(), "".to_string())?;
            let service = &service_provider.requisition_count_service;
            service.new_response_requisition_count(&service_ctx, &store_id)
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
        .map_err(StandardGraphqlError::from_repository_error)?;

        Ok(count)
    }
}

#[Object]
impl RequestRequisitionCounts {
    async fn draft(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider_data();
        let store_id = self.store_id.clone();

        let count = tokio::task::spawn_blocking(move || -> Result<i64, repository::RepositoryError> {
            let service_ctx = service_provider.context(store_id.clone(), "".to_string())?;
            let service = &service_provider.requisition_count_service;
            service.draft_request_requisition_count(&service_ctx, &store_id)
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
        .map_err(StandardGraphqlError::from_repository_error)?;

        Ok(count)
    }
}

#[Object]
impl EmergencyResponseRequisitionCounts {
    async fn new(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider_data();
        let store_id = self.store_id.clone();

        let count = tokio::task::spawn_blocking(move || -> Result<i64, repository::RepositoryError> {
            let service_ctx = service_provider.context(store_id.clone(), "".to_string())?;
            let service = &service_provider.requisition_count_service;
            service.new_emergency_response_requisition_count(&service_ctx, &store_id)
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
        .map_err(StandardGraphqlError::from_repository_error)?;

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

    async fn emergency(&self) -> EmergencyResponseRequisitionCounts {
        EmergencyResponseRequisitionCounts {
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
