use crate::schema::mutations::{
    requisition::errors::{CannotDeleteRequisitionWithLines, CannotEditRequisition},
    DeleteResponse as GenericDeleteResponse, RecordDoesNotExist,
};
use async_graphql::*;

#[derive(InputObject)]
#[graphql(name = "DeleteRequestRequisitionLineInput")]
pub struct DeleteInput {
    pub id: String,
}

#[derive(Interface)]
#[graphql(name = "DeleteRequestRequisitionLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditRequisition(CannotEditRequisition),
    CannotDeleteRequisitionWithLines(CannotDeleteRequisitionWithLines),
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteRequestRequisitionLineError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteRequestRequisitionLineResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(
    _ctx: &Context<'_>,
    _store_id: Option<String>,
    _input: DeleteInput,
) -> Result<DeleteResponse> {
    todo!()
}
