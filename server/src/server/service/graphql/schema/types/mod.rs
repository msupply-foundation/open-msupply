use crate::{
    database::{
        loader::{StoreLoader, TransactLoader},
        repository::{
            CustomerInvoiceRepository, RequisitionLineRepository, TransactLineRepository,
        },
        schema::{
            RequisitionLineRow, RequisitionRow, RequisitionRowType, StoreRow, TransactLineRow,
            TransactRow, TransactRowType,
        },
    },
    server::service::graphql::ContextExt,
};

use async_graphql::{dataloader::DataLoader, Context, Enum, InputObject, Object};

// M1 speced API is moved to their own files
// Types defined here are prototype types and should be removed before M1 release to avoid confusion (for consumers and devs)
pub mod name;
pub use self::name::*;

pub mod item;
pub use self::item::*;

pub mod stock_line;
pub use self::stock_line::*;

#[derive(Clone)]
pub struct Store {
    pub store_row: StoreRow,
}

#[Object]
impl Store {
    pub async fn id(&self) -> &str {
        &self.store_row.id
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

    pub async fn store(&self, ctx: &Context<'_>) -> Store {
        let store_loader = ctx.get_loader::<DataLoader<StoreLoader>>();

        let store_row: StoreRow = store_loader
            .load_one(self.requisition_row.store_id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get store for requisition {}",
                    self.requisition_row.id
                )
            })
            .ok_or_else(|| {
                panic!(
                    "Failed to get store for requisition {}",
                    self.requisition_row.id
                )
            })
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get store for requisition {}",
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
        let transact_loader = ctx.get_loader::<DataLoader<TransactLoader>>();

        let transact_row: TransactRow = transact_loader
            .load_one(self.transact_line_row.transact_id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get transact for transact_line {}",
                    self.transact_line_row.id
                )
            })
            .ok_or_else(|| {
                panic!(
                    "Failed to get transact for transact_line {}",
                    self.transact_line_row.id
                )
            })
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get transact for transact_line {}",
                    self.transact_line_row.id
                )
            });

        Transact { transact_row }
    }
}

#[derive(Clone, InputObject)]
pub struct InputRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub actual_quantity: f64,
    pub suggested_quantity: f64,
}
