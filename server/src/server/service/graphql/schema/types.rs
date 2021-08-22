use crate::{
    database::{
        loader::{ItemLineLoader, ItemLoader},
        repository::{
            CustomerInvoiceRepository, ItemRepository, NameRepository, RequisitionLineRepository,
            StoreRepository, TransactLineRepository, TransactRepository,
        },
        schema::{
            ItemLineRow, ItemRow, ItemRowType, NameRow, RequisitionLineRow, RequisitionRow,
            RequisitionRowType, StoreRow, TransactLineRow, TransactRow, TransactRowType,
        },
    },
    server::service::graphql::ContextExt,
};

use async_graphql::{dataloader::DataLoader, Context, Enum, InputObject, Object};

#[derive(Clone)]
pub struct Name {
    pub name_row: NameRow,
}

#[Object]
impl Name {
    pub async fn id(&self) -> &str {
        &self.name_row.id
    }

    pub async fn name(&self) -> &str {
        &self.name_row.id
    }

    pub async fn customer_invoices(&self, ctx: &Context<'_>) -> Vec<Transact> {
        let customer_invoice_repository = ctx.get_repository::<CustomerInvoiceRepository>();

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

#[Object]
impl Store {
    pub async fn id(&self) -> &str {
        &self.store_row.id
    }

    pub async fn name(&self, ctx: &Context<'_>) -> Name {
        let name_repository = ctx.get_repository::<NameRepository>();

        let name_row: NameRow = name_repository
            .find_one_by_id(&self.store_row.name_id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get name for transact {}", self.store_row.id));
        Name { name_row }
    }

    pub async fn customer_invoices(&self, ctx: &Context<'_>) -> Vec<Transact> {
        let customer_invoice_repository = ctx.get_repository::<CustomerInvoiceRepository>();

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

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
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

#[Object]
impl Item {
    pub async fn id(&self) -> &str {
        &self.item_row.id
    }

    pub async fn item_name(&self) -> &str {
        &self.item_row.item_name
    }

    pub async fn type_of(&self) -> ItemType {
        self.item_row.type_of.clone().into()
    }
}

#[derive(Clone)]
pub struct ItemLine {
    pub item_line_row: ItemLineRow,
}

#[Object]
impl ItemLine {
    pub async fn id(&self) -> &str {
        &self.item_line_row.id
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Item {
        let item_loader = ctx.get_loader::<DataLoader<ItemLoader>>();

        let item_row: ItemRow = item_loader
            .load_one(self.item_line_row.item_id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!("Failed to get item for item_line {}", self.item_line_row.id)
            })
            .ok_or_else(|| panic!("Failed to get item for item_line {}", self.item_line_row.id))
            .unwrap_or_else(|_| {
                panic!("Failed to get item for item_line {}", self.item_line_row.id)
            });

        Item { item_row }
    }

    pub async fn store(&self, ctx: &Context<'_>) -> Store {
        let store_repository = ctx.get_repository::<StoreRepository>();

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

    pub async fn batch(&self) -> &str {
        &self.item_line_row.batch
    }

    pub async fn quantity(&self) -> f64 {
        self.item_line_row.quantity
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
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

#[Object]
impl Requisition {
    pub async fn id(&self) -> &str {
        &self.requisition_row.id
    }

    pub async fn name(&self, ctx: &Context<'_>) -> Name {
        let name_repository = ctx.get_repository::<NameRepository>();

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

    pub async fn store(&self, ctx: &Context<'_>) -> Store {
        let store_repository = ctx.get_repository::<StoreRepository>();

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

    pub async fn type_of(&self) -> RequisitionType {
        self.requisition_row.type_of.clone().into()
    }

    pub async fn requisition_lines(&self, ctx: &Context<'_>) -> Vec<RequisitionLine> {
        let requisition_line_repository = ctx.get_repository::<RequisitionLineRepository>();

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

#[Object]
impl RequisitionLine {
    pub async fn id(&self) -> &str {
        &self.requisition_line_row.id
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Item {
        let item_loader = ctx.get_loader::<DataLoader<ItemLoader>>();

        let item_row: ItemRow = item_loader
            .load_one(self.requisition_line_row.item_id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get item for requisition_line {}",
                    self.requisition_line_row.id
                )
            })
            .ok_or_else(|| {
                panic!(
                    "Failed to get item for requisition_line {}",
                    self.requisition_line_row.id
                )
            })
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get item for requisition_line {}",
                    self.requisition_line_row.id
                )
            });

        Item { item_row }
    }

    pub async fn actual_quantity(&self) -> f64 {
        self.requisition_line_row.actual_quantity
    }

    pub async fn suggested_quantity(&self) -> f64 {
        self.requisition_line_row.suggested_quantity
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
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

#[Object]
impl Transact {
    pub async fn id(&self) -> String {
        self.transact_row.id.to_string()
    }

    pub async fn name(&self, ctx: &Context<'_>) -> Name {
        let name_repository = ctx.get_repository::<NameRepository>();

        let name_row: NameRow = name_repository
            .find_one_by_id(&self.transact_row.name_id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get name for transact {}", self.transact_row.id));

        Name { name_row }
    }

    pub async fn invoice_number(&self) -> i32 {
        self.transact_row.invoice_number
    }

    pub async fn type_of(&self) -> TransactType {
        self.transact_row.type_of.clone().into()
    }

    pub async fn transact_lines(&self, ctx: &Context<'_>) -> Vec<TransactLine> {
        let transact_line_repository = ctx.get_repository::<TransactLineRepository>();

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

#[Object]
impl TransactLine {
    pub async fn id(&self) -> &str {
        &self.transact_line_row.id
    }

    pub async fn transact(&self, ctx: &Context<'_>) -> Transact {
        let transact_repository = ctx.get_repository::<TransactRepository>();

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

    pub async fn item(&self, ctx: &Context<'_>) -> Item {
        let item_repository = ctx.get_repository::<ItemRepository>();

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

    pub async fn item_line(&self, ctx: &Context<'_>) -> ItemLine {
        let item_line_loader = ctx.get_loader::<DataLoader<ItemLineLoader>>();

        // Handle optional item_line_id correctly.
        let item_line_id = self.transact_line_row.item_line_id.as_ref().unwrap();

        let item_line_row: ItemLineRow = item_line_loader
            .load_one(item_line_id.to_owned())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get item_line for transact_line {}",
                    self.transact_line_row.id
                )
            })
            .ok_or_else(|| {
                panic!(
                    "Failed to get item_line for transact_line {}",
                    self.transact_line_row.id
                )
            })
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get item_line for transact_line {}",
                    self.transact_line_row.id
                )
            });

        ItemLine { item_line_row }
    }
}

#[derive(Clone, InputObject)]
pub struct InputRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub actual_quantity: f64,
    pub suggested_quantity: f64,
}
