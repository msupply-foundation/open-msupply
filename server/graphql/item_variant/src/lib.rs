use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::PaginationOption;
use service::{
    auth::{Resource, ResourceAccessRequest},
    ListError,
};

mod mutations;
use self::mutations::*;

#[derive(Default, Clone)]
pub struct ItemVariantQueries;

#[Object]
impl ItemVariantQueries {
    pub async fn item_variants_configured(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<bool> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryItems,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider_data();

        let item_variants = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
            let service_context = service_provider.context(store_id.clone(), user.user_id)?;
            service_provider.item_service.get_item_variants(
                &service_context,
                Some(PaginationOption {
                    limit: Some(1),
                    offset: None,
                }),
                None,
                None,
            )
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
        .map_err(StandardGraphqlError::from_list_error)?;

        Ok(item_variants.count > 0)
    }
}

#[derive(Default, Clone)]
pub struct ItemVariantMutations;

#[Object]
impl ItemVariantMutations {
    async fn upsert_item_variant(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpsertItemVariantInput,
    ) -> Result<UpsertItemVariantResponse> {
        upsert_item_variant(ctx, store_id, input).await
    }

    async fn delete_item_variant(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteItemVariantInput,
    ) -> Result<DeleteItemVariantResponse> {
        delete_item_variant(ctx, store_id, input).await
    }
}
