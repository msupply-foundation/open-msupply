use crate::{
    database::repository::RepositoryError,
    domain::PaginationOption,
    service::{usize_to_u32, ListError, ListResult, SingleRecordError},
};

use async_graphql::*;

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

pub mod invoice_line;
pub use self::invoice_line::*;

pub mod sort_filter_types;
pub use self::sort_filter_types::*;

use super::mutations::{customer_invoice::*, supplier_invoice::*};

/// Generic Connector
#[derive(SimpleObject)]
#[graphql(concrete(name = "ItemConnector", params(ItemNode)))]
#[graphql(concrete(name = "NameConnector", params(NameNode)))]
#[graphql(concrete(name = "InvoiceConnector", params(InvoiceNode)))]
#[graphql(concrete(name = "InvoiceLineConnector", params(InvoiceLineNode)))]
#[graphql(concrete(name = "StockLineConnector", params(StockLineNode)))]
pub struct Connector<T: OutputType> {
    total_count: u32,
    nodes: Vec<T>,
}

/// Convert from ListResult (service return) to Generic Connector
impl<DomainType, GQLType> From<ListResult<DomainType>> for Connector<GQLType>
where
    GQLType: From<DomainType> + OutputType,
{
    fn from(ListResult { count, rows }: ListResult<DomainType>) -> Self {
        Connector {
            total_count: count,
            nodes: rows.into_iter().map(GQLType::from).collect(),
        }
    }
}

/// Convert from Vec<T> (loader result) to Generic Connector
impl<DomainType, GQLType> From<Vec<DomainType>> for Connector<GQLType>
where
    GQLType: From<DomainType> + OutputType,
{
    fn from(rows: Vec<DomainType>) -> Self {
        Connector {
            total_count: usize_to_u32(rows.len()),
            nodes: rows.into_iter().map(GQLType::from).collect(),
        }
    }
}

/// Generic Pagination Input
#[derive(InputObject)]
pub struct PaginationInput {
    pub first: Option<u32>,
    pub offset: Option<u32>,
}

impl From<PaginationInput> for PaginationOption {
    fn from(PaginationInput { first, offset }: PaginationInput) -> Self {
        PaginationOption {
            limit: first,
            offset,
        }
    }
}

/// Generic Error Wrapper
#[derive(SimpleObject)]
#[graphql(concrete(name = "ConnectorError", params(ConnectorErrorInterface)))]
#[graphql(concrete(name = "NodeError", params(NodeErrorInterface)))]
#[graphql(concrete(
    name = "InsertCustomerInvoiceError",
    params(InsertCustomerInvoiceErrorInterface)
))]
#[graphql(concrete(
    name = "UpdateCustomerInvoiceError",
    params(UpdateCustomerInvoiceErrorInterface)
))]
#[graphql(concrete(
    name = "DeleteCustomerInvoiceError",
    params(DeleteCustomerInvoiceErrorInterface)
))]
#[graphql(concrete(
    name = "InsertSupplierInvoiceError",
    params(InsertSupplierInvoiceErrorInterface)
))]
#[graphql(concrete(
    name = "UpdateSupplierInvoiceError",
    params(UpdateSupplierInvoiceErrorInterface)
))]
#[graphql(concrete(
    name = "DeleteSupplierInvoiceError",
    params(DeleteSupplierInvoiceErrorInterface)
))]
#[graphql(concrete(
    name = "InsertSupplierInvoiceLineError",
    params(InsertSupplierInvoiceLineErrorInterface)
))]
#[graphql(concrete(
    name = "UpdateSupplierInvoiceLineError",
    params(UpdateSupplierInvoiceLineErrorInterface)
))]
#[graphql(concrete(
    name = "DeleteSupplierInvoiceLineError",
    params(DeleteSupplierInvoiceLineErrorInterface)
))]
#[graphql(concrete(
    name = "InsertCustomerInvoiceLineError",
    params(InsertCustomerInvoiceLineErrorInterface)
))]
#[graphql(concrete(
    name = "UpdateCustomerInvoiceLineError",
    params(UpdateCustomerInvoiceLineErrorInterface)
))]
#[graphql(concrete(
    name = "DeleteCustomerInvoiceLineError",
    params(DeleteCustomerInvoiceLineErrorInterface)
))]

pub struct ErrorWrapper<T: OutputType> {
    pub error: T,
}

pub type ConnectorError = ErrorWrapper<ConnectorErrorInterface>;
pub type NodeError = ErrorWrapper<NodeErrorInterface>;

// Generic Connector Error Interface
#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum ConnectorErrorInterface {
    DatabaseError(DatabaseError),
    PaginationError(PaginationError),
}

// Generic Node Error Interface
#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum NodeErrorInterface {
    DatabaseError(DatabaseError),
    RecordNotFound(RecordNotFound),
}

/// Convert from ListError (service result) to Generic connector error
impl From<ListError> for ConnectorError {
    fn from(error: ListError) -> Self {
        let error = match error {
            ListError::DatabaseError(error) => {
                ConnectorErrorInterface::DatabaseError(DatabaseError(error))
            }
            ListError::LimitBelowMin(min) => {
                ConnectorErrorInterface::PaginationError(PaginationError(RangeError {
                    field: RangeField::First,
                    range: Range::Min(min),
                }))
            }
            ListError::LimitAboveMax(max) => {
                ConnectorErrorInterface::PaginationError(PaginationError(RangeError {
                    field: RangeField::First,
                    range: Range::Max(max),
                }))
            }
        };

        ErrorWrapper { error }
    }
}

/// Convert from SingleRecordError (service result) to Generic single node error
impl From<SingleRecordError> for NodeError {
    fn from(error: SingleRecordError) -> Self {
        let error = match error {
            SingleRecordError::DatabaseError(error) => {
                NodeErrorInterface::DatabaseError(DatabaseError(error))
            }
            SingleRecordError::NotFound(_) => NodeErrorInterface::RecordNotFound(RecordNotFound),
        };

        ErrorWrapper { error }
    }
}

/// Convert from RepositoryError (loader result) to Generic connector error
impl From<RepositoryError> for ConnectorError {
    fn from(error: RepositoryError) -> Self {
        ErrorWrapper {
            error: ConnectorErrorInterface::DatabaseError(DatabaseError(error)),
        }
    }
}

/// Convert from RepositoryError (loader result) to Generic single node error
impl From<RepositoryError> for NodeError {
    fn from(error: RepositoryError) -> Self {
        ErrorWrapper {
            error: NodeErrorInterface::DatabaseError(DatabaseError(error)),
        }
    }
}

// Generic Errors
pub struct DatabaseError(pub RepositoryError);

#[Object]
impl DatabaseError {
    pub async fn description(&self) -> &'static str {
        "Database Error"
    }

    pub async fn full_error(&self) -> String {
        format!("{:#}", self.0)
    }
}

pub struct RecordNotFound;

#[Object]
impl RecordNotFound {
    pub async fn description(&self) -> &'static str {
        "Record not found"
    }
}

pub enum Range {
    Max(u32),
    Min(u32),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum RangeField {
    First,
    NumberOfPacks,
    PackSize,
}

pub struct RangeError {
    pub field: RangeField,
    pub range: Range,
}

#[Object]
impl RangeError {
    pub async fn description(&self) -> &'static str {
        match &self.range {
            Range::Max(_) => "Value is above maximum",
            Range::Min(_) => "Value is below minimum",
        }
    }

    pub async fn field(&self) -> &RangeField {
        &self.field
    }

    pub async fn max(&self) -> Option<u32> {
        match &self.range {
            Range::Max(max) => Some(max.clone()),
            _ => None,
        }
    }

    pub async fn min(&self) -> Option<u32> {
        match &self.range {
            Range::Min(min) => Some(min.clone()),
            _ => None,
        }
    }
}

pub struct PaginationError(RangeError);

#[Object]
impl PaginationError {
    pub async fn description(&self) -> &'static str {
        "Pagination parameter out of range"
    }

    pub async fn range_error(&self) -> &RangeError {
        &self.0
    }
}
