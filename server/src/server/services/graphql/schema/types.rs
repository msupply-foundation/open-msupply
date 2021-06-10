//! src/services/graphql/schema/types.rs

use crate::database::DatabaseConnection;

use juniper::graphql_object;
use juniper::{GraphQLInputObject, GraphQLObject};

#[derive(Clone)]
// A name.
pub struct Name {
    pub name_row: NameRow
}

#[graphql_object(Context = DatabaseConnection)]
impl Name {
    pub fn id(&self) -> String {
        self.name_row.id.clone()
    }

    pub fn name(&self) -> String {
        self.name_row.id.clone()
    }
}

#[derive(Clone)]
// A store.
pub struct Store {
    pub store_row: StoreRow    
}

#[graphql_object(Context = DatabaseConnection)]
impl Store  {
    pub fn id(&self) -> String {
        self.store_row.id.clone()
    }

    pub async fn name(&self,  database: &DatabaseConnection) -> Name {
        let name_row = database
            .get_name(self.store_row.name_id.clone())
            .await
            .unwrap_or_else(|_| panic!("Failed to get name for transact {}", self.store_row.id));

        Name { 
            name_row 
        }
    }    
}

#[derive(Clone)]
// An item.
pub struct Item {
    pub item_row: ItemRow
}

#[graphql_object(Context = DatabaseConnection)]
impl Item {
    pub fn id(&self) -> String {
        self.item_row.id.clone()
    }

    pub fn item_name(&self) -> String {
        self.item_row.item_name.clone()
    }
}
// An item line.
pub struct ItemLine {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub batch: String,
    pub quantity: f64,
}

#[derive(Clone)]
// A requisition.
pub struct Requisition {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
}

#[graphql_object(Context = DatabaseConnection)]
impl Requisition {
    pub fn id(&self) -> String {
        self.id.to_string()
    }

    pub fn name_id(&self) -> String {
        self.name_id.to_string()
    }

    pub fn store_id(&self) -> String {
        self.store_id.to_string()
    }

    pub async fn requisition_lines(&self, database: &DatabaseConnection) -> Vec<RequisitionLine> {
        let requisition_line_rows = database
            .get_requisition_lines(self.id.to_string())
            .await
            .unwrap_or_else(|_| panic!("Failed to get lines for requisition {}", self.id));

        requisition_line_rows
            .into_iter()
            .map(|line| RequisitionLine {
                id: line.id,
                item_id: line.item_id,
                actual_quantity: line.actual_quantity,
                suggested_quantity: line.suggested_quantity,
            })
            .collect()
    }
}

#[derive(Clone, GraphQLObject)]
// A requisition line.
pub struct RequisitionLine {
    pub id: String,
    pub item_id: String,
    pub actual_quantity: f64,
    pub suggested_quantity: f64,
}

#[derive(Clone, GraphQLObject)]
// A transaction.
pub struct Transact {
    pub id: String,
    pub name_id: String,
    pub invoice_number: i32,
    pub trans_lines: Vec<TransLine>,
}

#[derive(Clone, GraphQLObject)]
// A transaction line
pub struct TransLine {
    pub id: String,
    pub transaction_id: String,
    pub item_id: String,
    pub item_line_id: String,
}

#[derive(Clone, GraphQLInputObject)]
// A input requisition line.
pub struct InputRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub actual_quantity: f64,
    pub suggested_quantity: f64,
}
