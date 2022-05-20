use std::{io::BufReader, path::PathBuf};

use rustls::ServerConfig;
use service::settings::ServerSettings;

#[derive(Debug)]
pub struct SelfSignedCertFiles {
    pub private_cert_file: String,
    pub public_cert_file: String,
}

const CERTS_PATH: &str = "certs";

pub const PRIVATE_CERT_FILE: &str = "key.pem";
pub const PUBLIC_CERT_FILE: &str = "cert.pem";

pub fn find_self_signed_certs(server_settings: &ServerSettings) -> Option<SelfSignedCertFiles> {
    let cert_dir = PathBuf::new()
        .join(&server_settings.base_dir.clone().unwrap_or(".".to_string()))
        .join(CERTS_PATH);

    let key_file = PathBuf::new().join(&cert_dir).join(PRIVATE_CERT_FILE);
    let cert_file = PathBuf::new().join(&cert_dir).join(PUBLIC_CERT_FILE);
    if !key_file.exists() || !cert_file.exists() {
        return None;
    }
    Some(SelfSignedCertFiles {
        private_cert_file: key_file.to_string_lossy().to_string(),
        public_cert_file: cert_file.to_string_lossy().to_string(),
    })
}

/// Load rustls server config
pub fn load_self_signed_certs_rustls(
    cert_files: SelfSignedCertFiles,
) -> Result<ServerConfig, anyhow::Error> {
    let certfile = std::fs::File::open(&cert_files.public_cert_file)?;
    let mut reader = BufReader::new(certfile);
    let certs = rustls_pemfile::certs(&mut reader)?
        .into_iter()
        .map(rustls::Certificate)
        .collect();

    let private_key = load_private_key_rusttls(&cert_files.private_cert_file)?;

    let config = ServerConfig::builder()
        .with_safe_defaults()
        .with_no_client_auth()
        .with_single_cert(certs, private_key)?;
    Ok(config)
}

/// Helper to load a rustls::PrivateKey
fn load_private_key_rusttls(filename: &str) -> Result<rustls::PrivateKey, anyhow::Error> {
    let keyfile = std::fs::File::open(filename)?;
    let mut reader = BufReader::new(keyfile);

    loop {
        match rustls_pemfile::read_one(&mut reader)? {
            Some(rustls_pemfile::Item::RSAKey(key)) => return Ok(rustls::PrivateKey(key)),
            Some(rustls_pemfile::Item::PKCS8Key(key)) => return Ok(rustls::PrivateKey(key)),
            Some(rustls_pemfile::Item::ECKey(key)) => return Ok(rustls::PrivateKey(key)),
            None => break,
            _ => {}
        }
    }

    Err(anyhow::Error::msg("No private key found"))
}
