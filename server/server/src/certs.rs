use log::{error, warn};
use rcgen::generate_simple_self_signed;
use rustls::ServerConfig;
use service::settings::{is_develop, ServerSettings};
use std::{
    fmt::Display,
    io::{BufReader, ErrorKind, Write},
    path::PathBuf,
};

#[derive(Debug, Clone)]
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
    let pub_cert_file = std::fs::File::open(cert_files.clone().public_cert_file)?;
    let mut pub_reader = BufReader::new(pub_cert_file);
    let certs = rustls_pemfile::certs(&mut pub_reader)
        .map(|cert| match cert {
            Ok(cert) => cert,
            Err(_) => {
                panic!("Error loading certificate");
            }
        })
        .collect();

    let private_cert_file = std::fs::File::open(cert_files.clone().private_cert_file)?;
    let mut private_reader = BufReader::new(private_cert_file);

    let result = rustls::crypto::ring::default_provider().install_default();
    if let Err(e) = result {
        panic!(
            "Unable to install rustls::crypto::ring default provider: {:#?}",
            e
        );
    }

    let private_key = rustls_pemfile::read_one(&mut private_reader)?
        .map(|key| match key {
            rustls_pemfile::Item::Pkcs1Key(key) => rustls::pki_types::PrivateKeyDer::Pkcs1(key),
            rustls_pemfile::Item::Sec1Key(key) => rustls::pki_types::PrivateKeyDer::Sec1(key),
            rustls_pemfile::Item::Pkcs8Key(key) => rustls::pki_types::PrivateKeyDer::Pkcs8(key),
            _ => {
                panic!("Error loading private key");
            }
        })
        .ok_or_else(|| anyhow::Error::msg("No private key found"))?;

    let config = ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(certs, private_key)?;
    Ok(config)
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
        let private_cert_buffer = cert.key_pair.serialize_pem();
        file.write_all(private_cert_buffer.as_bytes())?;

        let cert_file = cert_dir.join(PUBLIC_CERT_FILE);
        let mut file = std::fs::File::create(&cert_file)?;
        let public_cert_buffer = cert.cert.pem();
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
