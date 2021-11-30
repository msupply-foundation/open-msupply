use async_graphql::*;
use domain::location::DeleteLocation;
use repository::RepositoryError;
use service::location::delete::DeleteLocationError;

use crate::schema::{
    mutations::{error::DatabaseError, DeleteResponse, RecordBelongsToAnotherStore},
    types::{Connector, ErrorWrapper, InvoiceLineNode, RecordNotFound, StockLineNode},
};

#[derive(InputObject)]
pub struct DeleteLocationInput {
    pub id: String,
}

impl From<DeleteLocationInput> for DeleteLocation {
    fn from(DeleteLocationInput { id }: DeleteLocationInput) -> Self {
        DeleteLocation { id }
    }
}

#[derive(Union)]
pub enum DeleteLocationResponse {
    Error(ErrorWrapper<DeleteLocationErrorInterface>),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteLocationErrorInterface {
    LocationNotFound(RecordNotFound),
    RecordBelongsToAnotherStore(RecordBelongsToAnotherStore),
    LocationInUse(LocationInUse),
    DatabaseError(DatabaseError),
}

pub struct LocationInUse {
    stock_lines: Connector<StockLineNode>,
    invoice_lines: Connector<InvoiceLineNode>,
}

#[Object]
impl LocationInUse {
    pub async fn description(&self) -> &'static str {
        "Location in use"
    }

    pub async fn stock_lines(&self) -> &Connector<StockLineNode> {
        &self.stock_lines
    }

    pub async fn invoice_lines(&self) -> &Connector<InvoiceLineNode> {
        &self.invoice_lines
    }
}

impl From<RepositoryError> for ErrorWrapper<DeleteLocationErrorInterface> {
    fn from(error: RepositoryError) -> Self {
        let error = DeleteLocationErrorInterface::DatabaseError(DatabaseError(error));
        ErrorWrapper { error }
    }
}

impl From<DeleteLocationError> for ErrorWrapper<DeleteLocationErrorInterface> {
    fn from(error: DeleteLocationError) -> Self {
        use DeleteLocationErrorInterface as OutError;
        let error = match error {
            DeleteLocationError::LocationDoesNotExist => {
                OutError::LocationNotFound(RecordNotFound {})
            }
            DeleteLocationError::LocationInUse {
                stock_lines,
                invoice_lines,
            } => OutError::LocationInUse(LocationInUse {
                stock_lines: stock_lines.into(),
                invoice_lines: invoice_lines.into(),
            }),
            DeleteLocationError::LocationDoesNotBelongToCurrentStore => {
                OutError::RecordBelongsToAnotherStore(RecordBelongsToAnotherStore {})
            }
            DeleteLocationError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
        };
        ErrorWrapper { error }
    }
}
