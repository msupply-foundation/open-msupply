#[derive(serde::Deserialize, Clone, Debug, PartialEq, Default)]
pub struct SyncSettings {
    pub url: String,
    pub username: String,
    pub password_sha256: String,
    /// sync interval in sec
    pub interval_sec: u64,
    pub central_server_site_id: u32,
    pub site_id: u32,
    pub site_hardware_id: String,
}
