pub mod mutations;
mod requisition_queries;
use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_types::types::RequisitionNodeType;

use self::mutations::{request_requisition, response_requisition};
use self::requisition_queries::*;
#[derive(Default, Clone)]
pub struct RequisitionQueries;

#[Object]
impl RequisitionQueries {
    pub async fn requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<RequisitionResponse> {
        get_requisition(ctx, &store_id, &id)
    }

    pub async fn requisitions(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<RequisitionFilterInput>,
        sort: Option<Vec<RequisitionSortInput>>,
    ) -> Result<RequisitionsResponse> {
        get_requisitions(ctx, &store_id, page, filter, sort)
    }

    pub async fn requisition_by_number(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        requisition_number: u32,
        r#type: RequisitionNodeType,
    ) -> Result<RequisitionResponse> {
        get_requisition_by_number(ctx, &store_id, requisition_number, r#type)
    }
}

#[derive(Default, Clone)]
pub struct RequisitionMutations;

#[Object]
impl RequisitionMutations {
    async fn insert_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::InsertInput,
    ) -> Result<request_requisition::InsertResponse> {
        request_requisition::insert(ctx, &store_id, input)
    }

    async fn update_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::UpdateInput,
    ) -> Result<request_requisition::UpdateResponse> {
        request_requisition::update(ctx, &store_id, input)
    }

    async fn delete_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::DeleteInput,
    ) -> Result<request_requisition::DeleteResponse> {
        request_requisition::delete(ctx, &store_id, input)
    }

    /// Set requested for each line in request requisition to calculated
    async fn use_suggested_quantity(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::UseSuggestedQuantityInput,
    ) -> Result<request_requisition::UseSuggestedQuantityResponse> {
        request_requisition::use_suggested_quantity(ctx, &store_id, input)
    }

    /// Add requisition lines from master item master list
    async fn add_from_master_list(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::AddFromMasterListInput,
    ) -> Result<request_requisition::AddFromMasterListResponse> {
        request_requisition::add_from_master_list(ctx, &store_id, input)
    }

    async fn update_response_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition::UpdateInput,
    ) -> Result<response_requisition::UpdateResponse> {
        response_requisition::update(ctx, &store_id, input)
    }
    /// Set supply quantity to requested quantity
    async fn supply_requested_quantity(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition::SupplyRequestedQuantityInput,
    ) -> Result<response_requisition::SupplyRequestedQuantityResponse> {
        response_requisition::supply_requested_quantity(ctx, &store_id, input)
    }

    /// Create shipment for response requisition
    /// Will create Outbound Shipment with placeholder lines for each requisition line
    /// placeholder line quantity will be set to requisitionLine.supply - all linked outbound shipments
    /// lines quantity (placeholder and filled) for requisitionLine.item
    async fn create_requisition_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition::CreateRequisitionShipmentInput,
    ) -> Result<response_requisition::CreateRequisitionShipmentResponse> {
        response_requisition::create_requisition_shipment(ctx, &store_id, input)
    }
}

#[cfg(test)]
mod query_tests;
