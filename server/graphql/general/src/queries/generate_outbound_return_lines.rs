use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(InputObject, Clone)]
pub struct GenerateOutboundReturnLinesInput {
    pub stock_line_ids: Vec<String>,
    pub item_id: Option<String>,
    pub return_id: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct OutboundReturnLineNode {
    pub id: String,
    pub item_code: String,
    pub item_name: String,
    pub stock_line_id: String,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub available_number_of_packs: f64,
    pub pack_size: i32,
    pub number_of_packs_to_return: f64,
    pub comment: String,
    pub reason_id: Option<String>,
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
            resource: Resource::QueryTemperatureLog, // TODO new resource
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    // let outbound_return = service_provider.invoice_service
    // .get_temperature_chart(
    //     &service_context,
    //     GenerateOutboundReturnLinesInput {
    //         from_datetime: from_datetime.naive_utc(),
    //         to_datetime: to_datetime.naive_utc(),
    //         number_of_data_points,
    //         filter: filter.map(TemperatureLogFilter::from),
    //     },
    // )
    // .map_err(map_error)?;

    // let temperature_chart_node =
    //     update_point_temperatures(temperature_chart, &service_context.connection)?;

    Ok(GenerateOutboundReturnLinesResponse::Response(
        OutboundReturnLineConnector {
            total_count: 0,
            nodes: vec![],
        },
    ))
}
