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
            .build()
            .unwrap();

        let result = f(client).send().await;

        let (status, is_connect_error) = match result.as_ref() {
            Ok(r) => (Some(r.status().clone()), false),
            Err(e) => (e.status().clone(), e.is_connect()),
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
