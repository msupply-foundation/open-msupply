use crate::ContextExt;

use async_graphql::{Context, Error as AsyncGQLError, ErrorExtensions, Result};
use repository::RepositoryError;
use service::{
    permission_validation::{
        ResourceAccessRequest, ValidatedUser, ValidationDeniedKind, ValidationError,
    },
    ListError,
};
use thiserror::Error;

#[derive(Debug, Error, Clone)]
pub enum StandardGraphqlError {
    #[error("Internal error")]
    InternalError(String),

    #[error("Bad user input")]
    BadUserInput(String),

    #[error("Unauthenticated")]
    Unauthenticated(String),

    #[error("Forbidden")]
    Forbidden(String),
}

impl ErrorExtensions for StandardGraphqlError {
    // lets define our base extensions
    fn extend(self) -> async_graphql::Error {
        async_graphql::Error::new(format!("{}", self)).extend_with(|_, e| {
            e.set("code", format!("{:?}", self));
            match self {
                StandardGraphqlError::InternalError(details) => e.set("details", details),
                StandardGraphqlError::BadUserInput(details) => e.set("details", details),
                StandardGraphqlError::Unauthenticated(details) => e.set("details", details),
                StandardGraphqlError::Forbidden(details) => e.set("details", details),
            }
        })
    }
}

impl From<RepositoryError> for StandardGraphqlError {
    fn from(err: RepositoryError) -> Self {
        StandardGraphqlError::InternalError(format!("{:?}", err))
    }
}

/// Validates current user is authenticated and authorized
pub fn validate_auth(
    ctx: &Context<'_>,
    access_request: &ResourceAccessRequest,
) -> Result<ValidatedUser> {
    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;

    let result = service_provider.validation_service.validate(
        &service_ctx,
        ctx.get_auth_data(),
        &ctx.get_auth_token(),
        access_request,
    );
    result.map_err(|err| {
        let graphql_error = match err {
            ValidationError::Denied(kind) => match kind {
                ValidationDeniedKind::NotAuthenticated(_) => {
                    StandardGraphqlError::Unauthenticated(format!("{:?}", kind))
                }
                ValidationDeniedKind::InsufficientPermission(_) => {
                    StandardGraphqlError::Forbidden(format!("{:?}", kind))
                }
            },
            ValidationError::InternalError(err) => StandardGraphqlError::InternalError(err),
        };
        graphql_error.extend()
    })
}

pub fn list_error_to_gql_err(err: ListError) -> AsyncGQLError {
    let gql_err = match err {
        ListError::DatabaseError(err) => err.into(),
        ListError::LimitBelowMin(_) => StandardGraphqlError::BadUserInput(format!("{:?}", err)),
        ListError::LimitAboveMax(_) => StandardGraphqlError::BadUserInput(format!("{:?}", err)),
    };
    gql_err.extend()
}
