use async_graphql::*;
use domain::location::DeleteLocation;
use repository::RepositoryError;
use service::location::delete::{
    DeleteLocationError as InError, LocationInUse as ServiceLocationInUse,
};

use crate::{
    schema::{
        mutations::{DeleteResponse, RecordBelongsToAnotherStore},
        types::{Connector, DatabaseError, InvoiceLineNode, RecordNotFound, StockLineNode},
    },
    ContextExt,
};

pub fn delete_location(ctx: &Context<'_>, input: DeleteLocationInput) -> DeleteLocationResponse {
    let service_provider = ctx.service_provider();
    let service_context = match service_provider.context() {
        Ok(service) => service,
        Err(error) => return DeleteLocationResponse::Error(error.into()),
    };

    match service_provider
        .location_service
        .delete_location(&service_context, input.into())
    {
        Ok(location_id) => DeleteLocationResponse::Response(DeleteResponse(location_id)),
        Err(error) => DeleteLocationResponse::Error(error.into()),
    }
}

#[derive(InputObject)]
pub struct DeleteLocationInput {
    pub id: String,
}

impl From<DeleteLocationInput> for DeleteLocation {
    fn from(DeleteLocationInput { id }: DeleteLocationInput) -> Self {
        DeleteLocation { id }
    }
}

#[derive(SimpleObject)]
pub struct DeleteLocationError {
    pub error: DeleteLocationErrorInterface,
}

#[derive(Union)]
pub enum DeleteLocationResponse {
    Error(DeleteLocationError),
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

impl From<RepositoryError> for DeleteLocationError {
    fn from(error: RepositoryError) -> Self {
        let error = DeleteLocationErrorInterface::DatabaseError(DatabaseError(error));
        DeleteLocationError { error }
    }
}

impl From<InError> for DeleteLocationError {
    fn from(error: InError) -> Self {
        use DeleteLocationErrorInterface as OutError;
        let error = match error {
            InError::LocationDoesNotExist => OutError::LocationNotFound(RecordNotFound {}),
            InError::LocationInUse(ServiceLocationInUse {
                stock_lines,
                invoice_lines,
            }) => OutError::LocationInUse(LocationInUse {
                stock_lines: stock_lines.into(),
                invoice_lines: invoice_lines.into(),
            }),
            InError::LocationDoesNotBelongToCurrentStore => {
                OutError::RecordBelongsToAnotherStore(RecordBelongsToAnotherStore {})
            }
            InError::DatabaseError(error) => OutError::DatabaseError(DatabaseError(error)),
        };
        DeleteLocationError { error }
    }
}
