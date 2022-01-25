use async_graphql::*;

use crate::schema::{
    mutations::{requisition::errors::CannotEditRequisition, RecordDoesNotExist},
    types::RequisitionNode,
};

#[derive(InputObject)]
pub struct UseCalculatedQuantityInput {
    pub response_requisition_id: String,
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UseCalculatedQuantityErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
pub struct UseCalculatedQuantityError {
    pub error: UseCalculatedQuantityErrorInterface,
}

#[derive(Union)]
pub enum UseCalculatedQuantityResponse {
    Error(UseCalculatedQuantityError),
    Response(RequisitionNode),
}

pub fn use_calculated_quantity(
    _ctx: &Context<'_>,
    _store_id: Option<String>,
    _input: UseCalculatedQuantityInput,
) -> Result<UseCalculatedQuantityResponse> {
    todo!()
}
