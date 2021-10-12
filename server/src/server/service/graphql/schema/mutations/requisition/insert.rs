use crate::{
    database::{
        repository::{RequisitionLineRepository, RequisitionRepository},
        schema::{RequisitionLineRow, RequisitionRow},
    },
    server::service::graphql::{
        schema::types::{Requisition, RequisitionType},
        ContextExt,
    },
};

use async_graphql::{Context, InputObject};

#[derive(InputObject)]
pub struct InsertRequisitionLineInput {
    pub id: String,
    pub item_id: String,
    pub actual_quantity: f64,
    pub suggested_quantity: f64,
}

#[derive(InputObject)]
pub struct InsertRequisitionInput {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub type_of: RequisitionType,
    pub requisition_lines: Vec<InsertRequisitionLineInput>,
}

pub async fn insert_requisition(ctx: &Context<'_>, input: InsertRequisitionInput) -> Requisition {
    let InsertRequisitionInput {
        id,
        name_id,
        store_id,
        type_of,
        requisition_lines,
    } = input;

    let requisition_row = RequisitionRow {
        id: id.clone(),
        name_id,
        store_id,
        type_of: type_of.into(),
    };

    let requisition_repository = ctx.get_repository::<RequisitionRepository>();
    let requisition_line_repository = ctx.get_repository::<RequisitionLineRepository>();

    requisition_repository
        .insert_one(&requisition_row)
        .await
        .expect("Failed to insert requisition into database");

    let requisition_line_rows: Vec<RequisitionLineRow> = requisition_lines
        .into_iter()
        .map(|line| RequisitionLineRow {
            id: line.id,
            requisition_id: id.clone(),
            item_id: line.item_id,
            actual_quantity: line.actual_quantity,
            suggested_quantity: line.suggested_quantity,
        })
        .collect();

    for requisition_line_row in requisition_line_rows {
        requisition_line_repository
            .insert_one(&requisition_line_row)
            .await
            .expect("Failed to insert requisition_line into database");
    }

    Requisition { requisition_row }
}
