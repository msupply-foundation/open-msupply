use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

pub mod mutations;
pub mod query;
pub mod types;

use mutations::{
    delete::{delete, DeleteResponse},
    insert::{insert_goods_received, InsertInput, InsertResponse},
    update::{update_goods_received, UpdateInput, UpdateResponse},
};
use query::*;

#[derive(Default, Clone)]
pub struct GoodsReceivedQueries;

#[Object]
impl GoodsReceivedQueries {
    pub async fn goods_received(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<GoodsReceivedResponse, async_graphql::Error> {
        get_goods_received(ctx, &store_id, &id)
    }

    pub async fn goods_received_list(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<GoodsReceivedFilterInput>,
        sort: Option<Vec<GoodsReceivedSortInput>>,
    ) -> Result<GoodsReceivedListResponse, async_graphql::Error> {
        get_goods_received_list(ctx, &store_id, page, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct GoodsReceivedMutations;

#[Object]
impl GoodsReceivedMutations {
    pub async fn insert_goods_received(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInput,
    ) -> Result<InsertResponse> {
        insert_goods_received(ctx, &store_id, input)
    }

    pub async fn update_goods_received(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateInput,
    ) -> Result<UpdateResponse> {
        update_goods_received(ctx, &store_id, input)
    }

    pub async fn delete_goods_received(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<DeleteResponse> {
        delete(ctx, &store_id, id)
    }
}
