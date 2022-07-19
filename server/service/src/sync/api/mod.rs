mod common_records;
mod core;
mod error;
mod get_central_records;
mod get_queued_records;
mod get_site_status;
mod post_acknowledged_records;
mod post_initialise;
mod post_queued_records;

pub(crate) use self::common_records::*;
pub(crate) use self::core::*;
pub(crate) use self::error::*;
pub(crate) use get_central_records::*;
pub(crate) use get_site_status::*;

#[cfg(test)]
fn create_api(url: &str, username: &str, password: &str) -> SyncApiV5 {
    use reqwest::{Client, Url};

    use super::SyncCredentials;

    let url = Url::parse(url).unwrap();
    let credentials = SyncCredentials::from_plain(username, password);
    let client = Client::new();
    SyncApiV5::new(url, credentials, client, "hardware_id")
}
