pub mod invoice_line_queries;
pub mod mutations;
use self::mutations::{inbound_shipment_line, outbound_shipment_line, prescription_line};
use async_graphql::*;
use graphql_core::{generic_inputs::PrintReportSortInput, pagination::PaginationInput};
use invoice_line_queries::{
    invoice_lines, InvoiceLineFilterInput, InvoiceLineSortInput, InvoiceLinesResponse,
};

#[derive(Default, Clone)]
pub struct InvoiceLineQueries;

#[Object]
impl InvoiceLineQueries {
    pub async fn invoice_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        invoice_id: String,
        page: Option<PaginationInput>,
        filter: Option<InvoiceLineFilterInput>,
        sort: Option<Vec<InvoiceLineSortInput>>,
        report_sort: Option<PrintReportSortInput>,
    ) -> Result<InvoiceLinesResponse> {
        invoice_lines(ctx, &store_id, &invoice_id, page, filter, sort, report_sort)
    }
}

#[derive(Default, Clone)]
pub struct InvoiceLineMutations;

#[Object]
impl InvoiceLineMutations {
    // Outbound
    async fn insert_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::line::insert::InsertInput,
    ) -> Result<outbound_shipment_line::line::insert::InsertResponse> {
        outbound_shipment_line::line::insert::insert(ctx, &store_id, input)
    }

    async fn update_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::line::update::UpdateInput,
    ) -> Result<outbound_shipment_line::line::update::UpdateResponse> {
        outbound_shipment_line::line::update::update(ctx, &store_id, input)
    }

    async fn delete_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::line::delete::DeleteInput,
    ) -> Result<outbound_shipment_line::line::delete::DeleteResponse> {
        outbound_shipment_line::line::delete::delete(ctx, &store_id, input)
    }

    async fn insert_outbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::service_line::insert::InsertInput,
    ) -> Result<outbound_shipment_line::service_line::insert::InsertResponse> {
        outbound_shipment_line::service_line::insert::insert(ctx, &store_id, input)
    }

    async fn update_outbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::service_line::update::UpdateInput,
    ) -> Result<outbound_shipment_line::service_line::update::UpdateResponse> {
        outbound_shipment_line::service_line::update::update(ctx, &store_id, input)
    }

    async fn delete_outbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::service_line::delete::DeleteInput,
    ) -> Result<outbound_shipment_line::service_line::delete::DeleteResponse> {
        outbound_shipment_line::service_line::delete::delete(ctx, &store_id, input)
    }

    async fn insert_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::unallocated_line::insert::InsertInput,
    ) -> Result<outbound_shipment_line::unallocated_line::insert::InsertResponse> {
        outbound_shipment_line::unallocated_line::insert::insert(ctx, &store_id, input)
    }

    async fn update_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::unallocated_line::update::UpdateInput,
    ) -> Result<outbound_shipment_line::unallocated_line::update::UpdateResponse> {
        outbound_shipment_line::unallocated_line::update::update(ctx, &store_id, input)
    }

    async fn delete_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::unallocated_line::delete::DeleteInput,
    ) -> Result<outbound_shipment_line::unallocated_line::delete::DeleteResponse> {
        outbound_shipment_line::unallocated_line::delete::delete(ctx, &store_id, input)
    }

    async fn allocate_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        line_id: String,
    ) -> Result<outbound_shipment_line::unallocated_line::allocate::AllocateResponse> {
        outbound_shipment_line::unallocated_line::allocate::allocate(ctx, &store_id, line_id)
    }

    // Inbound

    async fn insert_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::line::insert::InsertInput,
    ) -> Result<inbound_shipment_line::line::insert::InsertResponse> {
        inbound_shipment_line::line::insert::insert(ctx, &store_id, input)
    }

    async fn update_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::line::update::UpdateInput,
    ) -> Result<inbound_shipment_line::line::update::UpdateResponse> {
        inbound_shipment_line::line::update::update(ctx, &store_id, input)
    }

    async fn delete_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::line::delete::DeleteInput,
    ) -> Result<inbound_shipment_line::line::delete::DeleteResponse> {
        inbound_shipment_line::line::delete::delete(ctx, &store_id, input)
    }

    async fn insert_inbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::service_line::insert::InsertInput,
    ) -> Result<inbound_shipment_line::service_line::insert::InsertResponse> {
        inbound_shipment_line::service_line::insert::insert(ctx, &store_id, input)
    }

    async fn update_inbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::service_line::update::UpdateInput,
    ) -> Result<inbound_shipment_line::service_line::update::UpdateResponse> {
        inbound_shipment_line::service_line::update::update(ctx, &store_id, input)
    }

    async fn delete_inbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::service_line::delete::DeleteInput,
    ) -> Result<inbound_shipment_line::service_line::delete::DeleteResponse> {
        inbound_shipment_line::service_line::delete::delete(ctx, &store_id, input)
    }

    async fn insert_prescription_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: prescription_line::insert::InsertInput,
    ) -> Result<prescription_line::insert::InsertResponse> {
        prescription_line::insert::insert(ctx, &store_id, input)
    }

    async fn update_prescription_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: prescription_line::update::UpdateInput,
    ) -> Result<prescription_line::update::UpdateResponse> {
        prescription_line::update::update(ctx, &store_id, input)
    }

    async fn delete_prescription_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: prescription_line::delete::DeleteInput,
    ) -> Result<prescription_line::delete::DeleteResponse> {
        prescription_line::delete::delete(ctx, &store_id, input)
    }
}
