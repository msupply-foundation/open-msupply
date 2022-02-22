use async_graphql::*;
use domain::PaginationOption;
use repository::RepositoryError;
use service::SingleRecordError;

// M1 speced API is moved to their own files
// Types defined here are prototype types and should be removed before M1 release to avoid confusion (for consumers and devs)
pub mod name;
pub use self::name::*;

pub mod item;
pub use self::item::*;

pub mod item_stats;
pub use self::item_stats::*;

pub mod requisition;
pub use self::requisition::*;

pub mod requisition_line;
pub use self::requisition_line::*;

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

pub mod store;
pub use self::store::*;

pub mod stocktake;
pub use self::stocktake::*;

pub mod stocktake_line;
pub use self::stocktake_line::*;

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
#[graphql(concrete(name = "NodeError", params(NodeErrorInterface)))]
pub struct ErrorWrapper<T: OutputType> {
    pub error: T,
}

pub type NodeError = ErrorWrapper<NodeErrorInterface>;

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
