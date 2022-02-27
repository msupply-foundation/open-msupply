mod batch_inbound_shipment;
mod batch_outbound_shipment;
mod batch_stocktake;
use self::batch_stocktake::*;
use async_graphql::*;

#[derive(Default, Clone)]
pub struct BatchMutations;

#[Object]
impl BatchMutations {
    // async fn batch_inbound_shipment(
    //     &self,
    //     ctx: &Context<'_>,
    //     store_id: String,
    //     input: BatchInboundShipmentInput,
    // ) -> BatchInboundShipmentResponse {
    //     let connection_manager = ctx.get_connection_manager();

    //     get_batch_inbound_shipment_response(connection_manager, &store_id, input)
    // }

    // async fn batch_outbound_shipment(
    //     &self,
    //     ctx: &Context<'_>,
    //     store_id: String,
    //     input: BatchOutboundShipmentInput,
    // ) -> Result<BatchOutboundShipmentResponse> {
    //     get_batch_outbound_shipment_response(ctx, &store_id, input)
    // }

    async fn batch_stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: BatchStocktakeInput,
    ) -> Result<BatchStocktakeResponse> {
        batch_stocktake(ctx, &store_id, input)
    }
}
