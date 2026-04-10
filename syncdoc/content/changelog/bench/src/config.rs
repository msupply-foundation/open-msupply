use anyhow::{bail, Context, Result};
use serde::Deserialize;
use std::collections::HashMap;
use std::path::Path;

/// Null probability profile for the 3 UUID columns.
/// Each value is the probability of NULL (0.0 = always populated, 1.0 = always NULL).
#[derive(Debug, Clone, Deserialize, PartialEq)]
pub struct NullProfile {
    pub store_id: f64,
    pub transfer_store_id: f64,
    pub patient_id: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub batch_size: usize,
    pub output_dir: String,
    pub n_values: Vec<u64>,
    #[serde(default)]
    pub pg: PgConfig,
    pub scenarios: Vec<ScenarioConfig>,
    #[serde(default)]
    pub null_profiles: HashMap<String, NullProfile>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct PgConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    /// Database name used for benchmarks. Will be dropped and recreated between scenarios.
    pub database: String,
}

impl Default for PgConfig {
    fn default() -> Self {
        Self {
            host: "localhost".to_string(),
            port: 5432,
            user: "postgres".to_string(),
            password: "postgres".to_string(),
            database: "changelog_bench".to_string(),
        }
    }
}

impl PgConfig {
    /// Create a PgConfig with localhost defaults for the given database name.
    pub fn localhost(database: &str) -> Self {
        Self {
            database: database.to_string(),
            ..Default::default()
        }
    }

    /// Apply environment variable overrides (PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE).
    pub fn apply_env_overrides(&mut self) {
        if let Ok(v) = std::env::var("PG_HOST") {
            self.host = v;
        }
        if let Ok(v) = std::env::var("PG_PORT") {
            if let Ok(p) = v.parse() {
                self.port = p;
            }
        }
        if let Ok(v) = std::env::var("PG_USER") {
            self.user = v;
        }
        if let Ok(v) = std::env::var("PG_PASSWORD") {
            self.password = v;
        }
        if let Ok(v) = std::env::var("PG_DATABASE") {
            self.database = v;
        }
    }

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

    /// Connection string to the `postgres` maintenance database (for CREATE/DROP DATABASE).
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

#[derive(Debug, Clone, Deserialize, Default)]
pub struct ScenarioConfig {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub phase: u8,
    #[serde(default)]
    pub indexes: IndexSet,
    pub partition: Option<PartitionConfig>,
    /// Optional path to a PG config .txt file (key = value per line).
    /// Settings are applied via ALTER SYSTEM + pg_reload_conf() before the scenario,
    /// and reset via ALTER SYSTEM RESET ALL afterwards.
    pub pg_config_file: Option<String>,
    /// Name of a null_profile defined in [null_profiles]. Required for phase 4.
    pub null_profile: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "strategy")]
pub enum PartitionConfig {
    #[serde(rename = "range")]
    Range { key: String, size: u64 },
    #[serde(rename = "hash")]
    Hash { key: String, count: u32 },
    #[serde(rename = "list")]
    List { key: String },
}

/// Index configuration: either a known preset or a path to a .sql file.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub enum IndexSet {
    #[default]
    PkOnly,
    V7,
    V7AllPartial,
    /// Path to a .sql file containing CREATE INDEX statements (one per line/statement).
    SqlFile(String),
}

impl<'de> serde::Deserialize<'de> for IndexSet {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        match s.as_str() {
            "pk_only" => Ok(IndexSet::PkOnly),
            "v7" => Ok(IndexSet::V7),
            "v7_all_partial" => Ok(IndexSet::V7AllPartial),
            _ if s.ends_with(".sql") => Ok(IndexSet::SqlFile(s)),
            _ => Err(serde::de::Error::custom(format!(
                "Unknown index set '{}'. Use 'pk_only', 'v7', 'v7_all_partial', or a path to a .sql file",
                s
            ))),
        }
    }
}

impl Config {
    pub fn load(path: &str) -> Result<Self> {
        let content =
            std::fs::read_to_string(path).with_context(|| format!("Failed to read {}", path))?;
        let mut config: Config =
            toml::from_str(&content).with_context(|| format!("Failed to parse {}", path))?;
        config.pg.apply_env_overrides();
        config.validate()?;
        Ok(config)
    }

    pub fn validate(&self) -> Result<()> {
        if self.scenarios.is_empty() {
            bail!("No scenarios defined in config");
        }
        if self.n_values.is_empty() {
            bail!("No n_values defined in config");
        }
        // Validate null profiles
        for (name, profile) in &self.null_profiles {
            for (field, val) in [
                ("store_id", profile.store_id),
                ("transfer_store_id", profile.transfer_store_id),
                ("patient_id", profile.patient_id),
            ] {
                if !(0.0..=1.0).contains(&val) {
                    bail!(
                        "Null profile '{}' has invalid {} = {} (must be 0.0–1.0)",
                        name,
                        field,
                        val
                    );
                }
            }
        }

        for scenario in &self.scenarios {
            if scenario.phase < 1 || scenario.phase > 4 {
                bail!(
                    "Scenario '{}' has invalid phase {} (must be 1–4)",
                    scenario.name,
                    scenario.phase
                );
            }
            // Phase 4 requires null_profile, no partitioning
            if scenario.phase == 4 {
                match &scenario.null_profile {
                    None => bail!(
                        "Scenario '{}' is phase 4 but has no null_profile",
                        scenario.name
                    ),
                    Some(ref name) => {
                        if !self.null_profiles.contains_key(name) {
                            bail!(
                                "Scenario '{}' references null_profile '{}' which is not defined in [null_profiles]",
                                scenario.name,
                                name
                            );
                        }
                    }
                }
                if scenario.partition.is_some() {
                    bail!(
                        "Scenario '{}' is phase 4 but has a partition config (not supported)",
                        scenario.name
                    );
                }
            }
            if let Some(ref path) = scenario.pg_config_file {
                if !Path::new(path).exists() {
                    bail!(
                        "Scenario '{}' references pg_config_file '{}' which does not exist",
                        scenario.name,
                        path
                    );
                }
            }
            if let IndexSet::SqlFile(ref path) = scenario.indexes {
                if !Path::new(path).exists() {
                    bail!(
                        "Scenario '{}' references index SQL file '{}' which does not exist",
                        scenario.name,
                        path
                    );
                }
            }
        }
        Ok(())
    }

    pub fn filter_phase(&mut self, phase: u8) {
        self.scenarios.retain(|s| s.phase == phase);
    }

    pub fn filter_scenarios(&mut self, names: &[String]) {
        self.scenarios.retain(|s| names.contains(&s.name));
    }

    pub fn filter_n_values(&mut self, values: &[u64]) {
        self.n_values = self
            .n_values
            .iter()
            .filter(|v| values.contains(v))
            .copied()
            .collect();
    }

    pub fn scenarios_for_phase(&self, phase: u8) -> Vec<&ScenarioConfig> {
        self.scenarios.iter().filter(|s| s.phase == phase).collect()
    }

    /// Get the resolved NullProfile for a scenario, or None for phases 1-3.
    pub fn null_profile_for(&self, scenario: &ScenarioConfig) -> Option<&NullProfile> {
        scenario
            .null_profile
            .as_ref()
            .and_then(|name| self.null_profiles.get(name))
    }

    pub fn phases(&self) -> Vec<u8> {
        let mut phases: Vec<u8> = self.scenarios.iter().map(|s| s.phase).collect();
        phases.sort();
        phases.dedup();
        phases
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_config_toml() -> &'static str {
        r#"
batch_size = 5000
output_dir = "results"
n_values = [1_000_000, 10_000_000]

[[scenarios]]
name = "test_scenario"
phase = 1
indexes = "v7"

[[scenarios]]
name = "test_pk"
phase = 2
indexes = "pk_only"

[[scenarios]]
name = "test_range"
phase = 3
indexes = "v7"
[scenarios.partition]
strategy = "range"
key = "cursor"
size = 1_000_000

[[scenarios]]
name = "test_hash"
phase = 3
indexes = "v7"
[scenarios.partition]
strategy = "hash"
key = "cursor"
count = 16

[[scenarios]]
name = "test_list"
phase = 3
indexes = "v7"
[scenarios.partition]
strategy = "list"
key = "table_name"
"#
    }

    #[test]
    fn test_deserialize_full_config() {
        let config: Config = toml::from_str(sample_config_toml()).unwrap();
        assert_eq!(config.batch_size, 5000);
        // pg defaults applied when [pg] section is omitted
        assert_eq!(config.pg.host, "localhost");
        assert_eq!(config.pg.port, 5432);
        assert_eq!(config.pg.user, "postgres");
        assert_eq!(config.pg.database, "changelog_bench");
        assert_eq!(config.output_dir, "results");
        assert_eq!(config.n_values, vec![1_000_000, 10_000_000]);
        assert_eq!(config.scenarios.len(), 5);
        assert_eq!(config.scenarios[0].name, "test_scenario");
        assert_eq!(config.scenarios[0].phase, 1);
        assert_eq!(config.scenarios[0].indexes, IndexSet::V7);
    }

    #[test]
    fn test_deserialize_minimal_config() {
        let toml_str = r#"
batch_size = 100
output_dir = "out"
n_values = [1000]

[[scenarios]]
name = "minimal"
phase = 1
indexes = "pk_only"
"#;
        let config: Config = toml::from_str(toml_str).unwrap();
        assert_eq!(config.scenarios.len(), 1);
        assert_eq!(config.scenarios[0].indexes, IndexSet::PkOnly);
        assert!(config.scenarios[0].partition.is_none());
    }

    #[test]
    fn test_connection_string() {
        let pg = PgConfig::localhost("changelog_bench");
        assert_eq!(
            pg.connection_string(),
            "postgres://postgres:postgres@localhost:5432/changelog_bench"
        );
    }

    #[test]
    fn test_maintenance_connection_string() {
        let pg = PgConfig {
            host: "localhost".to_string(),
            port: 5432,
            user: "postgres".to_string(),
            password: "s3cret!".to_string(),
            database: "changelog_bench".to_string(),
        };
        assert_eq!(
            pg.maintenance_connection_string(),
            "postgres://postgres:s3cret%21@localhost:5432/postgres"
        );
    }

    #[test]
    fn test_partition_variants_deserialize() {
        let config: Config = toml::from_str(sample_config_toml()).unwrap();

        match &config.scenarios[2].partition {
            Some(PartitionConfig::Range { key, size }) => {
                assert_eq!(key, "cursor");
                assert_eq!(*size, 1_000_000);
            }
            other => panic!("Expected Range partition, got {:?}", other),
        }

        match &config.scenarios[3].partition {
            Some(PartitionConfig::Hash { key, count }) => {
                assert_eq!(key, "cursor");
                assert_eq!(*count, 16);
            }
            other => panic!("Expected Hash partition, got {:?}", other),
        }

        match &config.scenarios[4].partition {
            Some(PartitionConfig::List { key }) => {
                assert_eq!(key, "table_name");
            }
            other => panic!("Expected List partition, got {:?}", other),
        }
    }

    #[test]
    fn test_cli_overrides() {
        let mut config: Config = toml::from_str(sample_config_toml()).unwrap();

        config.filter_phase(3);
        assert_eq!(config.scenarios.len(), 3);
        assert!(config.scenarios.iter().all(|s| s.phase == 3));

        let mut config2: Config = toml::from_str(sample_config_toml()).unwrap();
        config2.filter_scenarios(&["test_scenario".to_string(), "test_pk".to_string()]);
        assert_eq!(config2.scenarios.len(), 2);

        let mut config3: Config = toml::from_str(sample_config_toml()).unwrap();
        config3.filter_n_values(&[1_000_000]);
        assert_eq!(config3.n_values, vec![1_000_000]);
    }

    #[test]
    fn test_phases() {
        let config: Config = toml::from_str(sample_config_toml()).unwrap();
        assert_eq!(config.phases(), vec![1, 2, 3]);
    }

    #[test]
    fn test_scenarios_for_phase() {
        let config: Config = toml::from_str(sample_config_toml()).unwrap();
        let phase3 = config.scenarios_for_phase(3);
        assert_eq!(phase3.len(), 3);
        assert!(phase3.iter().all(|s| s.phase == 3));
    }

    fn phase4_config_toml() -> &'static str {
        r#"
batch_size = 5000
output_dir = "results"
n_values = [1_000_000]

[null_profiles.mostly_null]
store_id = 0.9
transfer_store_id = 0.9
patient_id = 0.9

[null_profiles.balanced]
store_id = 0.5
transfer_store_id = 0.5
patient_id = 0.5

[[scenarios]]
name = "null90_v7"
phase = 4
indexes = "v7"
null_profile = "mostly_null"

[[scenarios]]
name = "null50_v7"
phase = 4
indexes = "v7"
null_profile = "balanced"
"#
    }

    #[test]
    fn test_phase4_config_deserialize() {
        let config: Config = toml::from_str(phase4_config_toml()).unwrap();
        assert_eq!(config.null_profiles.len(), 2);
        assert_eq!(config.scenarios.len(), 2);
        assert_eq!(config.scenarios[0].null_profile, Some("mostly_null".to_string()));
        assert_eq!(config.scenarios[1].null_profile, Some("balanced".to_string()));

        let profile = config.null_profiles.get("mostly_null").unwrap();
        assert_eq!(profile.store_id, 0.9);
        assert_eq!(profile.transfer_store_id, 0.9);
        assert_eq!(profile.patient_id, 0.9);
    }

    #[test]
    fn test_phase4_null_profile_for() {
        let config: Config = toml::from_str(phase4_config_toml()).unwrap();
        let profile = config.null_profile_for(&config.scenarios[0]).unwrap();
        assert_eq!(profile.store_id, 0.9);
        assert!(config.null_profile_for(&config.scenarios[1]).is_some());
    }

    #[test]
    fn test_phase4_missing_profile_fails_validation() {
        let toml_str = r#"
batch_size = 100
output_dir = "out"
n_values = [1000]

[[scenarios]]
name = "bad"
phase = 4
indexes = "v7"
null_profile = "nonexistent"
"#;
        let config: Config = toml::from_str(toml_str).unwrap();
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_phase4_no_profile_fails_validation() {
        let toml_str = r#"
batch_size = 100
output_dir = "out"
n_values = [1000]

[[scenarios]]
name = "bad"
phase = 4
indexes = "v7"
"#;
        let config: Config = toml::from_str(toml_str).unwrap();
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_null_profile_invalid_range() {
        let toml_str = r#"
batch_size = 100
output_dir = "out"
n_values = [1000]

[null_profiles.bad]
store_id = 1.5
transfer_store_id = 0.5
patient_id = 0.5

[[scenarios]]
name = "test"
phase = 4
indexes = "v7"
null_profile = "bad"
"#;
        let config: Config = toml::from_str(toml_str).unwrap();
        assert!(config.validate().is_err());
    }
}
