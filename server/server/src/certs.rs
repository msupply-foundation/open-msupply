use log::{error, warn};
use rcgen::generate_simple_self_signed;
use rustls::ServerConfig;
use service::settings::{is_develop, ServerSettings};
use std::{
    fmt::Display,
    io::{BufReader, ErrorKind, Write},
    path::PathBuf,
};

#[derive(Debug)]
pub struct CertFiles {
    pub private_cert_file: String,
    pub public_cert_file: String,
}

const CERTS_PATH: &str = "certs";

pub const PRIVATE_CERT_FILE: &str = "key.pem";
pub const PUBLIC_CERT_FILE: &str = "cert.pem";

pub fn find_certs(server_settings: &ServerSettings) -> Option<CertFiles> {
    let cert_dir = PathBuf::new()
        .join(server_settings.base_dir.clone().unwrap_or(".".to_string()))
        .join(CERTS_PATH);

    let key_file = PathBuf::new().join(&cert_dir).join(PRIVATE_CERT_FILE);
    let cert_file = PathBuf::new().join(&cert_dir).join(PUBLIC_CERT_FILE);
    if !key_file.exists() || !cert_file.exists() {
        return None;
    }
    Some(CertFiles {
        private_cert_file: key_file.to_string_lossy().to_string(),
        public_cert_file: cert_file.to_string_lossy().to_string(),
    })
}

/// Load rustls server config
pub fn load_certs_rustls(cert_files: CertFiles) -> Result<ServerConfig, anyhow::Error> {
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
    ///Try to load ssl certificate, in production mode certificates are required unless danger_allow_http is set in the config
    pub fn try_load(settings: &ServerSettings) -> std::io::Result<Self> {
        let cert = find_certs(settings);

        let config = match cert {
            Some(cert_files) => {
                Some(load_certs_rustls(cert_files).expect("Invalid self signed certificates"))
            }
            None => {
                if is_develop() || settings.danger_allow_http {
                    warn!("No certificates found: Run in HTTP development mode");
                    None
                } else {
                    warn!("No certificates found: Generating self signed certificates");
                    let base_dir = &settings.base_dir.clone().unwrap_or(".".to_string());
                    let cert_path = PathBuf::from(base_dir).join(CERTS_PATH);
                    let cert_files = match Self::generate_certs(&cert_path) {
                        Ok(cert_files) => cert_files,
                        Err(e) => {
                            warn!("Error generating self signed certificates: {}", e);
                            error!("No certificates found");
                            return Err(std::io::Error::new(
                                ErrorKind::Other,
                                "Certificate required",
                            ));
                        }
                    };
                    Some(load_certs_rustls(cert_files).expect("Invalid self signed certificates"))
                }
            }
        };

        Ok(Certificates { config })
    }

    fn generate_certs(cert_dir: &PathBuf) -> Result<CertFiles, anyhow::Error> {
        let subject_alt_names = vec!["localhost".to_string()];
        let cert = generate_simple_self_signed(subject_alt_names)?;
        std::fs::create_dir_all(cert_dir)?;

        let key_file = cert_dir.join(PRIVATE_CERT_FILE);
        let mut file = std::fs::File::create(&key_file)?;
        file.write_all(cert.cert.pem().as_bytes())?;

        let cert_file = cert_dir.join(PUBLIC_CERT_FILE);
        let mut file = std::fs::File::create(&cert_file)?;
        let public_cert_buffer = cert.cert.pems();
        file.write_all(public_cert_buffer.as_bytes())?;

        Ok(CertFiles {
            private_cert_file: key_file.to_string_lossy().to_string(),
            public_cert_file: cert_file.to_string_lossy().to_string(),
        })
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

#[derive(Clone)]
pub enum Protocol {
    Http,
    Https,
}

impl Display for Protocol {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            match self {
                Protocol::Http => "http",
                Protocol::Https => "https",
            }
        )
    }
}
