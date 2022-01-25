use async_graphql::*;

use crate::schema::types::{
    sort_filter_types::{DatetimeFilterInput, EqualFilterBigNumberInput, EqualFilterInput},
    PaginationInput, RequisitionNode, RequisitionNodeStatus, RequisitionNodeType,
};

use super::EqualFilterStringInput;

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum RequisitionSortFieldInput {
    RequisitionNumber,
    Type,
    Status,
    OtherPartyName,
}

#[derive(InputObject)]
pub struct RequisitionSortInput {
    /// Sort query result by `key`
    key: RequisitionSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct RequisitionFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub requisition_number: Option<EqualFilterBigNumberInput>,
    pub r#type: Option<EqualFilterInput<RequisitionNodeType>>,
    pub status: Option<EqualFilterInput<RequisitionNodeStatus>>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub sent_datetime: Option<DatetimeFilterInput>,
    pub finalised_datetime: Option<DatetimeFilterInput>,
    pub other_party_name: Option<EqualFilterStringInput>,
    pub other_party_id: Option<EqualFilterStringInput>,
    pub color: Option<EqualFilterStringInput>,
    pub their_reference: Option<EqualFilterStringInput>,
    pub comment: Option<EqualFilterStringInput>,
}

#[derive(SimpleObject)]
pub struct RequisitionConnector {
    total_count: u32,
    nodes: Vec<RequisitionNode>,
}

#[derive(Union)]
pub enum RequisitionsResponse {
    Response(RequisitionConnector),
}

pub fn get_requisitions(
    _ctx: &Context<'_>,
    _store_id: Option<String>,
    _page: Option<PaginationInput>,
    _filter: Option<RequisitionFilterInput>,
    _sort: Option<Vec<RequisitionSortInput>>,
) -> Result<RequisitionsResponse> {
    todo!()
}

#[derive(Union)]
pub enum RequisitionResponse {
    Response(RequisitionNode),
}

pub fn get_requisition(
    _ctx: &Context<'_>,
    _store_id: Option<String>,
    _id: String,
) -> Result<RequisitionResponse> {
    todo!()
}

pub fn get_requisition_by_number(
    _ctx: &Context<'_>,
    _store_id: Option<String>,
    _requisition_number: u32,
    _type: RequisitionNodeType,
) -> Result<RequisitionResponse> {
    todo!()
}
