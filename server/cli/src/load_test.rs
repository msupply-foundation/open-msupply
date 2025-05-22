use std::{path::PathBuf, time::Duration};

use repository::database_settings::DatabaseSettings;
use reqwest::{Client, Error};
use serde::Deserialize;
use serde_json::{json, Value};
use serde_yml;
use service::{
    settings::{DiscoveryMode, ServerSettings, Settings},
    sync::settings::{BatchSize, SyncSettings},
};
use tokio::{process::Child, time::sleep};
use util::uuid::uuid;
const TEST_API: &str = "sync/v5/test";

const SYNC_INFO_QUERY: &str = r#"
query SyncInfo {
  latestSyncStatus { isSyncing }
}
"#;

const MANUAL_SYNC_QUERY: &str = r#"
mutation ManualSync {
  manualSync
}
"#;

const STOCK_TAKE_MUTATION: &str = r#"
mutation InsertStockTake($storeId: String!, $input: InsertStocktakeInput!) {
  insertStocktake(storeId: $storeId, input: $input) {
    ... on StocktakeNode {
      id
    }
  }
}
"#;

const STOCK_TAKE_LINE_MUTATION: &str = r#"
mutation InsertStockTakeLine ($storeId: String!, $input: InsertStocktakeLineInput!) {
  insertStocktakeLine (storeId: $storeId, input: $input) {
    __typename
    ... on StocktakeLineNode {
      id
    }
    ... on InsertStocktakeLineError{
      error {
        description
      }
    }
  }
}
"#;

#[derive(clap::Args)]
pub struct LoadTest {
    /// Central server url including protocol (http) and port
    #[clap(short, long)]
    pub url: String,

    /// The output directory for test results
    #[clap(short, long, default_value = "load_test")]
    pub output_dir: PathBuf,

    /// The site name of the initial test site that th cli will use to access the API
    #[clap(long, default_value = "test_site")]
    pub test_site_name: Option<String>,

    /// The password for the test site
    #[clap(long, default_value = "pass")]
    pub test_site_pass: Option<String>,

    /// Base port to user for the remote sites (increments by 1 for each site)
    #[clap(short, long, default_value = "12321")]
    pub base_port: u16,

    /// The amount of sites to simulate
    #[clap(short, long)]
    pub sites: usize,

    /// The number of lines to include in each invoice
    #[clap(short, long)]
    pub invoice_lines: usize,

    /// Duration in seconds to run the test for
    #[clap(short, long)]
    pub duration: usize,
}

#[derive(Deserialize, Debug, Clone)]
struct SyncSite {
    #[serde(rename = "site_ID")]
    site_id: usize,
    name: String,
    #[serde(rename = "password")]
    password_sha256: String,
}
#[derive(Deserialize, Debug, Clone)]
struct SyncStore {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "name_ID")]
    name_id: String,
}
#[derive(Deserialize, Debug, Clone)]
struct SiteNStore {
    site: SyncSite,
    store: SyncStore,
}

#[derive(Deserialize, Clone)]
struct TestSite {
    site: SyncSite,
    store: SyncStore,
    settings: Settings,
    next_store: SyncStore,
    config_file_path: PathBuf,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SyncInfo {
    data: LatestSyncStatus,
}
#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LatestSyncStatus {
    latest_sync_status: SyncStatus,
}
#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SyncStatus {
    is_syncing: bool,
}

impl LoadTest {
    pub fn new(
        url: String,
        base_port: u16,
        output_dir: PathBuf,
        test_site_name: Option<String>,
        test_site_pass: Option<String>,
        sites: usize,
        invoice_lines: usize,
        duration: usize,
    ) -> Self {
        Self {
            url,
            base_port,
            output_dir,
            test_site_name,
            test_site_pass,
            sites,
            invoice_lines,
            duration,
        }
    }

    pub async fn run(&self) -> anyhow::Result<()> {
        use tokio::process::Command;
        use util::hash::sha256;

        println!("Starting load test with the following parameters:");
        let url = format!("{}/{}", self.url, TEST_API);
        println!("Test URL: {}", url);
        println!("Base Port: {}", self.base_port);
        println!("Output Directory: {}", self.output_dir.display());
        println!("Number of Sites: {}", self.sites);
        println!("Invoice Lines: {}", self.invoice_lines);
        println!("Duration: {} seconds", self.duration);

        std::fs::remove_dir_all(&self.output_dir).ok();
        // Creating the sites on OG central
        let body = r#"{"visibleNameIds":[]}"#;
        let client = Client::new();
        let test_site_name = self.test_site_name.as_ref().unwrap();
        let test_site_pass = Some(sha256(self.test_site_pass.as_ref().unwrap()));
        let mut site_n_stores: Vec<SiteNStore> = Vec::new();
        let num_sites = if self.sites > 1 { self.sites } else { 2 };
        for _ in 0..num_sites {
            let response = client
                .post(url.clone() + "/create_site")
                .header("app-name", "load_test")
                .header("app-version", "0")
                .header("msupply-site-uuid", "load_test")
                .header("sync-version", "9")
                .header("content-length", body.len())
                .basic_auth(test_site_name, test_site_pass.to_owned())
                .body(body)
                .send()
                .await?;

            if response.status().is_success() {
                site_n_stores.push(response.json().await?);
            } else {
                dbg!(&response);
                dbg!(&response.text().await?);
                return Ok(());
            }
        }

        let mut test_sites: Vec<TestSite> = Vec::new();
        for (i, site_n_store) in site_n_stores.iter().enumerate() {
            let next = if i >= site_n_stores.len() - 1 {
                0
            } else {
                i + 1
            };

            let port = self.base_port + (i * 2) as u16;
            let database_path = self.output_dir.display();
            let settings = Settings {
                server: ServerSettings {
                    port,
                    danger_allow_http: true,
                    debug_no_access_control: true, // Allow us to use GQL on the remote sites without auth
                    discovery: DiscoveryMode::Disabled,
                    cors_origins: vec![],
                    base_dir: Some(database_path.to_string()),
                    machine_uid: Some("1337_test".to_owned()),
                },
                database: DatabaseSettings {
                    username: "postgres".to_owned(),
                    password: "password".to_owned(),
                    port: 5432,
                    host: "localhost".to_owned(),
                    database_name: format!("site_{}", site_n_store.site.site_id),
                    database_path: Some(database_path.to_string()),
                    init_sql: None,
                },
                sync: Some(SyncSettings {
                    url: self.url.clone(),
                    username: site_n_store.site.name.clone(),
                    password_sha256: site_n_store.site.password_sha256.clone(),
                    interval_seconds: 600,
                    batch_size: BatchSize {
                        remote_pull: 512,
                        remote_push: 512,
                        central_pull: 512,
                    },
                }),
                logging: None,
                backup: None,
                mail: None,
            };

            let full_site = TestSite {
                site: site_n_store.site.clone(),
                store: site_n_store.store.clone(),
                settings,
                next_store: site_n_stores[next].store.clone(),
                config_file_path: self
                    .output_dir
                    .join(format!("site_{}_config.yaml", site_n_store.site.site_id)),
            };

            test_sites.push(full_site);
        }

        // Creating name store joins between each site's store and the next
        let mut name_store_joins: Vec<Value> = Vec::new();
        for test_site in &test_sites {
            let name_store_join1 = json!({
                "ID": &uuid(),
                "name_ID": test_site.next_store.name_id,
                "store_ID": test_site.store.id,
                "om_name_is_customer": true,
                "om_name_is_supplier": true,
            });
            name_store_joins.push(name_store_join1);

            let name_store_join2 = json!({
                "ID": &uuid(),
                "name_ID": test_site.store.name_id,
                "store_ID": test_site.next_store.id,
                "om_name_is_customer": true,
                "om_name_is_supplier": true,
            });
            name_store_joins.push(name_store_join2);
        }
        let item_id = uuid();
        let item = json!( [{
            "ID": item_id,
            "type_of": "general",
            "code": "test_item_code",
            "item_name": "test_item",
            "default_pack_size": 12,
        }]);
        let body = json!({"name_store_join": name_store_joins, "item": item}).to_string();
        let response = client
            .post(url.clone() + "/upsert")
            .header("app-name", "load_test")
            .header("app-version", "0")
            .header("msupply-site-uuid", "load_test")
            .header("sync-version", "9")
            .header("content-length", body.len())
            .basic_auth(test_site_name, test_site_pass.to_owned())
            .body(body)
            .send()
            .await?;

        if !response.status().is_success() {
            dbg!(&response);
            dbg!(&response.text().await?);
            return Ok(());
        }

        // Creating config files for each remote site
        if !self.output_dir.exists() {
            std::fs::create_dir_all(&self.output_dir)?;
        }

        let base_config = Settings {
            server: ServerSettings {
                port: 8000,
                danger_allow_http: true,
                debug_no_access_control: true,
                discovery: DiscoveryMode::Disabled,
                cors_origins: vec![
                    "http://localhost:3003".to_string(),
                    "https://demo-open.msupply.org".to_string(),
                    "http://localhost:8000".to_string(),
                ],
                base_dir: Some("app_data".to_string()),
                machine_uid: None,
            },
            database: DatabaseSettings {
                username: "postgres".to_owned(),
                password: "password".to_owned(),
                port: 5432,
                host: "localhost".to_owned(),
                database_name: "omsupply-database".to_string(),
                database_path: None,
                init_sql: None,
            },
            logging: None,
            backup: None,
            mail: None,
            sync: None,
        };
        let base_config_path = self.output_dir.join("base.yaml");
        std::fs::write(base_config_path, serde_yml::to_string(&base_config)?)?;

        for test_site in &test_sites {
            std::fs::write(
                &test_site.config_file_path.clone(),
                serde_yml::to_string(&test_site.settings.clone())?,
            )?;
        }

        // Start each remote OMS instance
        println!("Starting remote OMS instances...");
        let mut handles = Vec::new();
        let duration = self.duration as u64;
        let num_lines = self.invoice_lines;

        for test_site in test_sites {
            let dir = self.output_dir.clone();
            let item_id_copy = item_id.clone();
            let handle = tokio::spawn(async move {
                let log = std::fs::File::create(
                    dir.join(format!("site_{}_output.log", test_site.site.site_id)),
                )
                .unwrap();
                let mut child = match Command::new("cargo") // TODO: be better to run prod binary instead
                    .arg("run")
                    .arg("--")
                    .arg("--config-path")
                    .arg(&test_site.config_file_path)
                    .stdout(log.try_clone().unwrap())
                    .stderr(log)
                    .kill_on_drop(true)
                    .spawn()
                {
                    Ok(child) => child,
                    Err(e) => {
                        println!("Failed to spawn process: {}", e);
                        return;
                    }
                };
                sleep(Duration::from_secs(20)).await; // Let db get created, migrated and initialisation started
                let client = Client::new();
                let remote_url = format!("http://localhost:{}", test_site.settings.server.port);
                let graphql_url = format!("{}/{}", remote_url, "graphql");

                if wait_for_sync(&client, &graphql_url).await.is_err() {
                    kill(&mut child).await;
                    return;
                }

                let start = std::time::Instant::now();
                loop {
                    let stock_take_id = uuid();
                    let stock_take_gql = json!({
                        "operationName": "InsertStockTake",
                        "query": STOCK_TAKE_MUTATION,
                        "variables": {"storeId": test_site.store.id, "input": {"id": stock_take_id}}
                    });
                    match client
                        .post(&graphql_url)
                        .header(
                            "Authorization",
                            "is disabled :) but still need a token to pretend",
                        )
                        .body(stock_take_gql.to_string())
                        .send()
                        .await
                    {
                        Ok(response) => response,
                        Err(e) => {
                            println!("Failed to make stocktake request: {}", e);
                            kill(&mut child).await;
                            return;
                        }
                    };

                    for i in 0..num_lines {
                        let line_gql = json!({
                            "operationName": "InsertStockTakeLine",
                            "query": STOCK_TAKE_LINE_MUTATION,
                            "variables": {"storeId": test_site.store.id, "input": {"id": uuid(), "stocktakeId": stock_take_id, "itemId": item_id_copy, "countedNumberOfPacks": i, "packSize": i, "batch": "abc-123" } }
                        });
                        match client
                            .post(&graphql_url)
                            .header(
                                "Authorization",
                                "is disabled :) but still need a token to pretend",
                            )
                            .body(line_gql.to_string())
                            .send()
                            .await
                        {
                            Ok(response) => response,
                            Err(e) => {
                                println!("Failed to make stocktake line request: {}", e);
                                kill(&mut child).await;
                                return;
                            }
                        };
                    }

                    let sync_gql = json!({
                        "operationName": "manualSync",
                        "query": MANUAL_SYNC_QUERY,
                    });
                    match client
                        .post(&graphql_url)
                        .header(
                            "Authorization",
                            "is disabled :) but still need a token to pretend",
                        )
                        .body(sync_gql.to_string())
                        .send()
                        .await
                    {
                        Ok(response) => response,
                        Err(e) => {
                            println!("Failed to make stocktake request: {}", e);
                            kill(&mut child).await;
                            return;
                        }
                    };

                    if wait_for_sync(&client, &graphql_url).await.is_err() {
                        kill(&mut child).await;
                        return;
                    }

                    if start.elapsed().as_secs() >= duration {
                        kill(&mut child).await;
                        break;
                    }
                }
            });
            handles.push(handle)
        }

        for handle in handles {
            if let Err(e) = handle.await {
                println!("Error joining task: {}", e);
            }
        }

        println!("end");
        Ok(())
    }
}

async fn kill(child: &mut Child) {
    match child.kill().await {
        Ok(_) => println!("Child terminated successfully"),
        Err(e) => println!("Failed to kill child: {}", e),
    }
}

async fn wait_for_sync(client: &Client, graphql_url: &String) -> Result<(), Error> {
    loop {
        sleep(Duration::from_secs(1)).await;
        let sync_gql = json!({
            "operationName": "SyncInfo",
            "query": SYNC_INFO_QUERY,
        });
        let response = match client
            .post(graphql_url)
            .header(
                "Authorization",
                "is disabled :) but still need a token to pretend",
            )
            .body(sync_gql.to_string())
            .send()
            .await
        {
            Ok(response) => response,
            Err(e) => {
                println!("SyncInfo request failed: {}", e);
                return Err(e);
            }
        };

        if response.status().is_success() {
            match response.json::<SyncInfo>().await {
                Ok(sync_info) => {
                    if !sync_info.data.latest_sync_status.is_syncing {
                        return Ok(());
                    }
                }
                Err(e) => println!("Error parsing SyncInfo: {}", e),
            };
        } else {
            dbg!(&response);
            dbg!(&response.text().await.unwrap());
        }
    }
}
