mod batch_inbound_shipment;
mod batch_outbound_shipment;
mod batch_request_requisition;
mod batch_stocktake;
use self::batch_stocktake::*;
use async_graphql::*;
use batch_inbound_shipment::{
    batch_inbound_shipment, BatchInboundShipmentInput, BatchInboundShipmentResponse,
};
use batch_outbound_shipment::{
    batch_outbound_shipment, BatchOutboundShipmentInput, BatchOutboundShipmentResponse,
};
use batch_request_requisition::{
    batch_request_requisition, BatchRequestRequisitionInput, BatchRequestRequisitionResponse,
};

#[derive(Default, Clone)]
pub struct BatchMutations;

#[Object]
impl BatchMutations {
    async fn batch_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: BatchInboundShipmentInput,
    ) -> Result<BatchInboundShipmentResponse> {
        batch_inbound_shipment(ctx, &store_id, input)
    }

    async fn batch_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: BatchOutboundShipmentInput,
    ) -> Result<BatchOutboundShipmentResponse> {
        batch_outbound_shipment(ctx, &store_id, input)
    }

    async fn batch_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: BatchRequestRequisitionInput,
    ) -> Result<BatchRequestRequisitionResponse> {
        batch_request_requisition(ctx, &store_id, input)
    }

    async fn batch_stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: BatchStocktakeInput,
    ) -> Result<BatchStocktakeResponse> {
        batch_stocktake(ctx, &store_id, input)
    }
}
