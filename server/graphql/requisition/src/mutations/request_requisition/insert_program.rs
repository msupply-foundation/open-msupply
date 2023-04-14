use async_graphql::*;
use graphql_types::types::RequisitionNode;
use repository::Requisition;

#[derive(InputObject)]
#[graphql(name = "InsertProgramRequestRequisitionInput")]
pub struct InsertInput {
    pub id: String,
    pub other_party_id: String,
    pub order_type_id: String,
    pub period_id: String,
}

#[derive(Union)]
#[graphql(name = "InsertProgramRequestRequisitionResponse")]
pub enum InsertResponse {
    // TODO add error
    Response(RequisitionNode),
}

pub fn insert(_ctx: &Context<'_>, _store_id: &str, _input: InsertInput) -> Result<InsertResponse> {
    Ok(InsertResponse::Response(RequisitionNode::from_domain(
        Requisition {
            requisition_row: Default::default(),
            name_row: Default::default(),
            store_row: Default::default(),
        },
    )))
}
