use async_graphql::*;
use repository::syncv7::SyncError;
use util::format_error;

#[derive(SimpleObject)]
pub struct SyncErrorV7Node {
    pub variant: SyncErrorVariantV7,
    pub full_error: String,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "SCREAMING_SNAKE_CASE")]
pub enum SyncErrorVariantV7 {
    ConnectionError,
    IncorrectPassword,
    ApiVersionIncompatible,
    IntegrationTimeoutReached,
    Unknown,
}

impl SyncErrorV7Node {
    pub fn from_sync_error(error: SyncError) -> Self {
        let full_error = format_error(&error);

        use SyncError as from;
        use SyncErrorVariantV7 as to;

        let variant = match error {
            from::SyncVersionMismatch(_, _, _) => to::ApiVersionIncompatible,
            from::Authentication => to::IncorrectPassword,
            from::ConnectionError { .. } => to::ConnectionError,
            from::IntegrationTimeoutReached => to::IntegrationTimeoutReached,
            from::DatabaseError(_)
            | from::SyncRecordSerializeError(_)
            | from::RecordNotFound { .. }
            | from::NotACentralServer
            | from::SiteLockError(_)
            | from::ParsingError { .. }
            | from::SiteIdNotSet
            | from::GetCurrentSiteIdError(_)
            | from::SiteIdMismatch { .. }
            | from::Other(_) => to::Unknown,
        };

        SyncErrorV7Node {
            variant,
            full_error,
        }
    }
}
