use std::collections::HashMap;
use std::convert::TryFrom;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::time::SystemTime;

use pem::Pem;
use rsa::pkcs8::{DecodePrivateKey, DecodePublicKey};
use rsa::pss::{Signature, SigningKey, VerifyingKey};
use rsa::sha2::Sha256;
use rsa::signature::{RandomizedSigner, SignatureEncoding, Verifier};
use rsa::{RsaPrivateKey, RsaPublicKey};

use walkdir::WalkDir;
use x509_parser::prelude::{FromDer, X509Certificate};

use super::manifest::{create_manifest, Manifest, ManifestSignatureInfo};
use super::{
    CERTIFICATE_TAG, MANIFEST_FILE, MANIFEST_SIGNATURE_FILE, PLUGIN_CERT_DIR, PLUGIN_FILE_DIR,
    PRIVATE_KEY_TAG, SHA256_NAME, SIGNATURE_TAG, VERIFICATION_ALGO_PSS,
};

#[derive(Clone)]
pub struct ValidatedPlugin {
    /// Modification date of the manifest file, e.g. to check if plugin has been modified and needs
    /// to be validated again.
    pub manifest_datetime: SystemTime,
    pub manifest: Manifest,
}

#[derive(Clone)]
pub struct ValidatedPluginBucket {
    /// plugin base directory
    plugin_dir: PathBuf,
    /// Dir containing all trusted public plugin certs
    trusted_cert_path: PathBuf,
    /// Mapping the absolute plugin to a ValidatedPlugin
    manifests: HashMap<String, ValidatedPlugin>,
}

impl ValidatedPluginBucket {
    pub fn new(base_dir: &Option<String>) -> anyhow::Result<Self> {
        let plugin_dir = match base_dir {
            Some(base_dir) => PathBuf::from_str(base_dir)?.join(PLUGIN_FILE_DIR),
            None => PathBuf::from_str(PLUGIN_FILE_DIR)?,
        };
        let trusted_cert_path = match base_dir {
            Some(base_dir) => PathBuf::from_str(base_dir)?.join(PLUGIN_CERT_DIR),
            None => PathBuf::from_str(PLUGIN_CERT_DIR)?,
        };

        Ok(ValidatedPluginBucket {
            plugin_dir,
            trusted_cert_path,
            manifests: HashMap::new(),
        })
    }

    pub fn validate_plugin(&mut self, path: &PathBuf) -> anyhow::Result<ValidatedPlugin> {
        let path = path.canonicalize()?;
        let path_string = path.as_os_str().to_string_lossy().to_string();
        if let Some(plugin) = self.manifests.get(&path_string) {
            let metadata = File::open(path.join(MANIFEST_FILE))?.metadata()?;
            if metadata.modified()? == plugin.manifest_datetime {
                return Ok(plugin.clone());
            }
        };
        self.reload()?;
        if let Some(plugin) = self.manifests.get(&path_string) {
            return Ok(plugin.clone());
        }
        Err(anyhow::Error::msg(format!(
            "Failed to validate plugin: {:?}",
            path
        )))
    }

    fn reload(&mut self) -> anyhow::Result<()> {
        let certs = load_trusted_certs_from_dir(&self.trusted_cert_path)?;

        self.manifests.clear();
        let walker = WalkDir::new(&self.plugin_dir).max_depth(1);
        for entry in walker {
            let entry = entry?;

            let manifest_path = entry.path().join(MANIFEST_FILE);
            if !manifest_path.exists() {
                continue;
            }
            // Be conservative and record the manifest timestamp before validating the plugin.
            // For example, when the plugin changes while validating it, the older timestamp will
            // trigger a reload when fetching a plugin (in validate_plugin()).
            let metadata = File::open(&manifest_path)?.metadata()?;
            let manifest_datetime = metadata.modified()?;

            let manifest = match verify_plugin_manifest(entry.path(), &certs) {
                Ok(manifest) => manifest,
                Err(err) => {
                    log::error!("Can't verify plugin: {:?} ({})", entry.path(), err);
                    continue;
                }
            };
            self.manifests.insert(
                entry
                    .path()
                    .canonicalize()?
                    .as_os_str()
                    .to_string_lossy()
                    .to_string(),
                ValidatedPlugin {
                    manifest,
                    manifest_datetime,
                },
            );
        }
        Ok(())
    }
}

/// Works with RSA keys generated like:
/// `openssl req -x509 -newkey rsa:2048 -keyout private.pem -out certificate.pem -nodes`
pub fn sign_plugin(
    plugin_path: &str,
    key_path: &str,
    public_cert_path: &str,
) -> anyhow::Result<()> {
    let plugin_path = Path::new(plugin_path);
    // public cert
    let cert_data = fs::read_to_string(public_cert_path)?;
    let pem = pem::parse(&cert_data)?;
    if pem.tag() != CERTIFICATE_TAG {
        return Err(anyhow::Error::msg("Not a certificate"));
    }
    // private key
    let key_data = fs::read_to_string(key_path)?;
    let pem = pem::parse(key_data)?;
    if pem.tag() != PRIVATE_KEY_TAG {
        return Err(anyhow::Error::msg("Not a private key"));
    }
    let private_key = RsaPrivateKey::read_pkcs8_pem_file(key_path)?;

    // Create manifest
    let manifest = create_manifest(
        plugin_path,
        ManifestSignatureInfo {
            cert: cert_data,
            algo: VERIFICATION_ALGO_PSS.to_string(),
            hash: SHA256_NAME.to_string(),
        },
    )?;
    // Write manifest
    let out_path = PathBuf::from(plugin_path).join(MANIFEST_FILE);
    let mut out_file = File::create(out_path)?;
    out_file.write_all(manifest.as_bytes())?;

    // Sign
    let mut rng = rand::thread_rng();
    let signing_key = SigningKey::<Sha256>::new(private_key);

    let signature = signing_key.sign_with_rng(&mut rng, manifest.as_bytes());
    // Write signature
    let signature_pem = pem::encode(&Pem::new(SIGNATURE_TAG, signature.to_bytes()));
    let out_path = PathBuf::from(plugin_path).join(MANIFEST_SIGNATURE_FILE);
    let mut out_file = File::create(out_path)?;
    out_file.write_all(signature_pem.as_bytes())?;

    // Double check that we can verify the plugin (not strictly needed)
    let trusted_certs =
        load_trusted_certs_from_dir(PathBuf::from(public_cert_path).parent().unwrap())?;
    verify_plugin_manifest(plugin_path, &trusted_certs)?;
    Ok(())
}

fn load_trusted_certs_from_dir(cert_path: &Path) -> anyhow::Result<Vec<Pem>> {
    let walker = WalkDir::new(cert_path);
    let mut out = Vec::<Pem>::new();
    for entry in walker {
        let entry = entry?;
        let metadata = entry.metadata()?;
        if metadata.is_dir() {
            continue;
        }
        let cert_data = match fs::read_to_string(entry.path()) {
            Ok(cert_data) => cert_data,
            Err(err) => {
                log::info!("Can't read certificate file: {:?} ({})", entry.path(), err);
                continue;
            }
        };
        let pem = match pem::parse(cert_data) {
            Ok(pem) => pem,
            Err(err) => {
                log::info!("Not a PEM file: {:?} ({})", entry.path(), err);
                continue;
            }
        };
        if pem.tag() != CERTIFICATE_TAG {
            log::info!("PEM file doesn't contain a certificate: {:?}", entry.path());
            continue;
        }

        out.push(pem);
    }
    Ok(out)
}

fn verify_manifest_certificate(
    manifest_cert: &X509Certificate,
    trusted_certs: &Vec<Pem>,
) -> anyhow::Result<bool> {
    for trusted_cert in trusted_certs {
        let trusted_certificate = X509Certificate::from_der(trusted_cert.contents())?;
        let public_key = trusted_certificate.1.public_key();
        match manifest_cert.verify_signature(Some(public_key)) {
            Ok(_) => return Ok(true),
            Err(_) => continue,
        }
    }
    Ok(false)
}

fn verify_plugin_manifest(
    plugin_path: &Path,
    trusted_certs: &Vec<Pem>,
) -> anyhow::Result<Manifest> {
    let manifest_raw = fs::read_to_string(PathBuf::from(plugin_path).join(MANIFEST_FILE))?;
    let manifest: Manifest = serde_json::from_str(&manifest_raw)?;

    let pem = pem::parse(&manifest.signature.cert)?;
    if pem.tag() != CERTIFICATE_TAG {
        return Err(anyhow::Error::msg("Not a certificate"));
    }
    let manifest_cert = X509Certificate::from_der(pem.contents())?.1;
    if !verify_manifest_certificate(&manifest_cert, trusted_certs)? {
        return Err(anyhow::Error::msg("Plugin certificate is not trusted"));
    }

    // Load the manifest signature
    let manifest_signature =
        fs::read_to_string(PathBuf::from(plugin_path).join(MANIFEST_SIGNATURE_FILE))?;
    let manifest_signature = pem::parse(manifest_signature)?;
    if manifest_signature.tag() != SIGNATURE_TAG {
        return Err(anyhow::Error::msg("Not a signature"));
    }

    // Verify
    // Manifest cert is now trusted. Use the manifest cert's public key to validate the manifest
    let public_key = manifest_cert.public_key();
    match public_key.parsed()? {
        x509_parser::public_key::PublicKey::RSA(_) => {
            verify_rsa_signature(
                public_key.raw,
                &manifest.signature,
                manifest_raw.as_bytes(),
                &manifest_signature,
            )?;
        }
        _ => return Err(anyhow::Error::msg("Unsupported signing key type")),
    };
    Ok(manifest)
}

fn verify_rsa_signature(
    key: &[u8],
    signature_info: &ManifestSignatureInfo,
    manifest: &[u8],
    signature: &Pem,
) -> anyhow::Result<bool> {
    match signature_info.hash.as_str() {
        SHA256_NAME => {}
        _ => return Err(anyhow::Error::msg("Unsupported hash")),
    };
    match signature_info.algo.as_str() {
        VERIFICATION_ALGO_PSS => {}
        _ => return Err(anyhow::Error::msg("Unsupported signing algo")),
    };

    let public_key = RsaPublicKey::from_public_key_der(key)?;

    let signature = Signature::try_from(signature.contents())?;
    Ok(
        match VerifyingKey::<Sha256>::new(public_key).verify(manifest, &signature) {
            Ok(_) => true,
            Err(err) => {
                log::warn!("Failed to validate plugin: {}", err);
                false
            }
        },
    )
}
