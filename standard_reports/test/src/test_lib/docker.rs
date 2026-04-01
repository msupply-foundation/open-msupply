use anyhow::Result;
use std::{path::PathBuf, process::Command};

#[derive(Default, Clone)]
pub struct Container {
    pub image: String,
    pub mounts: Vec<String>,
    pub ports: Vec<String>,
    pub platform: Option<String>,
    pub name: Option<String>,
}

impl Container {
    pub fn new(image_name: &str, image_tag: &str) -> Self {
        Self {
            image: format!("{}:{}", image_name, image_tag),
            ..Default::default()
        }
    }

    pub fn platform(&mut self, platform: &str) -> &mut Self {
        self.platform = Some(platform.to_string());
        self
    }

    pub fn add_mount(&mut self, host: &PathBuf, container: &str) -> &mut Self {
        self.mounts
            .push(format!("{}:{}", host.display(), container));
        self
    }

    pub fn add_port(&mut self, host: i32, container: i32) -> &mut Self {
        self.ports.push(format!("{}:{}", host, container));
        self
    }

    pub fn name(&mut self, name: &str) -> &mut Self {
        self.name = Some(name.to_string());
        self
    }

    pub async fn run_detached(&self, extra_params: &[&str], commands: &[&str]) -> Result<()> {
        log::info!("Starting Docker container: {}", self.image);

        let mut args = vec![
            "run",
            "--rm",
            "-d",
            "--add-host",
            "host.docker.internal:host-gateway",
        ];

        if let Some(name) = &self.name {
            args.extend(&["--name", name]);
        }

        if let Some(platform) = &self.platform {
            args.extend(&["--platform", platform]);
        }

        args.extend(self.mounts.iter().flat_map(|m| ["-v", m.as_str()]));
        args.extend(self.ports.iter().flat_map(|p| ["-p", p.as_str()]));
        args.extend(extra_params);
        args.push(&self.image);
        args.extend(commands);

        log::info!("docker {}", args.join(" "));

        let status = Command::new("docker").args(&args).status()?;

        if !status.success() {
            anyhow::bail!("Failed to start Docker container");
        }

        Ok(())
    }

    pub fn stop(&self) {
        let Some(name) = &self.name else {
            return;
        };
        log::info!("Stopping container: {}", name);
        let _ = Command::new("docker").args(["kill", name]).status();
    }
}

/// Poll the server's GraphQL endpoint until it responds, with a timeout in seconds.
pub async fn wait_for_server(base_url: &str, timeout_secs: u64) -> Result<()> {
    let url = format!("{}/graphql", base_url);
    let client = reqwest::Client::new();
    let start = std::time::Instant::now();

    log::info!("Waiting for server at {} ...", url);

    loop {
        if start.elapsed().as_secs() > timeout_secs {
            anyhow::bail!(
                "Server did not become ready within {} seconds",
                timeout_secs
            );
        }

        let result = client
            .post(&url)
            .json(&serde_json::json!({
                "query": "{ apiVersion }"
            }))
            .send()
            .await;

        if let Ok(resp) = result {
            if resp.status().is_success() {
                log::info!("Server is ready");
                return Ok(());
            }
        }

        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
}
