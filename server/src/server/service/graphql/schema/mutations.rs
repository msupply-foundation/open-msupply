use crate::database::repository::{
    ItemRepository, RequisitionLineRepository, RequisitionRepository,
};
use crate::database::schema::{ItemRow, RequisitionLineRow, RequisitionRow};
use crate::server::service::graphql::schema::types::{
    InputRequisitionLine, Item, Requisition, RequisitionType,
};
use crate::server::service::graphql::ContextExt;

use async_graphql::{Context, Object};

pub struct Mutations;

#[Object]
impl Mutations {
    async fn insert_item(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the item")] id: String,
        #[graphql(desc = "name of the item")] name: String,
    ) -> Item {
        let item_row = ItemRow { id, name };

        let item_repository = ctx.get_repository::<ItemRepository>();

        item_repository
            .insert_one(&item_row)
            .await
            .expect("Failed to insert item into database");

        Item { item_row }
    }

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
}
