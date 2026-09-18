use crate::session_store::SessionStore;
use std::sync::{Arc, RwLock};

#[derive(Debug)]
pub struct AuthData {
    /// In-memory store of active user sessions. Owns expiry and sliding-window logic.
    pub session_store: Arc<RwLock<SessionStore>>,
    /// Suffix appended to cookie names so multiple instances on the same domain (different ports)
    /// don't overwrite each other's cookies. Typically the server port as a string.
    pub cookie_suffix: String,
    /// Indicates if we run in debug mode without ssl certificate
    pub no_ssl: bool,
    /// Disable access control, i.e. no access token is required to do an API request (e.g. for
    /// testing).
    /// However, if a token is provided this token is fully evaluated.
    pub debug_no_access_control: bool,
}
