//! Tiny async client for the toxiproxy admin API plus an owned wrapper around a
//! single proxy. Tests use this to throttle the connection between the test
//! process and the central server so file uploads run slow enough that
//! pause/unpause behaviour at chunk boundaries is observable.
//!
//! Requires an external toxiproxy daemon. Default admin URL `http://localhost:8474`
//! (override with `TOXIPROXY_ADMIN_URL`). Bring it up before running these tests:
//!
//! ```sh
//! docker run --rm -p 8474:8474 -p 22220-22230:22220-22230 ghcr.io/shopify/toxiproxy:2.12.0
//! # or with podman:
//! # podman run --rm -p 8474:8474 -p 22220-22230:22220-22230 ghcr.io/shopify/toxiproxy:2.12.0
//! ```
//!
//! On macOS / Windows the container runs in a Linux VM, so `localhost` inside
//! the container ≠ the host's `localhost`. The proxy `create` call below
//! rewrites the bind to `0.0.0.0` so the port mapping reaches the listener,
//! and rewrites `localhost`/`127.0.0.1` upstreams to `host.docker.internal`
//! (which both Docker Desktop and Podman expose to containers by default).
//!
//! The proxy is not auto-deleted on drop (Drop can't `.await`); each `create`
//! best-effort deletes any stale proxy with the same name first, which is enough
//! to keep concurrent test runs from colliding.

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;

const DEFAULT_ADMIN_URL: &str = "http://localhost:8474";

pub(super) struct ToxiproxyProxy {
    admin_url: String,
    client: Client,
    name: String,
    listen_addr: String,
}

#[derive(Serialize)]
struct CreateProxyRequest<'a> {
    name: &'a str,
    listen: &'a str,
    upstream: &'a str,
    enabled: bool,
}

#[derive(Serialize)]
struct BandwidthToxic<'a> {
    name: &'a str,
    #[serde(rename = "type")]
    toxic_type: &'a str,
    stream: &'a str,
    toxicity: f32,
    attributes: BandwidthAttributes,
}

#[derive(Serialize)]
struct BandwidthAttributes {
    rate: u32, // KB/s
}

#[derive(Deserialize)]
struct ToxicListEntry {
    name: String,
}

impl ToxiproxyProxy {
    /// Create a proxy listening on `listen_addr` and forwarding to `upstream_addr`
    /// (both `host:port`). Best-effort deletes any pre-existing proxy with the
    /// same name first, so re-runs after a crashed test don't fail at creation.
    ///
    /// `listen_addr` and `upstream_addr` are values the test wants from the
    /// **host's** perspective — `127.0.0.1:22220` to listen on, `localhost:2055`
    /// to forward to. Inside the toxiproxy container they need rewriting:
    /// the bind to `0.0.0.0` so the docker/podman port mapping reaches it from
    /// the host; the upstream to `host.docker.internal` so it reaches the host
    /// from inside the container (works on Docker Desktop and Podman).
    pub(super) async fn create(name: &str, listen_addr: &str, upstream_addr: &str) -> Self {
        let admin_url =
            env::var("TOXIPROXY_ADMIN_URL").unwrap_or_else(|_| DEFAULT_ADMIN_URL.to_string());
        let client = Client::new();

        let bind_addr = match listen_addr.strip_prefix("127.0.0.1:") {
            Some(port) => format!("0.0.0.0:{}", port),
            None => listen_addr.to_string(),
        };

        let upstream = match upstream_addr.split_once(':') {
            Some(("localhost", port)) | Some(("127.0.0.1", port)) => {
                format!("host.docker.internal:{}", port)
            }
            _ => upstream_addr.to_string(),
        };

        let _ = client
            .delete(format!("{}/proxies/{}", admin_url, name))
            .send()
            .await;

        client
            .post(format!("{}/proxies", admin_url))
            .json(&CreateProxyRequest {
                name,
                listen: &bind_addr,
                upstream: &upstream,
                enabled: true,
            })
            .send()
            .await
            .expect(
                "toxiproxy admin not reachable — start it with \
                 `docker run --rm -p 8474:8474 -p 22220-22230:22220-22230 ghcr.io/shopify/toxiproxy:2.12.0`",
            )
            .error_for_status()
            .expect("toxiproxy refused to create proxy (check listen/upstream addresses)");

        Self {
            admin_url,
            client,
            name: name.to_string(),
            listen_addr: listen_addr.to_string(),
        }
    }

    /// Cap upstream throughput to `kbps` (kilobytes per second per toxiproxy's
    /// attribute semantics). Existing toxics on the proxy are cleared first so
    /// the cap is deterministic regardless of prior test state.
    pub(super) async fn set_bandwidth_kbps(&self, kbps: u32) {
        self.remove_toxics().await;
        self.client
            .post(format!("{}/proxies/{}/toxics", self.admin_url, self.name))
            .json(&BandwidthToxic {
                name: "bw_up",
                toxic_type: "bandwidth",
                stream: "upstream",
                toxicity: 1.0,
                attributes: BandwidthAttributes { rate: kbps },
            })
            .send()
            .await
            .expect("toxiproxy set_bandwidth_kbps failed")
            .error_for_status()
            .expect("toxiproxy refused to attach bandwidth toxic");
    }

    pub(super) async fn remove_toxics(&self) {
        let toxics: Vec<ToxicListEntry> = self
            .client
            .get(format!("{}/proxies/{}/toxics", self.admin_url, self.name))
            .send()
            .await
            .expect("toxiproxy list toxics failed")
            .json()
            .await
            .expect("toxiproxy returned unparseable toxics list");

        for toxic in toxics {
            let _ = self
                .client
                .delete(format!(
                    "{}/proxies/{}/toxics/{}",
                    self.admin_url, self.name, toxic.name
                ))
                .send()
                .await;
        }
    }

    /// HTTP base URL pointing at the toxiproxy listener — hand this to `SyncApiV6::new`.
    pub(super) fn listen_url(&self) -> String {
        format!("http://{}", self.listen_addr)
    }
}
