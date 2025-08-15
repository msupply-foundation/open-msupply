mod goods_received_line_queries;
use crate::mutations::{
    delete::{delete_goods_received_line, DeleteResponse},
    insert::{
        insert_goods_received_line, insert_goods_received_lines_from_purchase_order, InsertInput,
        InsertLinesInput, InsertLinesResponse, InsertResponse,
    },
    update::{update_goods_received_line, UpdateInput, UpdateResponse},
};
use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

pub mod mutations;
use goods_received_line_queries::*;

#[derive(Default, Clone)]
pub struct GoodsReceivedLineQueries;

#[Object]
impl GoodsReceivedLineQueries {
    pub async fn goods_received_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<GoodsReceivedLineResponse, async_graphql::Error> {
        get_goods_received_line(ctx, &store_id, &id)
    }

    pub async fn goods_received_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<GoodsReceivedLineFilterInput>,
        sort: Option<Vec<GoodsReceivedLineSortInput>>,
    ) -> Result<GoodsReceivedLinesResponse, async_graphql::Error> {
        get_goods_received_lines(ctx, &store_id, page, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct GoodsReceivedLineMutations;

#[Object]
impl GoodsReceivedLineMutations {
    pub async fn insert_goods_received_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInput,
    ) -> Result<InsertResponse> {
        insert_goods_received_line(ctx, &store_id, input)
    }

    pub async fn insert_goods_received_lines_from_purchase_order(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertLinesInput,
    ) -> Result<InsertLinesResponse> {
        insert_goods_received_lines_from_purchase_order(ctx, &store_id, input)
    }

    pub async fn update_goods_received_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateInput,
    ) -> Result<UpdateResponse> {
        update_goods_received_line(ctx, &store_id, input)
    }

    pub async fn delete_goods_received_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<DeleteResponse> {
        delete_goods_received_line(ctx, &store_id, id)
    }
}
