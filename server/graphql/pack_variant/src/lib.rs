use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::*;
use service::auth::{Resource, ResourceAccessRequest};

mod mutations;
use self::mutations::*;

#[derive(Default, Clone)]
pub struct PackVariantQueries;

#[Object]
impl PackVariantQueries {
    pub async fn pack_variants(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<ItemPackVariantConnector> {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryItems,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id, "".to_string())?;
        let pack_variant_service = &service_provider.pack_variant_service;

        let pack_variants = pack_variant_service.get_pack_variants(&service_context)?;

        Ok(ItemPackVariantConnector {
            total_count: pack_variants.len() as u32,
            nodes: ItemPackVariantNode::from_vec(pack_variants),
        })
    }
}

#[derive(Default, Clone)]
pub struct PackVariantMutations;

#[Object]
impl PackVariantMutations {
    async fn insert_pack_variant(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertPackVariantInput,
    ) -> Result<InsertResponse> {
        insert_pack_variant(ctx, store_id, input)
    }

    async fn update_pack_variant(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdatePackVariantInput,
    ) -> Result<UpdateResponse> {
        update_pack_variant(ctx, store_id, input)
    }

    async fn delete_pack_variant(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeletePackVariantInput,
    ) -> Result<DeletePackVariantResponse> {
        delete_pack_variant(ctx, store_id, input)
    }
}
