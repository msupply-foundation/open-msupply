use async_graphql::*;

use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::InvoiceNode;

use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice_line::save_stock_out_item_lines::{
    SaveStockOutInvoiceLine, SaveStockOutItemLines, SaveStockOutItemLinesError,
};

#[derive(InputObject)]
pub struct SaveOutboundShipmentLinesInput {
    pub invoice_id: String,
    pub item_id: String,
    pub lines: Vec<OutboundShipmentLineInput>,
    pub placeholder_quantity: Option<f64>,
}

#[derive(InputObject)]
pub struct OutboundShipmentLineInput {
    pub id: String,
    pub number_of_packs: f64,
    pub stock_line_id: String,
    pub campaign_id: Option<String>,
}

pub fn save_outbound_shipment_item_lines(
    ctx: &Context<'_>,
    store_id: &str,
    input: SaveOutboundShipmentLinesInput,
) -> Result<InvoiceNode> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_line_service
            .save_stock_out_item_lines(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<Invoice, SaveStockOutItemLinesError>) -> Result<InvoiceNode> {
    let result = match from {
        Ok(invoice) => InvoiceNode::from_domain(invoice),
        Err(error) => map_error(error)?,
    };

    Ok(result)
}

impl SaveOutboundShipmentLinesInput {
    pub fn to_domain(self) -> SaveStockOutItemLines {
        let SaveOutboundShipmentLinesInput {
            invoice_id,
            item_id,
            lines,
            placeholder_quantity,
        } = self;

        SaveStockOutItemLines {
            invoice_id,
            item_id,
            placeholder_quantity,
            lines: lines
                .into_iter()
                .map(|line| SaveStockOutInvoiceLine {
                    id: line.id,
                    number_of_packs: line.number_of_packs,
                    stock_line_id: line.stock_line_id,
                    campaign_id: line.campaign_id,
                })
                .collect(),
            prescribed_quantity: None, // Only used for prescription lines
            note: None,                // Not used yet
        }
    }
}

fn map_error(error: SaveStockOutItemLinesError) -> Result<InvoiceNode> {
    use SaveStockOutItemLinesError::*;
    let formatted_error = format!("{:#?}", error);

    log::error!("Error: {}", formatted_error);

    // Future TODO: Implement structured errors where needed
    // (Would only occur if 2 people editing at same time)
    let graphql_error = match error {
        LineInsertError { .. }
        | LineUpdateError { .. }
        | LineDeleteError { .. }
        | PlaceholderError(_)
        | PrescribedQuantityError(_)
        | InvoiceDoesNotBelongToCurrentStore
        | InvoiceNotFound
        | InvoiceNotEditable
        | NotAStockOutInvoice
        | InvalidInvoiceType => StandardGraphqlError::BadUserInput(formatted_error),
        DatabaseError(_) | UpdatedShipmentDoesNotExist => {
            StandardGraphqlError::InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
