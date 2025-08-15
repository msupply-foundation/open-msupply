use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    standard_graphql_error::{
        validate_auth,
        StandardGraphqlError::{BadUserInput, InternalError},
    },
    ContextExt,
};
use graphql_types::types::IdResponse;
use repository::goods_received_row::GoodsReceivedRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    goods_received_line::save_goods_received_lines::{
        SaveGoodsReceivedLine as ServiceLineInput, SaveGoodsReceivedLinesError,
        SaveGoodsReceivedLinesInput as ServiceInput,
    },
};

#[derive(InputObject)]
pub struct SaveGoodsReceivedLinesInput {
    pub goods_received_id: String,
    pub purchase_order_line_id: String,
    pub lines: Vec<SaveGoodsReceivedLine>,
}

#[derive(InputObject)]
pub struct SaveGoodsReceivedLine {
    pub id: String,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs_received: Option<f64>,
    pub received_pack_size: Option<f64>,
    pub manufacturer_id: Option<String>,
    pub comment: Option<String>,
}

impl SaveGoodsReceivedLinesInput {
    pub fn to_domain(self) -> ServiceInput {
        let SaveGoodsReceivedLinesInput {
            goods_received_id,
            purchase_order_line_id,
            lines,
        } = self;

        ServiceInput {
            goods_received_id,
            purchase_order_line_id,
            lines: lines
                .into_iter()
                .map(|line| ServiceLineInput {
                    id: line.id,
                    batch: line.batch,
                    expiry_date: line.expiry_date,
                    number_of_packs_received: line.number_of_packs_received,
                    received_pack_size: line.received_pack_size,
                    manufacturer_id: line.manufacturer_id,
                    comment: line.comment,
                })
                .collect(),
        }
    }
}

#[derive(Union)]
#[graphql(name = "SaveGoodsReceivedLineResponse")]
pub enum SaveGoodsReceivedLineResponse {
    Response(IdResponse),
}

pub fn save_goods_received_lines(
    ctx: &Context<'_>,
    store_id: &str,
    input: SaveGoodsReceivedLinesInput,
) -> Result<SaveGoodsReceivedLineResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateGoodsReceived,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .goods_received_line_service
            .save_goods_received_lines(&service_context, input.to_domain()),
    )
}

pub fn map_response(
    from: Result<GoodsReceivedRow, SaveGoodsReceivedLinesError>,
) -> Result<SaveGoodsReceivedLineResponse> {
    let result = match from {
        Ok(goods_received_row) => {
            SaveGoodsReceivedLineResponse::Response(IdResponse(goods_received_row.id))
        }
        Err(error) => map_error(error)?,
    };

    Ok(result)
}

fn map_error(error: SaveGoodsReceivedLinesError) -> Result<SaveGoodsReceivedLineResponse> {
    use SaveGoodsReceivedLinesError::*;

    let formatted_error = format!("{:#?}", error);

    log::error!("Error saving goods received lines: {}", formatted_error);

    let graph_error = match error {
        LineInsertError { .. }
        | LineUpdateError { .. }
        | LineDeleteError { .. }
        | GoodsReceivedDoesNotExist => BadUserInput(formatted_error),
        DatabaseError(_) | UpdatedGoodsReceivedDoesNotExist => InternalError(formatted_error),
    };

    Err(graph_error.extend())
}
