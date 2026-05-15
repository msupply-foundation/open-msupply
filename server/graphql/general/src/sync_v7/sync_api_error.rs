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
    DatabaseError,
    SyncRecordSerializeError,
    RecordNotFound,
    SyncVersionMismatch,
    NotACentralServer,
    Authentication,
    SiteLockError,
    ConnectionError,
    ParsingError,
    IntegrationTimeoutReached,
    SiteIdNotSet,
    GetCurrentSiteIdError,
    SiteIdMismatch,
    Other,
}

impl SyncErrorV7Node {
    pub fn from_sync_error(error: SyncError) -> Self {
        let variant = match &error {
            SyncError::DatabaseError(_) => SyncErrorVariantV7::DatabaseError,
            SyncError::SyncRecordSerializeError(_) => SyncErrorVariantV7::SyncRecordSerializeError,
            SyncError::RecordNotFound { .. } => SyncErrorVariantV7::RecordNotFound,
            SyncError::SyncVersionMismatch(_, _, _) => SyncErrorVariantV7::SyncVersionMismatch,
            SyncError::NotACentralServer => SyncErrorVariantV7::NotACentralServer,
            SyncError::Authentication => SyncErrorVariantV7::Authentication,
            SyncError::SiteLockError(_) => SyncErrorVariantV7::SiteLockError,
            SyncError::ConnectionError { .. } => SyncErrorVariantV7::ConnectionError,
            SyncError::ParsingError { .. } => SyncErrorVariantV7::ParsingError,
            SyncError::IntegrationTimeoutReached => SyncErrorVariantV7::IntegrationTimeoutReached,
            SyncError::SiteIdNotSet => SyncErrorVariantV7::SiteIdNotSet,
            SyncError::GetCurrentSiteIdError(_) => SyncErrorVariantV7::GetCurrentSiteIdError,
            SyncError::SiteIdMismatch { .. } => SyncErrorVariantV7::SiteIdMismatch,
            SyncError::Other(_) => SyncErrorVariantV7::Other,
        };

        Self {
            variant,
            full_error: format_error(&error),
        }
    }
}
