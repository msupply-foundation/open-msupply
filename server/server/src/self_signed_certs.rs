use std::{
    io::{BufReader, ErrorKind},
    path::PathBuf,
};

use log::{error, warn};
use rustls::ServerConfig;
use service::settings::{is_develop, ServerSettings};

use crate::discovery::Protocol;

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

pub struct Certificates {
    config: Option<ServerConfig>,
}

impl Certificates {
    pub fn load(settings: &ServerSettings) -> std::io::Result<Self> {
        let cert = find_self_signed_certs(settings);

        let config = match cert {
            Some(cert_files) => Some(
                load_self_signed_certs_rustls(cert_files)
                    .expect("Invalid self signed certificates"),
            ),
            None => {
                if !is_develop() && !settings.danger_allow_http {
                    error!("No certificates found");
                    return Err(std::io::Error::new(
                        ErrorKind::Other,
                        "Certificate required",
                    ));
                }

                warn!("No certificates found: Run in HTTP development mode");
                None
            }
        };

        Ok(Certificates { config })
    }

    pub fn config(&self) -> Option<ServerConfig> {
        self.config.clone()
    }

    pub fn is_https(&self) -> bool {
        self.config.is_some()
    }

    pub fn protocol(&self) -> Protocol {
        match self.config {
            Some(_) => Protocol::Https,
            None => Protocol::Http,
        }
    }
}
