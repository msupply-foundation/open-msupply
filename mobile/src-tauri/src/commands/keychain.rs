use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

/// In-memory token store. On mobile this is sufficient for session lifetime;
/// the token is re-fetched on each app launch via saved credentials or refresh.
///
/// For a production hardened version, this could be replaced with platform
/// keychain calls via JNI (Android) / Swift bridge (iOS), but for v1 the
/// token only lives in RAM and is never written to disk unencrypted.
pub struct TokenStore {
    inner: Mutex<Option<StoredCredentials>>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct StoredCredentials {
    pub token: String,
    pub refresh_token: Option<String>,
}

impl TokenStore {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub fn store_token(
    state: State<'_, TokenStore>,
    token: String,
    refresh_token: Option<String>,
) -> Result<(), String> {
    let mut store = state.inner.lock().map_err(|e| e.to_string())?;
    *store = Some(StoredCredentials {
        token,
        refresh_token,
    });
    Ok(())
}

#[tauri::command]
pub fn get_token(state: State<'_, TokenStore>) -> Result<Option<StoredCredentials>, String> {
    let store = state.inner.lock().map_err(|e| e.to_string())?;
    Ok(store.clone())
}

#[tauri::command]
pub fn clear_token(state: State<'_, TokenStore>) -> Result<(), String> {
    let mut store = state.inner.lock().map_err(|e| e.to_string())?;
    *store = None;
    Ok(())
}
