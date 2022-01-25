use async_graphql::*;

use crate::schema::{
    mutations::{requisition::errors::CannotEditRequisition, RecordDoesNotExist},
    types::RequisitionNode,
};

#[derive(InputObject)]
pub struct AddFromMasterListInput {
    pub response_requisition_id: String,
    pub master_list_id: String,
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum AddFromMasterListErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    // TODO master list visible in current store
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
pub struct AddFromMasterListError {
    pub error: AddFromMasterListErrorInterface,
}

#[derive(Union)]
pub enum AddFromMasterListResponse {
    Error(AddFromMasterListError),
    Response(RequisitionNode),
}

pub fn add_from_master_list(
    _ctx: &Context<'_>,
    _store_id: Option<String>,
    _input: AddFromMasterListInput,
) -> Result<AddFromMasterListResponse> {
    todo!()
}
