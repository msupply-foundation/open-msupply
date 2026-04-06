use anyhow::Result;
use serde::Deserialize;
use std::collections::HashMap;
use std::path::Path;

#[derive(Deserialize, Clone, Debug)]
pub struct Config {
    pub defaults: Defaults,
    #[serde(default)]
    pub reports: HashMap<String, ReportOverride>,
}

#[derive(Deserialize, Clone, Debug)]
pub struct Defaults {
    pub image_tag: Option<String>,
    pub database: Option<String>,
    pub store_id: String,
    #[serde(default = "default_username")]
    pub username: String,
    #[serde(default = "default_password")]
    pub password: String,
    #[serde(default = "default_port_start")]
    pub port_start: i32,
    #[serde(default)]
    pub skip_build: bool,
    #[serde(default = "default_output")]
    pub output: String,
    #[serde(default = "default_workers")]
    pub workers: usize,
}

#[derive(Deserialize, Clone, Debug, Default)]
pub struct ReportOverride {
    pub database: Option<String>,
    pub skip: Option<String>,
}

fn default_username() -> String {
    "admin".to_string()
}
fn default_password() -> String {
    "pass".to_string()
}
fn default_port_start() -> i32 {
    9100
}
fn default_output() -> String {
    "temp/test-report.md".to_string()
}
fn default_workers() -> usize {
    8
}

/// Resolved config for a single report test.
#[derive(Clone, Debug)]
pub struct ResolvedReportConfig {
    pub database: String,
    pub store_id: String,
    pub username: String,
    pub password: String,
    pub skip: Option<String>,
}

impl Config {
    pub fn resolve_for_report(&self, code: &str) -> ResolvedReportConfig {
        let overrides = self.reports.get(code);

        let database = overrides
            .and_then(|o| o.database.clone())
            .or_else(|| self.defaults.database.clone())
            .unwrap_or_else(|| "omsupply-database.sqlite".to_string());

        let skip = overrides.and_then(|o| o.skip.clone());

        ResolvedReportConfig {
            database,
            store_id: self.defaults.store_id.clone(),
            username: self.defaults.username.clone(),
            password: self.defaults.password.clone(),
            skip,
        }
    }
}

/// Load the report's test-config.json, merge in environment-specific fields,
/// and return the merged JSON ready to write into the container.
pub fn build_show_report_config(
    standard_reports_dir: &Path,
    code: &str,
    resolved: &ResolvedReportConfig,
) -> Result<serde_json::Value> {
    // Read the report's own test-config.json for arguments
    let report_config_path = standard_reports_dir.join(code).join("test-config.json");

    let mut config: serde_json::Value = if report_config_path.exists() {
        let content = std::fs::read_to_string(&report_config_path)?;
        serde_json::from_str(&content)?
    } else {
        // No per-report config — use minimal defaults
        serde_json::json!({})
    };

    // Fill in environment-specific defaults from config.toml
    // Per-report test-config.json values take precedence
    let obj = config.as_object_mut().unwrap();
    obj.entry("store_id")
        .or_insert(serde_json::json!(resolved.store_id));
    obj.entry("url")
        .or_insert(serde_json::json!("http://localhost:8000"));
    obj.entry("username")
        .or_insert(serde_json::json!(resolved.username));
    obj.entry("password")
        .or_insert(serde_json::json!(resolved.password));
    obj.entry("output_filename")
        .or_insert(serde_json::json!(code));
    obj.entry("data_id")
        .or_insert(serde_json::json!(""));
    obj.entry("arguments")
        .or_insert(serde_json::json!({}));

    Ok(config)
}

pub fn load_config(path: &Path) -> Result<Config> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| anyhow::anyhow!("Failed to read {}: {}", path.display(), e))?;
    let config: Config = toml::from_str(&content)?;
    Ok(config)
}
