use async_graphql::*;

use crate::schema::{
    mutations::{requisition::errors::CannotEditRequisition, RecordDoesNotExist},
    types::RequisitionNode,
};

#[derive(InputObject)]
#[graphql(name = "UpdateRequestRequisitionInput")]
pub struct UpdateInput {
    pub id: String,
    pub colour: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub max_months_of_stock: Option<f64>,
    pub threshold_months_of_stock: Option<f64>,
    pub status: Option<UpdateRequestRequisitionStatusInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateRequestRequisitionStatusInput {
    Sent,
}

#[derive(Interface)]
#[graphql(name = "UpdateRequestRequisitionErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateRequestRequisitionError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateRequestRequisitionResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(RequisitionNode),
}

pub fn update(
    _ctx: &Context<'_>,
    _store_id: Option<String>,
    _input: UpdateInput,
) -> Result<UpdateResponse> {
    todo!()
}
