use async_graphql::*;

use crate::schema::{
    mutations::requisition::errors::CannotEditRequisition,
    types::{RequisitionNode, RequisitionNodeStatus},
};

#[derive(InputObject)]
#[graphql(name = "UpdateResponseRequisitionInput")]
pub struct UpdateInput {
    pub id: String,
    pub color: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub status: Option<UpdateResponseRequisitionStatusInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateResponseRequisitionStatusInput {
    Finalised,
}

#[derive(Interface)]
#[graphql(name = "UpdateResponseRequisitionErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateErrorInterface {
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateResponseRequisitionError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateResponseRequisitionResponse")]
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
