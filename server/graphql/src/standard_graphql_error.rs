use async_graphql::ErrorExtensions;
use repository::RepositoryError;
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
