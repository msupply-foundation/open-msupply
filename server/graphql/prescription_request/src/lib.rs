use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

pub mod mutations;
pub mod queries;
pub mod types;

use mutations::{
    delete_prescription_request, delete_prescription_request_line, insert_prescription_request,
    update_prescription_request, upsert_prescription_request_line, DeleteLineResponse, DeleteResponse,
    InsertInput, InsertResponse, UpdateInput, UpdateResponse, UpsertLineInput, UpsertLineResponse,
};
use queries::{
    get_prescription_request, get_prescription_requests, PrescriptionRequestFilterInput,
    PrescriptionRequestResponse, PrescriptionRequestSortInput, PrescriptionRequestsResponse,
};

#[derive(Default, Clone)]
pub struct PrescriptionRequestQueries;

#[Object]
impl PrescriptionRequestQueries {
    pub async fn prescription_request(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<PrescriptionRequestResponse> {
        get_prescription_request(ctx, &store_id, &id)
    }

    pub async fn prescription_requests(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<PrescriptionRequestFilterInput>,
        sort: Option<Vec<PrescriptionRequestSortInput>>,
    ) -> Result<PrescriptionRequestsResponse> {
        get_prescription_requests(ctx, &store_id, page, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct PrescriptionRequestMutations;

#[Object]
impl PrescriptionRequestMutations {
    async fn insert_prescription_request(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInput,
    ) -> Result<InsertResponse> {
        insert_prescription_request(ctx, &store_id, input)
    }

    async fn update_prescription_request(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateInput,
    ) -> Result<UpdateResponse> {
        update_prescription_request(ctx, &store_id, input)
    }

    async fn delete_prescription_request(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<DeleteResponse> {
        delete_prescription_request(ctx, &store_id, id)
    }

    async fn upsert_prescription_request_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpsertLineInput,
    ) -> Result<UpsertLineResponse> {
        upsert_prescription_request_line(ctx, &store_id, input)
    }

    async fn delete_prescription_request_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<DeleteLineResponse> {
        delete_prescription_request_line(ctx, &store_id, id)
    }
}
