use async_graphql::*;

use crate::schema::{
    mutations::requisition::errors::CannotEditRequisition, types::RequisitionNode,
};

#[derive(InputObject)]
pub struct SupplyRequestedQuantityInput {
    pub response_requisition_id: String,
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum SupplyRequestedQuantityErrorInterface {
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
pub struct SupplyRequestedQuantityError {
    pub error: SupplyRequestedQuantityErrorInterface,
}

#[derive(Union)]
pub enum SupplyRequestedQuantityResponse {
    Error(SupplyRequestedQuantityError),
    Response(RequisitionNode),
}

pub fn supply_requested_quantity(
    _ctx: &Context<'_>,
    _store_id: Option<String>,
    _input: SupplyRequestedQuantityInput,
) -> Result<SupplyRequestedQuantityResponse> {
    todo!()
}
