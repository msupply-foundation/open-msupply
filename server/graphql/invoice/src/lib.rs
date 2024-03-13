use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_types::types::*;
use mutations::AddToShipmentFromMasterListInput;

pub mod invoice_queries;
use self::invoice_queries::*;

pub mod mutations;
use self::mutations::{
    inbound_return, inbound_shipment, outbound_return, outbound_shipment, prescription,
};

#[cfg(test)]
mod query_tests;

#[derive(Default, Clone)]
pub struct InvoiceQueries;

#[Object]
impl InvoiceQueries {
    pub async fn invoice(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "id of the invoice")] id: String,
    ) -> Result<InvoiceResponse> {
        get_invoice(ctx, Some(store_id), &id)
    }

    pub async fn invoice_by_number(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        invoice_number: u32,
        r#type: InvoiceNodeType,
    ) -> Result<InvoiceResponse> {
        get_invoice_by_number(ctx, store_id, invoice_number, r#type)
    }

    pub async fn invoices(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<InvoiceFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<InvoiceSortInput>>,
    ) -> Result<InvoicesResponse> {
        get_invoices(ctx, store_id, page, filter, sort)
    }

    async fn insert_prescription(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: prescription::insert::InsertInput,
    ) -> Result<prescription::insert::InsertResponse> {
        prescription::insert::insert(ctx, &store_id, input)
    }
}

#[derive(Default, Clone)]
pub struct InvoiceMutations;

#[Object]
impl InvoiceMutations {
    async fn insert_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment::insert::InsertInput,
    ) -> Result<outbound_shipment::insert::InsertResponse> {
        outbound_shipment::insert::insert(ctx, &store_id, input)
    }

    async fn update_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment::update::UpdateInput,
    ) -> Result<outbound_shipment::update::UpdateResponse> {
        outbound_shipment::update::update(ctx, &store_id, input)
    }

    async fn update_outbound_shipment_name(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment::update_name::UpdateNameInput,
    ) -> Result<outbound_shipment::update_name::UpdateNameResponse> {
        outbound_shipment::update_name::update_name(ctx, &store_id, input)
    }

    async fn delete_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<outbound_shipment::delete::DeleteResponse> {
        outbound_shipment::delete::delete(ctx, &store_id, id)
    }

    async fn insert_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment::insert::InsertInput,
    ) -> Result<inbound_shipment::insert::InsertResponse> {
        inbound_shipment::insert::insert(ctx, &store_id, input)
    }

    async fn update_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment::update::UpdateInput,
    ) -> Result<inbound_shipment::update::UpdateResponse> {
        inbound_shipment::update::update(ctx, &store_id, input)
    }

    async fn delete_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment::delete::DeleteInput,
    ) -> Result<inbound_shipment::delete::DeleteResponse> {
        inbound_shipment::delete::delete(ctx, &store_id, input)
    }

    /// Add invoice lines from master item master list
    async fn add_to_outbound_shipment_from_master_list(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: AddToShipmentFromMasterListInput,
    ) -> Result<outbound_shipment::AddFromMasterListResponse> {
        outbound_shipment::add_from_master_list(ctx, &store_id, input)
    }

    async fn add_to_inbound_shipment_from_master_list(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: AddToShipmentFromMasterListInput,
    ) -> Result<inbound_shipment::AddFromMasterListResponse> {
        inbound_shipment::add_from_master_list(ctx, &store_id, input)
    }

    async fn insert_prescription(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: prescription::insert::InsertInput,
    ) -> Result<prescription::insert::InsertResponse> {
        prescription::insert::insert(ctx, &store_id, input)
    }

    async fn update_prescription(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: prescription::update::UpdateInput,
    ) -> Result<prescription::update::UpdateResponse> {
        prescription::update::update(ctx, &store_id, input)
    }

    async fn delete_prescription(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<prescription::delete::DeleteResponse> {
        prescription::delete::delete(ctx, &store_id, id)
    }

    async fn insert_outbound_return(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_return::insert::InsertInput,
    ) -> Result<outbound_return::insert::InsertResponse> {
        outbound_return::insert::insert(ctx, &store_id, input)
    }

    async fn update_outbound_return(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_return::update::UpdateInput,
    ) -> Result<outbound_return::update::UpdateResponse> {
        outbound_return::update::update(ctx, &store_id, input)
    }
    async fn update_outbound_return_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_return::update_lines::UpdateInput,
    ) -> Result<outbound_return::update_lines::UpdateResponse> {
        outbound_return::update_lines::update_lines(ctx, &store_id, input)
    }

    async fn delete_outbound_return(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<outbound_return::delete::DeleteResponse> {
        outbound_return::delete::delete(ctx, &store_id, id)
    }

    async fn insert_inbound_return(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_return::insert::InsertInput,
    ) -> Result<inbound_return::insert::InsertResponse> {
        inbound_return::insert::insert(ctx, &store_id, input)
    }

    async fn update_inbound_return_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_return::update_lines::UpdateInput,
    ) -> Result<inbound_return::update_lines::UpdateResponse> {
        inbound_return::update_lines::update_lines(ctx, &store_id, input)
    }

    async fn delete_inbound_return(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<inbound_return::delete::DeleteResponse> {
        inbound_return::delete::delete(ctx, &store_id, id)
    }
}
