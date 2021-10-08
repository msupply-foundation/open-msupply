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

/// Generic Connector
#[derive(SimpleObject)]
#[graphql(concrete(name = "ItemConnector", params(ItemNode)))]
#[graphql(concrete(name = "NameConnector", params(NameNode)))]
#[graphql(concrete(name = "InvoiceConnector", params(InvoiceNode)))]
#[graphql(concrete(name = "InvoiceLineConnector", params(InvoiceLineNode)))]
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
pub struct ErrorWrapper<T: OutputType> {
    error: T,
}

pub type ConnectorError = ErrorWrapper<ConnectorErrorInterface>;
pub type NodeError = ErrorWrapper<NodeErrorInterface>;

// Generic Connector Error Interface
#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum ConnectorErrorInterface {
    DBError(DBError),
    PaginationError(PaginationError),
}

// Generic Node Error Interface
#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum NodeErrorInterface {
    DBError(DBError),
    RecordNotFound(RecordNotFound),
}

/// Convert from ListError (service result) to Generic connector error
impl From<ListError> for ConnectorError {
    fn from(error: ListError) -> Self {
        let error = match error {
            ListError::DBError(error) => ConnectorErrorInterface::DBError(DBError(error)),
            ListError::LimitBelowMin { limit, min } => {
                ConnectorErrorInterface::PaginationError(PaginationError {
                    out_of_range: FirstOutOfRange::Min(min),
                    first: limit,
                })
            }
            ListError::LimitAboveMax { limit, max } => {
                ConnectorErrorInterface::PaginationError(PaginationError {
                    out_of_range: FirstOutOfRange::Max(max),
                    first: limit,
                })
            }
        };

        ErrorWrapper { error }
    }
}

/// Convert from SingleRecordError (service result) to Generic single node error
impl From<SingleRecordError> for NodeError {
    fn from(error: SingleRecordError) -> Self {
        let error = match error {
            SingleRecordError::DBError(error) => NodeErrorInterface::DBError(DBError(error)),
            SingleRecordError::NotFound(id) => {
                NodeErrorInterface::RecordNotFound(RecordNotFound(id))
            }
        };

        ErrorWrapper { error }
    }
}

/// Convert from RepositoryError (loader result) to Generic connector error
impl From<RepositoryError> for ConnectorError {
    fn from(error: RepositoryError) -> Self {
        ErrorWrapper {
            error: ConnectorErrorInterface::DBError(DBError(error)),
        }
    }
}

/// Convert from RepositoryError (loader result) to Generic single node error
impl From<RepositoryError> for NodeError {
    fn from(error: RepositoryError) -> Self {
        ErrorWrapper {
            error: NodeErrorInterface::DBError(DBError(error)),
        }
    }
}

// Generic Errors
pub struct DBError(pub RepositoryError);

#[Object]
impl DBError {
    pub async fn description(&self) -> &'static str {
        "Dabase Error"
    }

    pub async fn full_error(&self) -> String {
        format!("{:#}", self.0)
    }
}

pub struct RecordNotFound(pub String);

#[Object]
impl RecordNotFound {
    pub async fn description(&self) -> &'static str {
        "Record with id not found"
    }

    pub async fn id(&self) -> &str {
        &self.0
    }
}

pub enum FirstOutOfRange {
    Max(u32),
    Min(u32),
}

pub struct PaginationError {
    out_of_range: FirstOutOfRange,
    first: u32,
}

#[Object]
impl PaginationError {
    pub async fn description(&self) -> &'static str {
        match &self.out_of_range {
            FirstOutOfRange::Max(_) => "First is too big",
            FirstOutOfRange::Min(_) => "First is too low",
        }
    }

    pub async fn max(&self) -> Option<u32> {
        match &self.out_of_range {
            FirstOutOfRange::Max(max) => Some(max.clone()),
            _ => None,
        }
    }

    pub async fn min(&self) -> Option<u32> {
        match &self.out_of_range {
            FirstOutOfRange::Min(min) => Some(min.clone()),
            _ => None,
        }
    }

    pub async fn first(&self) -> u32 {
        self.first
    }
}
