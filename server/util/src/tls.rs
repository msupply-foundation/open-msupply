use std::sync::Arc;
use std::sync::OnceLock;

use reqwest::Client;
use reqwest::ClientBuilder;
use rustls::crypto::aws_lc_rs;
use rustls::ClientConfig;
use rustls::RootCertStore;

// Bundled Mozilla CA roots, used in place of reqwest's default
// `rustls-platform-verifier`-backed trust store. The platform verifier needs
// per-platform initialisation (a JNI hand-off on Android) before any TLS
// handshake; bundling the roots sidesteps that and keeps trust managed at
// release cadence.
fn shared_client_config() -> &'static ClientConfig {
    static CONFIG: OnceLock<ClientConfig> = OnceLock::new();
    CONFIG.get_or_init(|| {
        let mut root_store = RootCertStore::empty();
        root_store.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());

        ClientConfig::builder_with_provider(Arc::new(aws_lc_rs::default_provider()))
            .with_safe_default_protocol_versions()
            .expect("aws-lc-rs provider supports the safe default protocol versions")
            .with_root_certificates(root_store)
            .with_no_client_auth()
    })
}

pub fn https_client_builder() -> ClientBuilder {
    ClientBuilder::new().use_preconfigured_tls(shared_client_config().clone())
}

pub fn https_client() -> Client {
    https_client_builder()
        .build()
        .expect("Failed to build HTTPS client with bundled root certificates")
}

#[cfg(test)]
mod tests {
    use super::*;

    // Guards against rustls-version drift: if our direct `rustls` workspace
    // dep resolves to a different major version than reqwest's transitive
    // rustls, `use_preconfigured_tls` downcasts to a different `ClientConfig`
    // type and `ClientBuilder::build()` returns `Err("Unknown TLS backend
    // passed to use_preconfigured_tls")` at runtime. Compiling alone won't
    // catch it — this test forces the build path.
    #[test]
    fn https_client_builds() {
        let _ = https_client();
    }

    // Catches a future webpki-roots release shipping an empty/broken set.
    #[test]
    fn bundled_root_store_is_populated() {
        let count = webpki_roots::TLS_SERVER_ROOTS.len();
        assert!(count > 100, "bundled CA root store unexpectedly small: {count}");
    }
}
