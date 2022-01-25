use async_graphql::*;

use crate::schema::{
    mutations::{requisition::errors::CannotEditRequisition, RecordDoesNotExist},
    types::RequisitionLineNode,
};

#[derive(InputObject)]
#[graphql(name = "UpdateRequestRequisitionLineInput")]
pub struct UpdateInput {
    pub id: String,
    pub requested_quantity: Option<u32>,
}

#[derive(Interface)]
#[graphql(name = "UpdateRequestRequisitionLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateRequestRequisitionLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateRequestRequisitionLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(RequisitionLineNode),
}

pub fn update(
    _ctx: &Context<'_>,
    _store_id: Option<String>,
    _input: UpdateInput,
) -> Result<UpdateResponse> {
    todo!()
}
