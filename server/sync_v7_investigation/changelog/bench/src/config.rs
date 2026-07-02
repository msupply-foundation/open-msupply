use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
    pub bench_interval: u64,
    pub bench_batch_size: u64,
    pub bench_batch_repeat: u32,
    pub bench_max_size: u64,
    pub output_dir: String,
    /// Maximum wall-clock seconds per scenario. Omit for unlimited.
    pub max_scenario_minutes: Option<u64>,
    #[serde(default)]
    pub pg: PgConfig,
    #[serde(default)]
    pub null_profiles: HashMap<String, NullProfile>,
    pub scenarios: Vec<Scenario>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct PgConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub database: String,
}

impl Default for PgConfig {
    fn default() -> Self {
        Self {
            host: "localhost".to_string(),
            port: 5432,
            user: "postgres".to_string(),
            password: "postgres".to_string(),
            database: "changelog_bench_basic".to_string(),
        }
    }
}

impl PgConfig {
    pub fn connection_string(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            self.user,
            urlencoding::encode(&self.password),
            self.host,
            self.port,
            self.database
        )
    }

    pub fn maintenance_connection_string(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/postgres",
            self.user,
            urlencoding::encode(&self.password),
            self.host,
            self.port,
        )
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct NullProfile {
    pub store_id: f64,
    pub transfer_store_id: f64,
    pub patient_id: f64,
}

impl Default for NullProfile {
    fn default() -> Self {
        Self {
            store_id: 0.5,
            transfer_store_id: 0.5,
            patient_id: 0.5,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Scenario {
    pub name: String,
    #[serde(default)]
    pub indexes: Vec<String>,
    pub null_profile: Option<String>,
    /// If set, partition the changelog table by cursor range with this many rows per partition.
    pub partition_size: Option<u64>,
    /// If true, capture pg_indexes_size for the table after each measurement point.
    #[serde(default)]
    pub capture_index_size: bool,
}

impl Config {
    pub fn load(path: &str) -> Result<Self> {
        let content = fs::read_to_string(path)
            .with_context(|| format!("Failed to read {}", path))?;
        let config: Config = toml::from_str(&content)
            .with_context(|| format!("Failed to parse {}", path))?;
        config.validate()?;
        Ok(config)
    }

    fn validate(&self) -> Result<()> {
        if self.scenarios.is_empty() {
            bail!("no scenarios defined");
        }
        if self.bench_interval == 0 {
            bail!("bench_interval must be > 0");
        }
        if self.bench_batch_size == 0 {
            bail!("bench_batch_size must be > 0");
        }
        if self.bench_batch_repeat == 0 {
            bail!("bench_batch_repeat must be > 0");
        }
        if self.bench_max_size == 0 {
            bail!("bench_max_size must be > 0");
        }
        for s in &self.scenarios {
            if let Some(name) = &s.null_profile {
                if !self.null_profiles.contains_key(name) {
                    bail!(
                        "scenario '{}' references unknown null_profile '{}'",
                        s.name,
                        name
                    );
                }
            }
        }
        Ok(())
    }

    pub fn resolved_profile(&self, scenario: &Scenario) -> NullProfile {
        scenario
            .null_profile
            .as_ref()
            .and_then(|n| self.null_profiles.get(n))
            .cloned()
            .unwrap_or_default()
    }
}
