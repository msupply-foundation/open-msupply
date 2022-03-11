#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ReportSortFieldInput {
    Name,
    Category,
}

use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, SimpleStringFilterInput},
    pagination::PaginationInput,
};
use serde::Serialize;

#[derive(InputObject)]
pub struct ReportSortInput {
    /// Sort query result by `key`
    key: ReportSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(Debug, Enum, Copy, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReportCategory {
    OutboundShipment,
    InboundShipment,
    Requisition,
    Stocktake,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterReportCategoryInput {
    pub equal_to: Option<ReportCategory>,
    pub equal_any: Option<Vec<ReportCategory>>,
    pub not_equal_to: Option<ReportCategory>,
}

#[derive(InputObject, Clone)]
pub struct ReportFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<SimpleStringFilterInput>,
    pub category: Option<EqualFilterReportCategoryInput>,
}

#[derive(Union)]
pub enum ReportsResponse {
    Response(ReportConnector),
}

#[derive(SimpleObject)]
pub struct ReportConnector {
    total_count: u32,
    nodes: Vec<ReportNode>,
}

#[derive(PartialEq, Debug)]
pub struct ReportNode {
    id: String,
    name: String,
    category: ReportCategory,
}

#[Object]
impl ReportNode {
    pub async fn id(&self) -> &str {
        &self.id
    }

    /// Human readable name of the report
    pub async fn name(&self) -> &str {
        &self.name
    }

    pub async fn category(&self) -> &ReportCategory {
        &self.category
    }
}

pub fn reports(
    _ctx: &Context<'_>,
    _store_id: &str,
    _page: Option<PaginationInput>,
    _filter: Option<ReportFilterInput>,
    _sort: Option<Vec<ReportSortInput>>,
) -> Result<ReportsResponse> {
    Ok(ReportsResponse::Response(ReportConnector {
        total_count: 4,
        nodes: vec![
            ReportNode {
                id: "OutboundShipmentReport_1".to_string(),
                name: "Outbound shipment report".to_string(),
                category: ReportCategory::OutboundShipment,
            },
            ReportNode {
                id: "InboundShipmentReport_1".to_string(),
                name: "Inbound shipment report".to_string(),
                category: ReportCategory::InboundShipment,
            },
            ReportNode {
                id: "RequisitionReport_1".to_string(),
                name: "Requisition shipment report".to_string(),
                category: ReportCategory::Requisition,
            },
            ReportNode {
                id: "StocktakeReport_1".to_string(),
                name: "Stocktake report".to_string(),
                category: ReportCategory::Stocktake,
            },
        ],
    }))
}
