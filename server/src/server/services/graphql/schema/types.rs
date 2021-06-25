use crate::database;

use juniper;

#[derive(Clone)]
pub struct Name {
    pub name_row: database::schema::NameRow,
}

#[juniper::graphql_object(Context = database::connection::DatabaseConnection)]
impl Name {
    pub fn id(&self) -> &str {
        &self.name_row.id
    }

    pub fn name(&self) -> &str {
        &self.name_row.id
    }

    pub async fn customer_invoices(
        &self,
        database: &database::connection::DatabaseConnection,
    ) -> Vec<Transact> {
        let customer_invoice_rows = database
            .get_customer_invoices_by_name_id(&self.name_row.id)
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get customer invoices for name {}",
                    self.name_row.id
                )
            });

        customer_invoice_rows
            .into_iter()
            .map(|customer_invoice_row| Transact {
                transact_row: customer_invoice_row,
            })
            .collect()
    }
}

#[derive(Clone)]
pub struct Store {
    pub store_row: database::schema::StoreRow,
}

#[juniper::graphql_object(Context = database::connection::DatabaseConnection)]
impl Store {
    pub fn id(&self) -> &str {
        &self.store_row.id
    }

    pub async fn name(&self, database: &database::connection::DatabaseConnection) -> Name {
        let name_row: database::schema::NameRow = database
            .get_name_by_id(&self.store_row.name_id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get name for transact {}", self.store_row.id));

        Name { name_row }
    }

    pub async fn customer_invoices(
        &self,
        database: &database::connection::DatabaseConnection,
    ) -> Vec<Transact> {
        let customer_invoice_rows: Vec<database::schema::TransactRow> = database
            .get_customer_invoices_by_store_id(&self.store_row.id)
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get customer invoices for store {}",
                    self.store_row.id
                )
            });

        customer_invoice_rows
            .into_iter()
            .map(|customer_invoice_row| Transact {
                transact_row: customer_invoice_row,
            })
            .collect()
    }
}

#[derive(juniper::GraphQLEnum)]
pub enum ItemType {
    #[graphql(name = "general")]
    General,
    #[graphql(name = "service")]
    Service,
    #[graphql(name = "cross_reference")]
    CrossReference,
}

impl From<database::schema::ItemRowType> for ItemType {
    fn from(item_type: database::schema::ItemRowType) -> ItemType {
        match item_type {
            database::schema::ItemRowType::General => ItemType::General,
            database::schema::ItemRowType::Service => ItemType::Service,
            database::schema::ItemRowType::CrossReference => ItemType::CrossReference,
        }
    }
}

impl From<ItemType> for database::schema::ItemRowType {
    fn from(item_type: ItemType) -> database::schema::ItemRowType {
        match item_type {
            ItemType::General => database::schema::ItemRowType::General,
            ItemType::Service => database::schema::ItemRowType::Service,
            ItemType::CrossReference => database::schema::ItemRowType::CrossReference,
        }
    }
}

#[derive(Clone)]
pub struct Item {
    pub item_row: database::schema::ItemRow,
}

#[juniper::graphql_object(Context = database::connection::DatabaseConnection)]
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
    pub item_line_row: database::schema::ItemLineRow,
}

#[juniper::graphql_object(Context = database::connection::DatabaseConnection)]
impl ItemLine {
    pub fn id(&self) -> &str {
        &self.item_line_row.id
    }

    pub async fn item(&self, database: &database::connection::DatabaseConnection) -> Item {
        let item_row: database::schema::ItemRow = database
            .get_item_by_id(&self.item_line_row.item_id)
            .await
            .unwrap_or_else(|_| {
                panic!("Failed to get item for item line {}", self.item_line_row.id)
            });

        Item { item_row }
    }

    pub async fn store(&self, database: &database::connection::DatabaseConnection) -> Store {
        let store_row: database::schema::StoreRow = database
            .get_store_by_id(&self.item_line_row.store_id)
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

#[derive(juniper::GraphQLEnum)]
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

impl From<database::schema::RequisitionRowType> for RequisitionType {
    fn from(requisition_row_type: database::schema::RequisitionRowType) -> RequisitionType {
        match requisition_row_type {
            database::schema::RequisitionRowType::Imprest => RequisitionType::Imprest,
            database::schema::RequisitionRowType::StockHistory => RequisitionType::StockHistory,
            database::schema::RequisitionRowType::Request => RequisitionType::Request,
            database::schema::RequisitionRowType::Response => RequisitionType::Response,
            database::schema::RequisitionRowType::Supply => RequisitionType::Supply,
            database::schema::RequisitionRowType::Report => RequisitionType::Report,
        }
    }
}

impl From<RequisitionType> for database::schema::RequisitionRowType {
    fn from(requisition_type: RequisitionType) -> database::schema::RequisitionRowType {
        match requisition_type {
            RequisitionType::Imprest => database::schema::RequisitionRowType::Imprest,
            RequisitionType::StockHistory => database::schema::RequisitionRowType::StockHistory,
            RequisitionType::Request => database::schema::RequisitionRowType::Request,
            RequisitionType::Response => database::schema::RequisitionRowType::Response,
            RequisitionType::Supply => database::schema::RequisitionRowType::Supply,
            RequisitionType::Report => database::schema::RequisitionRowType::Report,
        }
    }
}

#[derive(Clone)]
pub struct Requisition {
    pub requisition_row: database::schema::RequisitionRow,
}

#[juniper::graphql_object(Context = database::connection::DatabaseConnection)]
impl Requisition {
    pub fn id(&self) -> &str {
        &self.requisition_row.id
    }

    pub async fn name(&self, database: &database::connection::DatabaseConnection) -> Name {
        let name_row: database::schema::NameRow = database
            .get_name_by_id(&self.requisition_row.name_id)
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get store for item line {}",
                    self.requisition_row.id
                )
            });

        Name { name_row }
    }

    pub async fn store(&self, database: &database::connection::DatabaseConnection) -> Store {
        let store_row: database::schema::StoreRow = database
            .get_store_by_id(&self.requisition_row.store_id)
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

    pub async fn requisition_lines(
        &self,
        database: &database::connection::DatabaseConnection,
    ) -> Vec<RequisitionLine> {
        let requisition_line_rows: Vec<database::schema::RequisitionLineRow> = database
            .get_requisition_lines_by_requisition_id(&self.requisition_row.id)
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
    pub requisition_line_row: database::schema::RequisitionLineRow,
}

#[juniper::graphql_object(Context = database::connection::DatabaseConnection)]
impl RequisitionLine {
    pub fn id(&self) -> &str {
        &self.requisition_line_row.id
    }

    pub async fn item(&self, database: &database::connection::DatabaseConnection) -> Item {
        let item_row: database::schema::ItemRow = database
            .get_item_by_id(&self.requisition_line_row.item_id)
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

#[derive(juniper::GraphQLEnum)]
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

impl From<database::schema::TransactRowType> for TransactType {
    fn from(transact_row_type: database::schema::TransactRowType) -> TransactType {
        match transact_row_type {
            database::schema::TransactRowType::CustomerInvoice => TransactType::CustomerInvoice,
            database::schema::TransactRowType::CustomerCredit => TransactType::CustomerCredit,
            database::schema::TransactRowType::SupplierInvoice => TransactType::SupplierInvoice,
            database::schema::TransactRowType::SupplierCredit => TransactType::SupplierCredit,
            database::schema::TransactRowType::Repack => TransactType::Repack,
            database::schema::TransactRowType::Build => TransactType::Build,
            database::schema::TransactRowType::Receipt => TransactType::Receipt,
            database::schema::TransactRowType::Payment => TransactType::Payment,
        }
    }
}

impl From<TransactType> for database::schema::TransactRowType {
    fn from(transact_type: TransactType) -> database::schema::TransactRowType {
        match transact_type {
            TransactType::CustomerInvoice => database::schema::TransactRowType::CustomerInvoice,
            TransactType::CustomerCredit => database::schema::TransactRowType::CustomerCredit,
            TransactType::SupplierInvoice => database::schema::TransactRowType::SupplierInvoice,
            TransactType::SupplierCredit => database::schema::TransactRowType::SupplierCredit,
            TransactType::Repack => database::schema::TransactRowType::Repack,
            TransactType::Build => database::schema::TransactRowType::Build,
            TransactType::Receipt => database::schema::TransactRowType::Receipt,
            TransactType::Payment => database::schema::TransactRowType::Payment,
        }
    }
}

#[derive(Clone)]
pub struct Transact {
    pub transact_row: database::schema::TransactRow,
}

#[juniper::graphql_object(Context = database::connection::DatabaseConnection)]
impl Transact {
    pub fn id(&self) -> String {
        self.transact_row.id.to_string()
    }

    pub async fn name(&self, database: &database::connection::DatabaseConnection) -> Name {
        let name_row: database::schema::NameRow = database
            .get_name_by_id(&self.transact_row.name_id)
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

    pub async fn transact_lines(
        &self,
        database: &database::connection::DatabaseConnection,
    ) -> Vec<TransactLine> {
        let transact_line_rows: Vec<database::schema::TransactLineRow> = database
            .get_transact_lines_by_transact_id(&self.transact_row.id)
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
    pub transact_line_row: database::schema::TransactLineRow,
}

#[juniper::graphql_object(Context = database::connection::DatabaseConnection)]
impl TransactLine {
    pub fn id(&self) -> &str {
        &self.transact_line_row.id
    }

    pub async fn transact(&self, database: &database::connection::DatabaseConnection) -> Transact {
        let transact_row: database::schema::TransactRow = database
            .get_transact_by_id(&self.transact_line_row.transact_id)
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get transact for transact_line {}",
                    self.transact_line_row.id
                )
            });

        Transact { transact_row }
    }

    pub async fn item(&self, database: &database::connection::DatabaseConnection) -> Item {
        let item_row: database::schema::ItemRow = database
            .get_item_by_id(&self.transact_line_row.item_id)
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get item for transact_line {}",
                    self.transact_line_row.id
                )
            });

        Item { item_row }
    }

    pub async fn item_line(&self, database: &database::connection::DatabaseConnection) -> ItemLine {
        // Handle optional item_line_id correctly.
        let item_line_row: database::schema::ItemLineRow = database
            .get_item_line_by_id(self.transact_line_row.item_line_id.as_ref().unwrap())
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

#[derive(Clone, juniper::GraphQLInputObject)]
pub struct InputRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub actual_quantity: f64,
    pub suggested_quantity: f64,
}
