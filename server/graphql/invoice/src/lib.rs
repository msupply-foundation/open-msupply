mod invoice_queries;
use self::invoice_queries::*;
use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_types::types::*;
pub mod mutations;

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
        get_invoice(ctx, Some(&store_id), &id)
    }

    pub async fn invoice_by_number(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        invoice_number: u32,
        r#type: InvoiceNodeType,
    ) -> Result<InvoiceResponse> {
        get_invoice_by_number(ctx, &store_id, invoice_number, r#type)
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
        get_invoices(ctx, &store_id, page, filter, sort)
    }
}
