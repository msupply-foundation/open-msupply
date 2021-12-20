use crate::schema::{
    mutations::UserRegisterErrorInterface,
    queries::{AuthTokenErrorInterface, LogoutErrorInterface, RefreshTokenErrorInterface},
};
use domain::PaginationOption;
use repository::RepositoryError;
use service::{usize_to_u32, ListError, ListResult, SingleRecordError};

use async_graphql::*;

// M1 speced API is moved to their own files
// Types defined here are prototype types and should be removed before M1 release to avoid confusion (for consumers and devs)
pub mod name;
pub use self::name::*;

pub mod item;
pub use self::item::*;

pub mod stock_line;
pub use self::stock_line::*;

pub mod location;
pub use self::location::*;

pub mod master_list;
pub use self::master_list::*;

pub mod master_list_line;
pub use self::master_list_line::*;

pub mod invoice_query;
pub use self::invoice_query::*;

pub mod invoice_line;
pub use self::invoice_line::*;

pub mod sort_filter_types;
pub use self::sort_filter_types::*;

use super::mutations::{inbound_shipment::*, outbound_shipment::*};

/// Generic Connector
#[derive(SimpleObject)]
#[graphql(concrete(name = "InvoiceConnector", params(InvoiceNode)))]
#[graphql(concrete(name = "InvoiceLineConnector", params(InvoiceLineNode)))]
#[graphql(concrete(name = "StockLineConnector", params(StockLineNode)))]
#[graphql(concrete(name = "LocationConnector", params(LocationNode)))]
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

/// Pagination input.
///
/// Option to limit the number of returned items and/or queries large lists in "pages".
#[derive(InputObject)]
pub struct PaginationInput {
    /// Max number of returned items
    pub first: Option<u32>,
    /// First returned item is at the `offset` position in the full list
    pub offset: Option<u32>,
}

impl From<PaginationInput> for PaginationOption {
    fn from(
        PaginationInput {
            first: limit,
            offset,
        }: PaginationInput,
    ) -> Self {
        PaginationOption { limit, offset }
    }
}

/// Generic Error Wrapper
#[derive(SimpleObject)]
#[graphql(concrete(name = "ConnectorError", params(ConnectorErrorInterface)))]
#[graphql(concrete(name = "NodeError", params(NodeErrorInterface)))]
#[graphql(concrete(
    name = "InsertOutboundShipmentError",
    params(InsertOutboundShipmentErrorInterface)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentError",
    params(UpdateOutboundShipmentErrorInterface)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentError",
    params(DeleteOutboundShipmentErrorInterface)
))]
#[graphql(concrete(
    name = "InsertInboundShipmentError",
    params(InsertInboundShipmentErrorInterface)
))]
#[graphql(concrete(
    name = "UpdateInboundShipmentError",
    params(UpdateInboundShipmentErrorInterface)
))]
#[graphql(concrete(
    name = "DeleteInboundShipmentError",
    params(DeleteInboundShipmentErrorInterface)
))]
#[graphql(concrete(
    name = "InsertInboundShipmentLineError",
    params(InsertInboundShipmentLineErrorInterface)
))]
#[graphql(concrete(
    name = "UpdateInboundShipmentLineError",
    params(UpdateInboundShipmentLineErrorInterface)
))]
#[graphql(concrete(
    name = "DeleteInboundShipmentLineError",
    params(DeleteInboundShipmentLineErrorInterface)
))]
#[graphql(concrete(
    name = "InsertOutboundShipmentLineError",
    params(InsertOutboundShipmentLineErrorInterface)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentLineError",
    params(UpdateOutboundShipmentLineErrorInterface)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentLineError",
    params(DeleteOutboundShipmentLineErrorInterface)
))]
#[graphql(concrete(name = "UserRegisterError", params(UserRegisterErrorInterface)))]
#[graphql(concrete(name = "AuthTokenError", params(AuthTokenErrorInterface)))]
#[graphql(concrete(name = "RefreshTokenError", params(RefreshTokenErrorInterface)))]
#[graphql(concrete(name = "LogoutError", params(LogoutErrorInterface)))]
#[graphql(concrete(
    name = "InsertOutboundShipmentServiceLineError",
    params(InsertOutboundShipmentServiceLineErrorInterface)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentServiceLineError",
    params(UpdateOutboundShipmentServiceLineErrorInterface)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentServiceLineError",
    params(DeleteOutboundShipmentServiceLineErrorInterface)
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

impl NodeErrorInterface {
    pub fn record_not_found() -> NodeErrorInterface {
        NodeErrorInterface::RecordNotFound(RecordNotFound {})
    }
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

pub struct AccessDenied(pub String);

#[Object]
impl AccessDenied {
    pub async fn description(&self) -> &'static str {
        "Access Denied"
    }

    pub async fn full_error(&self) -> &str {
        &self.0
    }
}

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

pub struct InternalError(pub String);

#[Object]
impl InternalError {
    pub async fn description(&self) -> &'static str {
        "Internal Error"
    }

    pub async fn full_error(&self) -> String {
        format!("Internal Error: {}", self.0)
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
#[graphql(rename_items = "camelCase")]
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
