use repository::SyncApiErrorCode;

pub mod logger;
pub mod status;

#[cfg(test)]
mod test;

/// SyncError is captured in database as a full error stringified error in `message`
/// and a mapped `code` as SyncApiErrorCode. Only errors relevant to user are captured
/// as a mapped type
#[derive(Debug, Clone, Default, PartialEq)]
pub struct SyncLogError {
    pub message: String,
    pub code: Option<SyncApiErrorCode>,
}
