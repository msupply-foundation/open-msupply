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

#[derive(Clone)]
// A requisition line.
pub struct RequisitionLine {
    pub requisition_line_row: RequisitionLineRow
}

#[graphql_object(Context = DatabaseConnection)]
impl RequisitionLine {
    pub fn id(&self) -> String {
        self.requisition_line_row.id.clone()
    }

    pub async fn item(&self, database: &DatabaseConnection) -> Item {
        let item_row = database
        .get_item(self.requisition_line_row.item_id.clone())
        .await
        .unwrap_or_else(|_| panic!("Failed to get item for item line {}", self.requisition_line_row.id));

        Item { 
            item_row
        }
    }

    pub fn actual_quantity(&self) -> f64 {
        self.requisition_line_row.actual_quantity
    }

    pub fn suggested_quantity(&self) -> f64 {
        self.requisition_line_row.suggested_quantity
    }
}

#[derive(Clone)]
// A transaction.
pub struct Transact {
    pub transact_row: TransactRow
}

#[graphql_object(Context = DatabaseConnection)]
impl Transact {
    pub fn id(&self) -> String {
        self.transact_row.id.to_string()
    }

    pub async fn name(&self, database: &DatabaseConnection) -> Name {
        let name_row = database
            .get_name(self.transact_row.name_id.clone())
            .await
            .unwrap_or_else(|_| panic!("Failed to get name for transact {}", self.transact_row.id));

        Name { name_row }
    } 

    pub fn invoice_number(&self) -> i32 {
        self.transact_row.invoice_number
    }    

    pub async fn trans_lines(&self, database: &DatabaseConnection) -> Vec<TransLine> {
        let trans_line_rows: Vec<TransLineRow> = database
            .get_trans_lines(self.transact_row.id.clone())
            .await
            .unwrap_or_else(|_| panic!("Failed to get trans_lines for transact {}", self.transact_row.id));

        trans_line_rows
            .into_iter()
            .map(|trans_line_row| TransLine { trans_line_row })
            .collect()
    }
}

#[derive(Clone)]
// A transaction line
pub struct TransLine {
    pub trans_line_row: TransLineRow
}

#[graphql_object(Context = DatabaseConnection)]
impl TransLine {
    pub fn id(&self) -> String {
        self.trans_line_row.id.clone()
    }

    pub async fn transaction(&self, database: &DatabaseConnection) -> Transact {
        let transact_row: TransactRow = database
            .get_transact(self.trans_line_row.transaction_id.clone())
            .await
            .unwrap_or_else(|_| panic!("Failed to get transact for trans_line {}", self.trans_line_row.id));

        Transact { transact_row }
    }

    pub async fn item(&self, database: &DatabaseConnection) -> Item {
        let item_row = database
            .get_item(self.trans_line_row.item_id.clone())
            .await
            .unwrap_or_else(|_| panic!("Failed to get item for trans_line {}", self.trans_line_row.id));

        Item { 
            item_row
        }
    }

    pub async fn item_line(&self, database: &DatabaseConnection) -> ItemLine {
        // Handle optional item_line_id correctly.
        let item_line_row = database
            .get_item_line(self.trans_line_row.item_line_id.clone().unwrap())
            .await
            .unwrap_or_else(|_| panic!("Failed to get item_line for trans_line {}", self.trans_line_row.id));

        ItemLine { 
            item_line_row
        }
    }
}

#[derive(Clone, GraphQLInputObject)]
// A input requisition line.
pub struct InputRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub actual_quantity: f64,
    pub suggested_quantity: f64,
}
