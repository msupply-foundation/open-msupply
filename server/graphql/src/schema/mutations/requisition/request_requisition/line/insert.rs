use async_graphql::*;

use crate::schema::{
    mutations::{requisition::errors::CannotEditRequisition, ForeignKeyError},
    types::RequisitionNode,
};

#[derive(InputObject)]
#[graphql(name = "InsertRequestRequisitionLineInput")]
pub struct InsertInput {
    pub id: String,
    pub item_id: String,
    pub requested_quantity: u32,
}

#[derive(Interface)]
#[graphql(name = "InsertRequestRequisitionLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    RequisitionDoesNotExist(ForeignKeyError),
    CannotEditRequisition(CannotEditRequisition),
    RequisitionLineWithItemIdExists(RequisitionLineWithItemIdExists),
}

pub struct RequisitionLineWithItemIdExists;
#[Object]
impl RequisitionLineWithItemIdExists {
    pub async fn description(&self) -> &'static str {
        "Requisition line already exists for this item"
    }
}

#[derive(SimpleObject)]
#[graphql(name = "InsertRequestRequisitionLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertRequestRequisitionLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(RequisitionNode),
}

pub fn insert(
    _ctx: &Context<'_>,
    _store_id: Option<String>,
    _input: InsertInput,
) -> Result<InsertResponse> {
    todo!();
}
