//! src/services/graphql/queries.rs

use crate::server::graphql::{Requisition, RequisitionLine};
use crate::database::DatabaseConnection;

use juniper::graphql_object;
pub struct Queries;
#[graphql_object(context = DatabaseConnection)]
impl Queries {
    pub fn apiVersion() -> String {
        "1.0".to_string()
    }

    #[graphql(arguments(id(description = "id of the requisition")))]
    pub async fn requisition(database: &DatabaseConnection, id: String) -> Requisition {
        let requisition_row = database.get_requisition(id.to_string()).await.unwrap();

        let requisition_line_rows = database
            .get_requisition_lines(id.to_string())
            .await
            .unwrap();

        let requisition = Requisition {
            id: requisition_row.id,
            from_id: requisition_row.from_id,
            to_id: requisition_row.to_id,
            requisition_lines: requisition_line_rows
                .into_iter()
                .map(|line| RequisitionLine {
                    id: line.id,
                    item_name: line.item_name,
                    item_quantity: line.item_quantity as f64,
                })
                .collect(),
        };

        requisition
    }
}
