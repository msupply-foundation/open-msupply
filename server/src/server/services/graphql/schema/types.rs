use crate::database::schema::{
    ItemLineRow, ItemRow, NameRow, RequisitionLineRow, RequisitionRow, RequisitionRowType,
    StoreRow, TransactLineRow, TransactRow, TransactRowType,
};
use crate::database::DatabaseConnection;

use juniper::{graphql_object, GraphQLEnum, GraphQLInputObject};

#[derive(Clone)]
pub struct Name {
    pub name_row: NameRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl Name {
    pub fn id(&self) -> &str {
        &self.name_row.id
    }

    pub fn name(&self) -> &str {
        &self.name_row.id
    }
}

#[derive(Clone)]
pub struct Store {
    pub store_row: StoreRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl Store {
    pub fn id(&self) -> &str {
        &self.store_row.id
    }

    pub async fn name(&self, database: &DatabaseConnection) -> Name {
        let name_row = database
            .get_name(&self.store_row.name_id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get name for transact {}", self.store_row.id));

        Name { name_row }
    }
}

#[derive(Clone)]
pub struct Item {
    pub item_row: ItemRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl Item {
    pub fn id(&self) -> &str {
        &self.item_row.id
    }

    pub fn item_name(&self) -> &str {
        &self.item_row.item_name
    }
}

#[derive(Clone)]
pub struct ItemLine {
    pub item_line_row: ItemLineRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl ItemLine {
    pub fn id(&self) -> &str {
        &self.item_line_row.id
    }

    pub async fn item(&self, database: &DatabaseConnection) -> Item {
        let item_row = database
            .get_item(&self.item_line_row.item_id)
            .await
            .unwrap_or_else(|_| {
                panic!("Failed to get item for item line {}", self.item_line_row.id)
            });

        Item { item_row }
    }

    pub async fn store(&self, database: &DatabaseConnection) -> Store {
        let store_row = database
            .get_store(&self.item_line_row.store_id)
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get store for item line {}",
                    self.item_line_row.id
                )
            });

        Store { store_row }
    }

    pub fn batch(&self) -> &str {
        &self.item_line_row.batch
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

impl From<RequisitionRowType> for RequisitionType {
    fn from(requisition_row_type: RequisitionRowType) -> RequisitionType {
        match requisition_row_type {
            RequisitionRowType::Imprest => RequisitionType::Imprest,
            RequisitionRowType::StockHistory => RequisitionType::StockHistory,
            RequisitionRowType::Request => RequisitionType::Request,
            RequisitionRowType::Response => RequisitionType::Response,
            RequisitionRowType::Supply => RequisitionType::Supply,
            RequisitionRowType::Report => RequisitionType::Report,
        }
    }
}

impl From<RequisitionType> for RequisitionRowType {
    fn from(requisition_type: RequisitionType) -> RequisitionRowType {
        match requisition_type {
            RequisitionType::Imprest => RequisitionRowType::Imprest,
            RequisitionType::StockHistory => RequisitionRowType::StockHistory,
            RequisitionType::Request => RequisitionRowType::Request,
            RequisitionType::Response => RequisitionRowType::Response,
            RequisitionType::Supply => RequisitionRowType::Supply,
            RequisitionType::Report => RequisitionRowType::Report,
        }
    }
}

#[derive(Clone)]
pub struct Requisition {
    pub requisition_row: RequisitionRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl Requisition {
    pub fn id(&self) -> &str {
        &self.requisition_row.id
    }

    pub async fn name(&self, database: &DatabaseConnection) -> Name {
        let name_row = database
            .get_name(&self.requisition_row.name_id)
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
            .get_store(&self.requisition_row.store_id)
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
        self.requisition_row.type_of.clone().into()
    }

    pub async fn requisition_lines(&self, database: &DatabaseConnection) -> Vec<RequisitionLine> {
        let requisition_line_rows = database
            .get_requisition_lines(&self.requisition_row.id)
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
pub struct RequisitionLine {
    pub requisition_line_row: RequisitionLineRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl RequisitionLine {
    pub fn id(&self) -> &str {
        &self.requisition_line_row.id
    }

    pub async fn item(&self, database: &DatabaseConnection) -> Item {
        let item_row = database
            .get_item(&self.requisition_line_row.item_id)
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
pub enum TransactType {
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

impl From<TransactRowType> for TransactType {
    fn from(transact_row_type: TransactRowType) -> TransactType {
        match transact_row_type {
            TransactRowType::CustomerInvoice => TransactType::CustomerInvoice,
            TransactRowType::CustomerCredit => TransactType::CustomerCredit,
            TransactRowType::SupplierInvoice => TransactType::SupplierInvoice,
            TransactRowType::SupplierCredit => TransactType::SupplierCredit,
            TransactRowType::Repack => TransactType::Repack,
            TransactRowType::Build => TransactType::Build,
            TransactRowType::Receipt => TransactType::Receipt,
            TransactRowType::Payment => TransactType::Payment,
        }
    }
}

impl From<TransactType> for TransactRowType {
    fn from(transact_type: TransactType) -> TransactRowType {
        match transact_type {
            TransactType::CustomerInvoice => TransactRowType::CustomerInvoice,
            TransactType::CustomerCredit => TransactRowType::CustomerCredit,
            TransactType::SupplierInvoice => TransactRowType::SupplierInvoice,
            TransactType::SupplierCredit => TransactRowType::SupplierCredit,
            TransactType::Repack => TransactRowType::Repack,
            TransactType::Build => TransactRowType::Build,
            TransactType::Receipt => TransactRowType::Receipt,
            TransactType::Payment => TransactRowType::Payment,
        }
    }
}

#[derive(Clone)]
pub struct Transact {
    pub transact_row: TransactRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl Transact {
    pub fn id(&self) -> String {
        self.transact_row.id.to_string()
    }

    pub async fn name(&self, database: &DatabaseConnection) -> Name {
        let name_row = database
            .get_name(&self.transact_row.name_id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get name for transact {}", self.transact_row.id));

        Name { name_row }
    }

    pub fn invoice_number(&self) -> i32 {
        self.transact_row.invoice_number
    }

    pub fn type_of(&self) -> TransactType {
        self.transact_row.type_of.clone().into()
    }

    pub async fn transact_lines(&self, database: &DatabaseConnection) -> Vec<TransactLine> {
        let transact_line_rows: Vec<TransactLineRow> = database
            .get_transact_lines(&self.transact_row.id)
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get transact_lines for transact {}",
                    self.transact_row.id
                )
            });

        transact_line_rows
            .into_iter()
            .map(|transact_line_row| TransactLine { transact_line_row })
            .collect()
    }
}

#[derive(Clone)]
pub struct TransactLine {
    pub transact_line_row: TransactLineRow,
}

#[graphql_object(Context = DatabaseConnection)]
impl TransactLine {
    pub fn id(&self) -> &str {
        &self.transact_line_row.id
    }

    pub async fn transact(&self, database: &DatabaseConnection) -> Transact {
        let transact_row: TransactRow = database
            .get_transact(&self.transact_line_row.transact_id)
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get transact for transact_line {}",
                    self.transact_line_row.id
                )
            });

        Transact { transact_row }
    }

    pub async fn item(&self, database: &DatabaseConnection) -> Item {
        let item_row = database
            .get_item(&self.transact_line_row.item_id)
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get item for transact_line {}",
                    self.transact_line_row.id
                )
            });

        Item { item_row }
    }

    pub async fn item_line(&self, database: &DatabaseConnection) -> ItemLine {
        // Handle optional item_line_id correctly.
        let item_line_row = database
            .get_item_line(self.transact_line_row.item_line_id.as_ref().unwrap())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get item_line for transact_line {}",
                    self.transact_line_row.id
                )
            });

        ItemLine { item_line_row }
    }
}

#[derive(Clone, GraphQLInputObject)]
pub struct InputRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub actual_quantity: f64,
    pub suggested_quantity: f64,
}
