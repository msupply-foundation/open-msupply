use crate::database::repository::{
    CustomerInvoiceRepository, ItemLineRepository, ItemRepository, NameRepository,
    RequisitionLineRepository, StoreRepository, TransactLineRepository, TransactRepository,
};
use crate::database::schema::{
    ItemLineRow, ItemRow, ItemRowType, NameRow, RequisitionLineRow, RequisitionRow,
    RequisitionRowType, StoreRow, TransactLineRow, TransactRow, TransactRowType,
};
use crate::server::data::RepositoryRegistry;

use juniper;
use std::sync::Arc;

#[derive(Clone)]
pub struct Name {
    pub name_row: NameRow,
}

#[juniper::graphql_object(Context = RepositoryRegistry)]
impl Name {
    pub fn id(&self) -> &str {
        &self.name_row.id
    }

    pub fn name(&self) -> &str {
        &self.name_row.id
    }

    pub async fn customer_invoices(&self, registry: &RepositoryRegistry) -> Vec<Transact> {
        let customer_invoice_repository: Arc<CustomerInvoiceRepository> =
            match &registry.customer_invoice_repository {
                Some(repository) => Arc::clone(repository),
                None => panic!("Failed to find customer invoice repository"),
            };

        let customer_invoice_rows = customer_invoice_repository
            .find_many_by_name_id(&self.name_row.id)
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
    pub store_row: StoreRow,
}

#[juniper::graphql_object(Context = RepositoryRegistry)]
impl Store {
    pub fn id(&self) -> &str {
        &self.store_row.id
    }

    pub async fn name(&self, registry: &RepositoryRegistry) -> Name {
        let name_repository: Arc<NameRepository> = match &registry.name_repository {
            Some(repository) => Arc::clone(repository),
            None => panic!("Failed to find name repository"),
        };

        let name_row: NameRow = name_repository
            .find_one_by_id(&self.store_row.name_id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get name for transact {}", self.store_row.id));
        Name { name_row }
    }

    pub async fn customer_invoices(&self, registry: &RepositoryRegistry) -> Vec<Transact> {
        let customer_invoice_repository: Arc<CustomerInvoiceRepository> =
            match &registry.customer_invoice_repository {
                Some(repository) => Arc::clone(repository),
                None => panic!("Failed to find customer invoice repository"),
            };

        let customer_invoice_rows: Vec<TransactRow> = customer_invoice_repository
            .find_many_by_store_id(&self.store_row.id)
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

impl From<ItemRowType> for ItemType {
    fn from(item_type: ItemRowType) -> ItemType {
        match item_type {
            ItemRowType::General => ItemType::General,
            ItemRowType::Service => ItemType::Service,
            ItemRowType::CrossReference => ItemType::CrossReference,
        }
    }
}

impl From<ItemType> for ItemRowType {
    fn from(item_type: ItemType) -> ItemRowType {
        match item_type {
            ItemType::General => ItemRowType::General,
            ItemType::Service => ItemRowType::Service,
            ItemType::CrossReference => ItemRowType::CrossReference,
        }
    }
}

#[derive(Clone)]
pub struct Item {
    pub item_row: ItemRow,
}

#[juniper::graphql_object(Context = RepositoryRegistry)]
impl Item {
    pub fn id(&self) -> &str {
        &self.item_row.id
    }

    pub fn item_name(&self) -> &str {
        &self.item_row.item_name
    }

    pub fn type_of(&self) -> ItemType {
        self.item_row.type_of.clone().into()
    }
}

#[derive(Clone)]
pub struct ItemLine {
    pub item_line_row: ItemLineRow,
}

#[juniper::graphql_object(Context = RepositoryRegistry)]
impl ItemLine {
    pub fn id(&self) -> &str {
        &self.item_line_row.id
    }

    pub async fn item(&self, registry: &RepositoryRegistry) -> Item {
        let item_repository: Arc<ItemRepository> = match &registry.item_repository {
            Some(repository) => Arc::clone(repository),
            None => panic!("Failed to find customer invoice repository"),
        };

        let item_row: ItemRow = item_repository
            .find_one_by_id(&self.item_line_row.item_id)
            .await
            .unwrap_or_else(|_| {
                panic!("Failed to get item for item line {}", self.item_line_row.id)
            });

        Item { item_row }
    }

    pub async fn store(&self, registry: &RepositoryRegistry) -> Store {
        let store_repository: Arc<StoreRepository> = match &registry.store_repository {
            Some(repository) => Arc::clone(repository),
            None => panic!("Failed to find name repository"),
        };

        let store_row: StoreRow = store_repository
            .find_one_by_id(&self.item_line_row.store_id)
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

#[juniper::graphql_object(Context = RepositoryRegistry)]
impl Requisition {
    pub fn id(&self) -> &str {
        &self.requisition_row.id
    }

    pub async fn name(&self, registry: &RepositoryRegistry) -> Name {
        let name_repository: Arc<NameRepository> = match &registry.name_repository {
            Some(repository) => Arc::clone(repository),
            None => panic!("Failed to find name repository"),
        };

        let name_row: NameRow = name_repository
            .find_one_by_id(&self.requisition_row.name_id)
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get store for item line {}",
                    self.requisition_row.id
                )
            });

        Name { name_row }
    }

    pub async fn store(&self, registry: &RepositoryRegistry) -> Store {
        let store_repository: Arc<StoreRepository> = match &registry.store_repository {
            Some(repository) => Arc::clone(repository),
            None => panic!("Failed to find store repository"),
        };

        let store_row: StoreRow = store_repository
            .find_one_by_id(&self.requisition_row.store_id)
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

    pub async fn requisition_lines(&self, registry: &RepositoryRegistry) -> Vec<RequisitionLine> {
        let requisition_line_repository: Arc<RequisitionLineRepository> =
            match &registry.requisition_line_repository {
                Some(repository) => Arc::clone(repository),
                None => panic!("Failed to find requisition line repository"),
            };

        let requisition_line_rows: Vec<RequisitionLineRow> = requisition_line_repository
            .find_many_by_requisition_id(&self.requisition_row.id)
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

#[juniper::graphql_object(Context = RepositoryRegistry)]
impl RequisitionLine {
    pub fn id(&self) -> &str {
        &self.requisition_line_row.id
    }

    pub async fn item(&self, registry: &RepositoryRegistry) -> Item {
        let item_repository: Arc<ItemRepository> = match &registry.item_repository {
            Some(repository) => Arc::clone(repository),
            None => panic!("Failed to find item repository"),
        };

        let item_row: ItemRow = item_repository
            .find_one_by_id(&self.requisition_line_row.item_id)
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

#[juniper::graphql_object(Context = RepositoryRegistry)]
impl Transact {
    pub fn id(&self) -> String {
        self.transact_row.id.to_string()
    }

    pub async fn name(&self, registry: &RepositoryRegistry) -> Name {
        let name_repository: Arc<NameRepository> = match &registry.name_repository {
            Some(repository) => Arc::clone(repository),
            None => panic!("Failed to find name repository"),
        };

        let name_row: NameRow = name_repository
            .find_one_by_id(&self.transact_row.name_id)
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

    pub async fn transact_lines(&self, registry: &RepositoryRegistry) -> Vec<TransactLine> {
        let transact_line_repository: Arc<TransactLineRepository> =
            match &registry.transact_line_repository {
                Some(repository) => Arc::clone(repository),
                None => panic!("Failed to find transact line repositiory"),
            };

        let transact_line_rows: Vec<TransactLineRow> = transact_line_repository
            .find_many_by_transact_id(&self.transact_row.id)
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

#[juniper::graphql_object(Context = RepositoryRegistry)]
impl TransactLine {
    pub fn id(&self) -> &str {
        &self.transact_line_row.id
    }

    pub async fn transact(&self, registry: &RepositoryRegistry) -> Transact {
        let transact_repository: Arc<TransactRepository> = match &registry.transact_repository {
            Some(repository) => Arc::clone(repository),
            None => panic!("Failed to find transact repositiory"),
        };

        let transact_row: TransactRow = transact_repository
            .find_one_by_id(&self.transact_line_row.transact_id)
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get transact for transact_line {}",
                    self.transact_line_row.id
                )
            });

        Transact { transact_row }
    }

    pub async fn item(&self, registry: &RepositoryRegistry) -> Item {
        let item_repository: Arc<ItemRepository> = match &registry.item_repository {
            Some(repository) => Arc::clone(repository),
            None => panic!("Failed to find item repository"),
        };

        let item_row: ItemRow = item_repository
            .find_one_by_id(&self.transact_line_row.item_id)
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get item for transact_line {}",
                    self.transact_line_row.id
                )
            });

        Item { item_row }
    }

    pub async fn item_line(&self, registry: &RepositoryRegistry) -> ItemLine {
        let item_line_repository: Arc<ItemLineRepository> = match &registry.item_line_repository {
            Some(repository) => Arc::clone(repository),
            None => panic!("Failed to find item line repository"),
        };

        // Handle optional item_line_id correctly.
        let item_line_row: ItemLineRow = item_line_repository
            .find_one_by_id(self.transact_line_row.item_line_id.as_ref().unwrap())
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
