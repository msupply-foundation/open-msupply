use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{ItemRow, StockLineRow};
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice::outbound_return::generate_outbound_return_lines::OutboundReturnLine,
    ListResult,
};

#[derive(InputObject, Clone)]
pub struct GenerateOutboundReturnLinesInput {
    pub stock_line_ids: Vec<String>,
    pub item_id: Option<String>,
    pub return_id: Option<String>,
}

#[derive(SimpleObject)]
pub struct OutboundReturnLineConnector {
    total_count: u32,
    nodes: Vec<OutboundReturnLineNode>,
}

#[derive(Union)]
pub enum GenerateOutboundReturnLinesResponse {
    Response(OutboundReturnLineConnector),
}

pub fn generate_outbound_return_lines(
    ctx: &Context<'_>,
    store_id: String,
    input: GenerateOutboundReturnLinesInput,
) -> Result<GenerateOutboundReturnLinesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            // resource: Resource::MutateOutboundReturn, // TODO how to link up permissions? ... i think i gotta fetch from central or something??
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let return_lines = service_provider
        .invoice_service
        .generate_outbound_return_lines(
            &service_context,
            &store_id,
            input.stock_line_ids,
            input.item_id,
            input.return_id,
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(GenerateOutboundReturnLinesResponse::Response(
        OutboundReturnLineConnector::from_domain(return_lines),
    ))
}

impl OutboundReturnLineConnector {
    pub fn from_domain(
        return_lines: ListResult<OutboundReturnLine>,
    ) -> OutboundReturnLineConnector {
        OutboundReturnLineConnector {
            total_count: return_lines.count,
            nodes: return_lines
                .rows
                .into_iter()
                .map(OutboundReturnLineNode::from_domain)
                .collect(),
        }
    }
}

pub struct OutboundReturnLineNode {
    pub return_line: OutboundReturnLine,
}

impl OutboundReturnLineNode {
    pub fn from_domain(return_line: OutboundReturnLine) -> OutboundReturnLineNode {
        OutboundReturnLineNode { return_line }
    }

    pub fn item_row(&self) -> &ItemRow {
        &self.return_line.stock_line.item_row
    }

    pub fn stock_line_row(&self) -> &StockLineRow {
        &self.return_line.stock_line.stock_line_row
    }
}

#[Object]
impl OutboundReturnLineNode {
    pub async fn id(&self) -> &str {
        &self.return_line.id
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.return_line.comment
    }

    pub async fn reason_id(&self) -> &Option<String> {
        &self.return_line.reason_id
    }

    pub async fn number_of_packs_to_return(&self) -> &u32 {
        &self.return_line.number_of_packs
    }

    pub async fn item_code(&self) -> &str {
        &self.item_row().code
    }

    pub async fn item_name(&self) -> &str {
        &self.item_row().name
    }

    pub async fn stock_line_id(&self) -> &str {
        &self.stock_line_row().id
    }

    pub async fn batch(&self) -> &Option<String> {
        &self.stock_line_row().batch
    }

    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.stock_line_row().expiry_date
    }

    pub async fn available_number_of_packs(&self) -> &f64 {
        &self.stock_line_row().available_number_of_packs
    }

    pub async fn pack_size(&self) -> &i32 {
        &self.stock_line_row().pack_size
    }
}
