pub mod mutations;
mod program_settings;
mod requisition_queries;
use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_types::types::RequisitionNodeType;
use program_settings::{
    get_customer_program_requisition_settings, get_supplier_program_requisition_settings,
    CustomerProgramRequisitionSettingNode, SupplierProgramRequisitionSettingNode,
};

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

    pub async fn supplier_program_requisition_settings(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<Vec<SupplierProgramRequisitionSettingNode>> {
        get_supplier_program_requisition_settings(ctx, &store_id)
    }

    pub async fn customer_program_requisition_settings(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<Vec<CustomerProgramRequisitionSettingNode>> {
        get_customer_program_requisition_settings(ctx, &store_id)
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
        input: request_requisition::insert::InsertInput,
    ) -> Result<request_requisition::insert::InsertResponse> {
        request_requisition::insert::insert(ctx, &store_id, input)
    }

    async fn insert_program_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::insert_program::InsertProgramRequestRequisitionInput,
    ) -> Result<request_requisition::insert_program::InsertResponse> {
        request_requisition::insert_program::insert_program(ctx, &store_id, input)
    }

    async fn update_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::update::UpdateInput,
    ) -> Result<request_requisition::update::UpdateResponse> {
        request_requisition::update::update(ctx, &store_id, input)
    }

    async fn delete_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::delete::DeleteInput,
    ) -> Result<request_requisition::delete::DeleteResponse> {
        request_requisition::delete::delete(ctx, &store_id, input)
    }

    /// Set requested for each line in request requisition to calculated
    async fn use_suggested_quantity(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::use_suggested_quantity::UseSuggestedQuantityInput,
    ) -> Result<request_requisition::use_suggested_quantity::UseSuggestedQuantityResponse> {
        request_requisition::use_suggested_quantity::use_suggested_quantity(ctx, &store_id, input)
    }

    /// Add requisition lines from master item master list
    async fn add_from_master_list(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::add_from_master_list::AddFromMasterListInput,
    ) -> Result<request_requisition::add_from_master_list::AddFromMasterListResponse> {
        request_requisition::add_from_master_list::add_from_master_list(ctx, &store_id, input)
    }

    async fn insert_response_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition::insert::InsertInput,
    ) -> Result<response_requisition::insert::InsertResponse> {
        response_requisition::insert::insert(ctx, &store_id, input)
    }

    async fn insert_program_response_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition::insert_program::InsertProgramResponseRequisitionInput,
    ) -> Result<response_requisition::insert_program::InsertResponse> {
        response_requisition::insert_program::insert_program(ctx, &store_id, input)
    }

    async fn update_response_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition::update::UpdateInput,
    ) -> Result<response_requisition::update::UpdateResponse> {
        response_requisition::update::update(ctx, &store_id, input)
    }
    /// Set supply quantity to requested quantity
    async fn supply_requested_quantity(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition::supply_requested_quantity::SupplyRequestedQuantityInput,
    ) -> Result<response_requisition::supply_requested_quantity::SupplyRequestedQuantityResponse>
    {
        response_requisition::supply_requested_quantity::supply_requested_quantity(
            ctx, &store_id, input,
        )
    }

    /// Create shipment for response requisition
    /// Will create Outbound Shipment with placeholder lines for each requisition line
    /// placeholder line quantity will be set to requisitionLine.supply - all linked outbound shipments
    /// lines quantity (placeholder and filled) for requisitionLine.item
    async fn create_requisition_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition::create_requisition_shipment::CreateRequisitionShipmentInput,
    ) -> Result<response_requisition::create_requisition_shipment::CreateRequisitionShipmentResponse>
    {
        response_requisition::create_requisition_shipment::create_requisition_shipment(
            ctx, &store_id, input,
        )
    }
}

#[cfg(test)]
mod query_tests;
