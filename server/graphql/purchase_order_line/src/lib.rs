mod purchase_order_line_queries;
use crate::mutations::{
    delete::{delete_purchase_order_line, DeleteInput, DeleteResponse},
    insert::{insert_purchase_order_line, InsertInput, InsertResponse},
    insert_from_csv::{insert_purchase_order_line_from_csv, InsertFromCSVInput},
    update::{update_purchase_order_line, UpdateInput, UpdateResponse},
};
use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

pub mod mutations;
use purchase_order_line_queries::*;

#[derive(Default, Clone)]
pub struct PurchaseOrderLineQueries;

#[Object]
impl PurchaseOrderLineQueries {
    pub async fn purchase_order_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<PurchaseOrderLineResponse, async_graphql::Error> {
        get_purchase_order_line(ctx, &store_id, &id)
    }

    pub async fn purchase_order_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<PurchaseOrderLineFilterInput>,
        sort: Option<Vec<PurchaseOrderLineSortInput>>,
    ) -> Result<PurchaseOrderLinesResponse, async_graphql::Error> {
        get_purchase_order_lines(ctx, &store_id, page, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct PurchaseOrderLineMutations;

#[Object]
impl PurchaseOrderLineMutations {
    pub async fn insert_purchase_order_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInput,
    ) -> Result<InsertResponse> {
        insert_purchase_order_line(ctx, &store_id, input)
    }

    pub async fn insert_purchase_order_line_from_csv(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertFromCSVInput,
    ) -> Result<InsertResponse> {
        insert_purchase_order_line_from_csv(ctx, &store_id, input)
    }

    pub async fn update_purchase_order_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateInput,
    ) -> Result<UpdateResponse> {
        update_purchase_order_line(ctx, &store_id, input)
    }

    pub async fn delete_purchase_order_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteInput,
    ) -> Result<DeleteResponse> {
        delete_purchase_order_line(ctx, &store_id, input)
    }
}
