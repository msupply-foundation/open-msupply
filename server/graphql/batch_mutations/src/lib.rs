mod batch_inbound_shipment;
mod batch_outbound_shipment;
mod batch_request_requisition;
mod batch_stocktake;
use async_graphql::*;

#[derive(Default, Clone)]
pub struct BatchMutations;

#[Object]
impl BatchMutations {
    async fn batch_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: batch_inbound_shipment::BatchInput,
    ) -> Result<batch_inbound_shipment::BatchResponse> {
        batch_inbound_shipment::batch(ctx, &store_id, input)
    }

    async fn batch_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: batch_outbound_shipment::BatchInput,
    ) -> Result<batch_outbound_shipment::BatchResponse> {
        batch_outbound_shipment::batch(ctx, &store_id, input)
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

fn to_standard_error<I>(input: I, error: Error) -> Error
where
    I: std::fmt::Debug,
{
    let input_string = format!("{:#?}", input);
    error.extend_with(|_, e| e.set("input", input_string))
}
