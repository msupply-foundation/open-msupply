use std::time::Duration;

use reqwest::*;

pub struct WithRetries {
    pub retries: u32,
    pub timeout_seconds: u64,
}

pub async fn with_retries<F>(
    WithRetries {
        retries,
        timeout_seconds,
    }: WithRetries,
    f: F,
) -> Result<Response>
where
    F: FnOnce(Client) -> RequestBuilder,
{
    let mut max_retries = retries;
    let client = Client::builder()
        .connect_timeout(Duration::from_secs(timeout_seconds))
        .build()
        .unwrap();

    let client = f(client);

    let result = loop {
        let result = client.try_clone().unwrap().send().await;

        let (status, is_connect_error) = match result.as_ref() {
            Ok(r) => (Some(r.status().clone()), false),
            Err(e) => (e.status().clone(), e.is_connect()),
        };

        if (is_connect_error || status == Some(StatusCode::REQUEST_TIMEOUT)) && max_retries > 0 {
            max_retries = max_retries - 1;
            continue;
        }

        break result;
    };

    result
}
