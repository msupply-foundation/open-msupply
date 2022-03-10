mod batch_inbound_shipment;
mod batch_outbound_shipment;
mod batch_request_requisition;
mod batch_stocktake;
use async_graphql::*;
use batch_inbound_shipment::{
    batch_inbound_shipment, BatchInboundShipmentInput, BatchInboundShipmentResponse,
};
use batch_outbound_shipment::{
    batch_outbound_shipment, BatchOutboundShipmentInput, BatchOutboundShipmentResponse,
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
        input: batch_request_requisition::BatchInput,
    ) -> Result<batch_request_requisition::BatchResponse> {
        batch_request_requisition::batch(ctx, &store_id, input)
    }

    async fn batch_stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: batch_stocktake::BatchInput,
    ) -> Result<batch_stocktake::BatchResponse> {
        batch_stocktake::batch(ctx, &store_id, input)
    }
}

pub trait VecOrNone<T> {
    fn vec_or_none(self) -> Option<Vec<T>>;
}

impl<T> VecOrNone<T> for Vec<T> {
    fn vec_or_none(self) -> Option<Vec<T>> {
        if self.is_empty() {
            None
        } else {
            Some(self)
        }
    }
}
