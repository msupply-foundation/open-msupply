use std::time::Duration;

use reqwest::*;

pub struct RetrySeconds(Vec<u64>);

impl Default for RetrySeconds {
    fn default() -> Self {
        Self(vec![
            /* first retry */ 2, /* second retry */ 5, /* third retry */ 10,
        ])
    }
}

pub async fn with_retries<F>(connection_timeouts: RetrySeconds, f: F) -> Result<Response>
where
    F: Fn(Client) -> RequestBuilder,
{
    let mut index = 0;
    loop {
        let client = Client::builder()
            .connect_timeout(Duration::from_secs(connection_timeouts.0[index]))
            // generous because some sync records may have big payloads like reports that take a long time to sync on low bandwidth
            // we also had issues with batch size = 500 taking more then 5 minutes to generate during testing, maybe due to 4d flushing
            .timeout(Duration::from_secs(60 * 30))
            .build()
            .unwrap(); // This method fails if a TLS backend cannot be initialized, or the resolver cannot load the system configuration.

        let result = f(client).send().await;

        let (status, is_connect_error) = match result.as_ref() {
            Ok(r) => (Some(r.status()), false),
            Err(e) => (e.status(), e.is_connect()),
        };

        if (is_connect_error || status == Some(StatusCode::REQUEST_TIMEOUT))
            && (index + 1) < connection_timeouts.0.len()
        {
            index += 1;
            continue;
        }

        break result;
    }
}
