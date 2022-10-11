use self::{
    chart::{
        get_requisition_line_chart, ConsumptionHistoryOptions, ItemChart,
        RequisitionLineChartError, StockEvolutionOptions,
    },
    query::get_requisition_lines,
    request_requisition_line::{
        delete_request_requisition_line, insert_request_requisition_line,
        update_request_requisition_line, DeleteRequestRequisitionLine,
        DeleteRequestRequisitionLineError, InsertRequestRequisitionLine,
        InsertRequestRequisitionLineError, UpdateRequestRequisitionLine,
        UpdateRequestRequisitionLineError,
    },
    response_requisition_line::{
        update_response_requisition_line, UpdateResponseRequisitionLine,
        UpdateResponseRequisitionLineError,
    },
};

use super::{ListError, ListResult};
use crate::service_provider::ServiceContext;

use repository::PaginationOption;
use repository::{RequisitionLine, RequisitionLineFilter};

pub mod chart;
pub mod common;
pub mod query;
pub mod request_requisition_line;
pub mod response_requisition_line;

pub trait RequisitionLineServiceTrait: Sync + Send {
    fn get_requisition_lines(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<RequisitionLineFilter>,
    ) -> Result<ListResult<RequisitionLine>, ListError> {
        get_requisition_lines(ctx, pagination, filter)
    }

    fn insert_request_requisition_line(
        &self,
        ctx: &ServiceContext,
        input: InsertRequestRequisitionLine,
    ) -> Result<RequisitionLine, InsertRequestRequisitionLineError> {
        insert_request_requisition_line(ctx, input)
    }

    fn update_request_requisition_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateRequestRequisitionLine,
    ) -> Result<RequisitionLine, UpdateRequestRequisitionLineError> {
        update_request_requisition_line(ctx, input)
    }

    fn delete_request_requisition_line(
        &self,
        ctx: &ServiceContext,
        input: DeleteRequestRequisitionLine,
    ) -> Result<String, DeleteRequestRequisitionLineError> {
        delete_request_requisition_line(ctx, input)
    }

    fn update_response_requisition_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateResponseRequisitionLine,
    ) -> Result<RequisitionLine, UpdateResponseRequisitionLineError> {
        update_response_requisition_line(ctx, input)
    }

    fn get_requisition_line_chart(
        &self,
        ctx: &ServiceContext,
        requisition_line_id: &str,
        consumption_history_options: ConsumptionHistoryOptions,
        stock_evolution_options: StockEvolutionOptions,
    ) -> Result<ItemChart, RequisitionLineChartError> {
        get_requisition_line_chart(
            ctx,
            requisition_line_id,
            consumption_history_options,
            stock_evolution_options,
        )
    }
}

pub struct RequisitionLineService {}
impl RequisitionLineServiceTrait for RequisitionLineService {}
