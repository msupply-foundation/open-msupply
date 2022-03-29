#[derive(serde::Deserialize, Clone)]
pub struct SyncSettings {
    pub url: String,
    pub username: String,
    pub password: String,
    pub interval: u64,
    pub central_server_site_id: u32,
    pub site_id: u32,
    pub site_hardware_id: String,
}
