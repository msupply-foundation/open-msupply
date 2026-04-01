use anyhow::Result;
use serde::Deserialize;
use std::path::Path;

#[derive(Deserialize, Clone, Debug)]
pub struct TestConfig {
    pub store_id: String,
    pub arguments: serde_json::Value,
}

/// Load test-config.json from the standard_reports directory.
pub fn load_test_config(standard_reports_dir: &Path) -> Result<TestConfig> {
    let config_path = standard_reports_dir.join("test-config.json");
    let content = std::fs::read_to_string(&config_path).map_err(|e| {
        anyhow::anyhow!(
            "Failed to read {}: {}. Copy test-config.example.json to test-config.json and configure it.",
            config_path.display(),
            e
        )
    })?;
    let config: TestConfig = serde_json::from_str(&content)?;
    Ok(config)
}
