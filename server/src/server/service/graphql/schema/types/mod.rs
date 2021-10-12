use crate::{
    database::{
        loader::{InvoiceLoader, StoreLoader},
        repository::{
            CustomerInvoiceRepository, InvoiceLineRepository, RequisitionLineRepository,
            StorageConnectionManager,
        },
        schema::{
            InvoiceLineRow, InvoiceRow, RequisitionLineRow, RequisitionRow, RequisitionRowType,
            StoreRow,
        },
    },
    server::service::graphql::ContextExt,
};

use async_graphql::{dataloader::DataLoader, Context, Enum, Object};

// M1 speced API is moved to their own files
// Types defined here are prototype types and should be removed before M1 release to avoid confusion (for consumers and devs)
pub mod name;
pub use self::name::*;

pub mod item;
pub use self::item::*;

pub mod stock_line;
pub use self::stock_line::*;

pub mod invoice_query;
pub use self::invoice_query::*;

pub mod invoices_query;
pub use self::invoices_query::*;

pub mod sort_filter_types;
pub use self::sort_filter_types::*;

#[derive(Clone)]
pub struct Store {
    pub store_row: StoreRow,
}

#[Object]
impl Store {
    pub async fn id(&self) -> &str {
        &self.store_row.id
    }

    pub async fn customer_invoices(&self, ctx: &Context<'_>) -> Vec<Invoice> {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        let connection = connection_manager.connection().unwrap();
        let customer_invoice_repository = CustomerInvoiceRepository::new(&connection);

        let customer_invoice_rows: Vec<InvoiceRow> = customer_invoice_repository
            .find_many_by_store_id(&self.store_row.id)
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get customer invoices for store {}",
                    self.store_row.id
                )
            });

        customer_invoice_rows
            .into_iter()
            .map(|customer_invoice_row| Invoice {
                invoice_row: customer_invoice_row,
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

    pub async fn requisition_lines(&self, ctx: &Context<'_>) -> Vec<RequisitionLine> {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        let connection = connection_manager.connection().unwrap();
        let repo = RequisitionLineRepository::new(&connection);

        let requisition_line_rows: Vec<RequisitionLineRow> = repo
            .find_many_by_requisition_id(&self.requisition_row.id)
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

#[derive(Clone)]
pub struct Invoice {
    pub invoice_row: InvoiceRow,
}

#[Object]
impl Invoice {
    pub async fn id(&self) -> String {
        self.invoice_row.id.to_string()
    }

    pub async fn invoice_number(&self) -> i32 {
        self.invoice_row.invoice_number
    }

    pub async fn r#type(&self) -> InvoiceTypeInput {
        self.invoice_row.r#type.clone().into()
    }

    pub async fn invoice_lines(&self, ctx: &Context<'_>) -> Vec<InvoiceLine> {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        let connection = connection_manager.connection().unwrap();
        let invoice_line_repository = InvoiceLineRepository::new(&connection);

        let invoice_line_rows: Vec<InvoiceLineRow> = invoice_line_repository
            .find_many_by_invoice_id(&self.invoice_row.id)
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get invoice_lines for invoice {}",
                    self.invoice_row.id
                )
            });

        invoice_line_rows
            .into_iter()
            .map(|invoice_line_row| InvoiceLine { invoice_line_row })
            .collect()
    }
}

#[derive(Clone)]
pub struct InvoiceLine {
    pub invoice_line_row: InvoiceLineRow,
}

#[Object]
impl InvoiceLine {
    pub async fn id(&self) -> &str {
        &self.invoice_line_row.id
    }

    pub async fn invoice(&self, ctx: &Context<'_>) -> Invoice {
        let invoice_loader = ctx.get_loader::<DataLoader<InvoiceLoader>>();

        let invoice_row: InvoiceRow = invoice_loader
            .load_one(self.invoice_line_row.invoice_id.clone())
            .await
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get invoice for invoice_line {}",
                    self.invoice_line_row.id
                )
            })
            .ok_or_else(|| {
                panic!(
                    "Failed to get invoice for invoice_line {}",
                    self.invoice_line_row.id
                )
            })
            .unwrap_or_else(|_| {
                panic!(
                    "Failed to get invoice for invoice_line {}",
                    self.invoice_line_row.id
                )
            });

        Invoice { invoice_row }
    }
}
