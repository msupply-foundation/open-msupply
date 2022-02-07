use async_graphql::*;

use crate::schema::types::{NameNode, RequisitionNode};

#[derive(InputObject)]
#[graphql(name = "InsertRequestRequisitionInput")]
pub struct InsertInput {
    pub id: String,
    pub other_party_id: String,
    pub color: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub max_months_of_stock: f64,
    pub threshold_months_of_stock: f64,
}

#[derive(Interface)]
#[graphql(name = "InsertRequestRequisitionErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    OtherPartyNotASupplierStore(OtherPartyNotASupplierStore),
}

pub struct OtherPartyNotASupplierStore(NameNode);
#[Object]
impl OtherPartyNotASupplierStore {
    pub async fn description(&self) -> &'static str {
        "Other party name is not a supplier store"
    }

    pub async fn other_party(&self) -> &NameNode {
        &self.0
    }
}

#[derive(SimpleObject)]
#[graphql(name = "InsertRequestRequisitionError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertRequestRequisitionResponse")]
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
