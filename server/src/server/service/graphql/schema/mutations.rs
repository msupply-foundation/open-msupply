use crate::database::repository::{
    RequisitionLineRepository, RequisitionRepository, StorageConnectionManager,
};
use crate::database::schema::{RequisitionLineRow, RequisitionRow};
use crate::server::service::graphql::schema::types::{
    InputRequisitionLine, Requisition, RequisitionType,
};
use crate::server::service::graphql::ContextExt;

use async_graphql::{Context, Object};

pub struct Mutations;

#[Object]
impl Mutations {
    async fn insert_requisition(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the requisition")] id: String,
        #[graphql(desc = "id of the receiving store")] name_id: String,
        #[graphql(desc = "id of the sending store")] store_id: String,
        #[graphql(desc = "type of the requisition")] type_of: RequisitionType,
        #[graphql(desc = "requisition lines attached to the requisition")] requisition_lines: Vec<
            InputRequisitionLine,
        >,
    ) -> Requisition {
        let requisition_row = RequisitionRow {
            id: id.clone(),
            name_id,
            store_id,
            type_of: type_of.into(),
        };

        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        let connection = connection_manager.connection().unwrap();
        let requisition_repository = RequisitionRepository::new(&connection);
        let requisition_line_repository = RequisitionLineRepository::new(&connection);

        requisition_repository
            .insert_one(&requisition_row)
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
                .expect("Failed to insert requisition_line into database");
        }

        Requisition { requisition_row }
    }
}
