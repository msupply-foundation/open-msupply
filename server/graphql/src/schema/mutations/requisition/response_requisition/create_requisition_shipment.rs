use async_graphql::*;

use crate::schema::{
    mutations::requisition::errors::CannotEditRequisition, types::RequisitionNode,
};

#[derive(InputObject)]
pub struct CreateRequisitionShipmentInput {
    pub response_requisition_id: String,
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum CreateRequisitionShipmentErrorInterface {
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
pub struct CreateRequisitionShipmentError {
    pub error: CreateRequisitionShipmentErrorInterface,
}

#[derive(Union)]
pub enum CreateRequisitionShipmentResponse {
    Error(CreateRequisitionShipmentError),
    Response(RequisitionNode),
}

pub fn use_calculated_quantity(
    _ctx: &Context<'_>,
    _store_id: Option<String>,
    _input: CreateRequisitionShipmentInput,
) -> Result<CreateRequisitionShipmentResponse> {
    todo!()
}
