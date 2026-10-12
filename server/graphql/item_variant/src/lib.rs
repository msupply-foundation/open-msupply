use async_graphql::*;
use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use graphql_types::types::ItemVariantNode;
use repository::PaginationOption;
use service::auth::{Resource, ResourceAccessRequest};

mod mutations;
use self::mutations::*;

#[derive(Default, Clone)]
pub struct ItemVariantQueries;

#[Object]
impl ItemVariantQueries {
    /// Whether any item has variants. Auto-created variants, which only hold a
    /// barcode, don't count.
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
                require_central_standalone: false,
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        let item_variants = service_provider
            .item_service
            .get_item_variants(
                &service_context,
                Some(PaginationOption {
                    limit: Some(1),
                    offset: None,
                }),
                None,
                None,
            )
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
        upsert_item_variant(ctx, store_id, input)
    }

    async fn delete_item_variant(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteItemVariantInput,
    ) -> Result<DeleteItemVariantResponse> {
        delete_item_variant(ctx, store_id, input)
    }

    /// Makes a variant central created to hold a barcode a real one, so it shows
    /// in variant lists and pickers. Its id stays the same.
    async fn promote_item_variant(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<ItemVariantNode> {
        promote_item_variant(ctx, store_id, id)
    }
}
