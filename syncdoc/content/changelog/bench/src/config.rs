use anyhow::{bail, Context, Result};
use serde::Deserialize;
use std::path::Path;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub batch_size: usize,
    pub port: u16,
    pub pg_image: String,
    pub output_dir: String,
    #[serde(default = "default_seed_dir")]
    pub seed_dir: String,
    pub n_values: Vec<u64>,
    pub scenarios: Vec<ScenarioConfig>,
}

fn default_seed_dir() -> String {
    "seeds".to_string()
}

#[derive(Debug, Clone, Deserialize)]
pub struct ScenarioConfig {
    pub name: String,
    pub phase: u8,
    pub pg_config_file: String,
    pub indexes: IndexSet,
    pub partition: Option<PartitionConfig>,
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IndexSet {
    PkOnly,
    V7,
}

impl Config {
    pub fn load(path: &str) -> Result<Self> {
        let content =
            std::fs::read_to_string(path).with_context(|| format!("Failed to read {}", path))?;
        let config: Config =
            toml::from_str(&content).with_context(|| format!("Failed to parse {}", path))?;
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
        for scenario in &self.scenarios {
            if scenario.phase < 1 || scenario.phase > 3 {
                bail!(
                    "Scenario '{}' has invalid phase {} (must be 1, 2, or 3)",
                    scenario.name,
                    scenario.phase
                );
            }
            if !Path::new(&scenario.pg_config_file).exists() {
                bail!(
                    "Scenario '{}' references pg_config_file '{}' which does not exist",
                    scenario.name,
                    scenario.pg_config_file
                );
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
port = 15432
pg_image = "postgres:17"
output_dir = "results"
n_values = [1_000_000, 10_000_000]

[[scenarios]]
name = "test_scenario"
phase = 1
pg_config_file = "pg-configs/default.txt"
indexes = "v7"

[[scenarios]]
name = "test_pk"
phase = 2
pg_config_file = "pg-configs/moderate.txt"
indexes = "pk_only"

[[scenarios]]
name = "test_range"
phase = 3
pg_config_file = "pg-configs/moderate.txt"
indexes = "v7"
[scenarios.partition]
strategy = "range"
key = "cursor"
size = 1_000_000

[[scenarios]]
name = "test_hash"
phase = 3
pg_config_file = "pg-configs/moderate.txt"
indexes = "v7"
[scenarios.partition]
strategy = "hash"
key = "cursor"
count = 16

[[scenarios]]
name = "test_list"
phase = 3
pg_config_file = "pg-configs/moderate.txt"
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
        assert_eq!(config.port, 15432);
        assert_eq!(config.pg_image, "postgres:17");
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
port = 5432
pg_image = "postgres:16"
output_dir = "out"
n_values = [1000]

[[scenarios]]
name = "minimal"
phase = 1
pg_config_file = "pg-configs/default.txt"
indexes = "pk_only"
"#;
        let config: Config = toml::from_str(toml_str).unwrap();
        assert_eq!(config.scenarios.len(), 1);
        assert_eq!(config.scenarios[0].indexes, IndexSet::PkOnly);
        assert!(config.scenarios[0].partition.is_none());
    }

    #[test]
    fn test_invalid_pg_config_file() {
        let toml_str = r#"
batch_size = 100
port = 5432
pg_image = "postgres:16"
output_dir = "out"
n_values = [1000]

[[scenarios]]
name = "bad"
phase = 1
pg_config_file = "nonexistent/path.txt"
indexes = "pk_only"
"#;
        let config: Config = toml::from_str(toml_str).unwrap();
        let result = config.validate();
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("does not exist"));
    }

    #[test]
    fn test_partition_variants_deserialize() {
        let config: Config = toml::from_str(sample_config_toml()).unwrap();

        // Range
        match &config.scenarios[2].partition {
            Some(PartitionConfig::Range { key, size }) => {
                assert_eq!(key, "cursor");
                assert_eq!(*size, 1_000_000);
            }
            other => panic!("Expected Range partition, got {:?}", other),
        }

        // Hash
        match &config.scenarios[3].partition {
            Some(PartitionConfig::Hash { key, count }) => {
                assert_eq!(key, "cursor");
                assert_eq!(*count, 16);
            }
            other => panic!("Expected Hash partition, got {:?}", other),
        }

        // List
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

        // Filter by phase
        config.filter_phase(3);
        assert_eq!(config.scenarios.len(), 3);
        assert!(config.scenarios.iter().all(|s| s.phase == 3));

        // Filter by scenario names
        let mut config2: Config = toml::from_str(sample_config_toml()).unwrap();
        config2.filter_scenarios(&["test_scenario".to_string(), "test_pk".to_string()]);
        assert_eq!(config2.scenarios.len(), 2);

        // Filter by n_values
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
}
