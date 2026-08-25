use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

pub mod mutations;
pub mod queries;
pub mod types;

use mutations::{
    delete_prescription_order, delete_prescription_order_line, insert_prescription_order,
    update_prescription_order, upsert_prescription_order_line, DeleteLineResponse, DeleteResponse,
    InsertInput, InsertResponse, UpdateInput, UpdateResponse, UpsertLineInput, UpsertLineResponse,
};
use queries::{
    get_prescription_order, get_prescription_orders, PrescriptionOrderFilterInput,
    PrescriptionOrderResponse, PrescriptionOrderSortInput, PrescriptionOrdersResponse,
};

#[derive(Default, Clone)]
pub struct PrescriptionOrderQueries;

#[Object]
impl PrescriptionOrderQueries {
    pub async fn prescription_order(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<PrescriptionOrderResponse> {
        get_prescription_order(ctx, &store_id, &id)
    }

    pub async fn prescription_orders(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<PrescriptionOrderFilterInput>,
        sort: Option<Vec<PrescriptionOrderSortInput>>,
    ) -> Result<PrescriptionOrdersResponse> {
        get_prescription_orders(ctx, &store_id, page, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct PrescriptionOrderMutations;

#[Object]
impl PrescriptionOrderMutations {
    async fn insert_prescription_order(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInput,
    ) -> Result<InsertResponse> {
        insert_prescription_order(ctx, &store_id, input)
    }

    async fn update_prescription_order(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateInput,
    ) -> Result<UpdateResponse> {
        update_prescription_order(ctx, &store_id, input)
    }

    async fn delete_prescription_order(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<DeleteResponse> {
        delete_prescription_order(ctx, &store_id, id)
    }

    async fn upsert_prescription_order_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpsertLineInput,
    ) -> Result<UpsertLineResponse> {
        upsert_prescription_order_line(ctx, &store_id, input)
    }

    async fn delete_prescription_order_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<DeleteLineResponse> {
        delete_prescription_order_line(ctx, &store_id, id)
    }
}
