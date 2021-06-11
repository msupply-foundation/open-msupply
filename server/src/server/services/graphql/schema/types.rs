//! src/services/graphql/schema/types.rs

use crate::database::schema::{
    ItemLineRow, ItemRow, NameRow, RequisitionLineRow, RequisitionRow, RequisitionRowType,
    StoreRow, TransactionLineRow, TransactionRow, TransactionRowType,
};
use crate::database::DatabaseConnection;

use juniper::{graphql_object, GraphQLEnum, GraphQLInputObject};

#[derive(Clone)]
// A name.
pub struct Name {
    pub name_row: NameRow,
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
    pub store_row: StoreRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl Store {
    pub fn id(&self) -> String {
        self.store_row.id.clone()
    }

    pub async fn name(&self, database: &DatabaseConnection) -> Name {
        let name_row = database
            .get_name(self.store_row.name_id.clone())
            .await
            .unwrap_or_else(|_| panic!("Failed to get name for transaction {}", self.store_row.id));

        Name { name_row }
    }
}

#[derive(Clone)]
// An item.
pub struct Item {
    pub item_row: ItemRow,
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

#[derive(Clone)]
// An item line.
pub struct ItemLine {
    pub item_line_row: ItemLineRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl ItemLine {
    pub fn id(&self) -> String {
        self.item_line_row.id.clone()
    }

    pub async fn item(&self, database: &DatabaseConnection) -> Item {
        let item_row = database
            .get_item(self.item_line_row.item_id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!("Failed to get item for item line {}", self.item_line_row.id)
            });

        Item { item_row }
    }

    pub async fn store(&self, database: &DatabaseConnection) -> Store {
        let store_row = database
            .get_store(self.item_line_row.store_id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get store for item line {}",
                    self.item_line_row.id
                )
            });

        Store { store_row }
    }

    pub fn batch(&self) -> String {
        self.item_line_row.batch.clone()
    }

    pub fn quantity(&self) -> f64 {
        self.item_line_row.quantity
    }
}

#[derive(GraphQLEnum)]
pub enum RequisitionType {
    #[graphql(name = "imprest")]
    Imprest,
    #[graphql(name = "stock_history")]
    StockHistory,
    #[graphql(name = "request")]
    Request,
    #[graphql(name = "response")]
    Response,
    #[graphql(name = "supply")]
    Supply,
    #[graphql(name = "report")]
    Report,
}

#[derive(Clone)]
// A requisition.
pub struct Requisition {
    pub requisition_row: RequisitionRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl Requisition {
    pub fn id(&self) -> String {
        self.requisition_row.id.clone()
    }

    pub async fn name(&self, database: &DatabaseConnection) -> Name {
        let name_row = database
            .get_name(self.requisition_row.name_id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get store for item line {}",
                    self.requisition_row.id
                )
            });

        Name { name_row }
    }

    pub async fn store(&self, database: &DatabaseConnection) -> Store {
        let store_row = database
            .get_store(self.requisition_row.store_id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get store for item line {}",
                    self.requisition_row.id
                )
            });

        Store { store_row }
    }

    pub fn type_of(&self) -> RequisitionType {
        match self.requisition_row.type_of {
            RequisitionRowType::Imprest => RequisitionType::Imprest,
            RequisitionRowType::StockHistory => RequisitionType::StockHistory,
            RequisitionRowType::Request => RequisitionType::Request,
            RequisitionRowType::Response => RequisitionType::Response,
            RequisitionRowType::Supply => RequisitionType::Supply,
            RequisitionRowType::Report => RequisitionType::Report,
        }
    }

    pub async fn requisition_lines(&self, database: &DatabaseConnection) -> Vec<RequisitionLine> {
        let requisition_line_rows = database
            .get_requisition_lines(self.requisition_row.id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get lines for requisition {}",
                    self.requisition_row.id
                )
            });

        requisition_line_rows
            .into_iter()
            .map(|requisition_line_row| RequisitionLine {
                requisition_line_row,
            })
            .collect()
    }
}

#[derive(Clone)]
// A requisition line.
pub struct RequisitionLine {
    pub requisition_line_row: RequisitionLineRow,
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
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get item for item line {}",
                    self.requisition_line_row.id
                )
            });

        Item { item_row }
    }

    pub fn actual_quantity(&self) -> f64 {
        self.requisition_line_row.actual_quantity
    }

    pub fn suggested_quantity(&self) -> f64 {
        self.requisition_line_row.suggested_quantity
    }
}

#[derive(GraphQLEnum)]
pub enum TransactionType {
    #[graphql(name = "customer_invoice")]
    CustomerInvoice,
    #[graphql(name = "customer_credit")]
    CustomerCredit,
    #[graphql(name = "supplier_invoice")]
    SupplierInvoice,
    #[graphql(name = "supplier_credit")]
    SupplierCredit,
    #[graphql(name = "repack")]
    Repack,
    #[graphql(name = "build")]
    Build,
    #[graphql(name = "receipt")]
    Receipt,
    #[graphql(name = "payment")]
    Payment,
}

#[derive(Clone)]
// A transaction.
pub struct Transaction {
    pub transaction_row: TransactionRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl Transaction {
    pub fn id(&self) -> String {
        self.transaction_row.id.to_string()
    }

    pub async fn name(&self, database: &DatabaseConnection) -> Name {
        let name_row = database
            .get_name(self.transaction_row.name_id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get name for transaction {}",
                    self.transaction_row.id
                )
            });

        Name { name_row }
    }

    pub fn invoice_number(&self) -> i32 {
        self.transaction_row.invoice_number
    }

    pub fn type_of(&self) -> TransactionType {
        match self.transaction_row.type_of {
            TransactionRowType::CustomerInvoice => TransactionType::CustomerInvoice,
            TransactionRowType::CustomerCredit => TransactionType::CustomerCredit,
            TransactionRowType::SupplierInvoice => TransactionType::SupplierInvoice,
            TransactionRowType::SupplierCredit => TransactionType::SupplierCredit,
            TransactionRowType::Repack => TransactionType::Repack,
            TransactionRowType::Build => TransactionType::Build,
            TransactionRowType::Receipt => TransactionType::Receipt,
            TransactionRowType::Payment => TransactionType::Payment,
        }
    }

    pub async fn transaction_lines(&self, database: &DatabaseConnection) -> Vec<TransactionLine> {
        let transaction_line_rows: Vec<TransactionLineRow> = database
            .get_transaction_lines(self.transaction_row.id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get transaction_lines for transaction {}",
                    self.transaction_row.id
                )
            });

        transaction_line_rows
            .into_iter()
            .map(|transaction_line_row| TransactionLine {
                transaction_line_row,
            })
            .collect()
    }
}

#[derive(Clone)]
// A transaction line
pub struct TransactionLine {
    pub transaction_line_row: TransactionLineRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl TransactionLine {
    pub fn id(&self) -> String {
        self.transaction_line_row.id.clone()
    }

    pub async fn transaction(&self, database: &DatabaseConnection) -> Transaction {
        let transaction_row: TransactionRow = database
            .get_transaction(self.transaction_line_row.transaction_id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get transaction for transaction_line {}",
                    self.transaction_line_row.id
                )
            });

        Transaction { transaction_row }
    }

    pub async fn item(&self, database: &DatabaseConnection) -> Item {
        let item_row = database
            .get_item(self.transaction_line_row.item_id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get item for transaction_line {}",
                    self.transaction_line_row.id
                )
            });

        Item { item_row }
    }

    pub async fn item_line(&self, database: &DatabaseConnection) -> ItemLine {
        // Handle optional item_line_id correctly.
        let item_line_row = database
            .get_item_line(self.transaction_line_row.item_line_id.clone().unwrap())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get item_line for transaction_line {}",
                    self.transaction_line_row.id
                )
            });

        ItemLine { item_line_row }
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
