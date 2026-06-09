use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use log::{error, info};
use repository::database_settings::DatabaseSettings;
use reqwest::{Client, Error, Response};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use serde_yml;
use service::{
    settings::{DiscoveryMode, ServerSettings, Settings},
    sync::settings::{BatchSize, SyncSettings},
};
use std::{
    path::{Path, PathBuf},
    time::{Duration, Instant},
};
use tokio::{process::Child, task::JoinHandle, time::sleep};
use util::{hash::sha256, uuid::uuid};
const TEST_API: &str = "sync/v5/test";

#[derive(clap::Args)]
pub struct LoadTest {
    /// Central server url including protocol (http) and port
    #[clap(long)]
    pub msupply_central_url: String,

    /// The OMS central server URL including protocol (http) and port
    #[clap(long)]
    pub oms_central_url: String,

    /// Username of an OMS central server user account, used to authenticate the readiness
    /// check that waits for OMS central to sync data from mSupply central before starting remotes
    #[clap(long, default_value = "admin")]
    pub oms_central_username: String,

    /// Password for the OMS central server user account
    #[clap(long, default_value = "pass")]
    pub oms_central_password: String,

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

    /// The number of lines to include in each requisition
    #[clap(short, long, default_value = "25")]
    pub lines: usize,

    /// Duration in seconds to run the test for
    #[clap(short, long)]
    pub duration: usize,
}

#[derive(Deserialize, Debug, Clone)]
struct SyncSite {
    #[serde(rename = "site_ID")]
    site_id: usize,
    name: String,
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

#[derive(Clone)]
struct TestSite {
    client: Client,
    graphql_url: String,
    site: SyncSite,
    store: SyncStore,
    settings: Settings,
    next_store: SyncStore,
    config_file_path: PathBuf,
}

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct SyncInfo {
    data: LatestSyncStatus,
}
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct LatestSyncStatus {
    latest_sync_status: FullSyncStatus,
}
// The remote's `latestSyncStatus` returns the V7 node. We only need `isSyncing` (to know a
// sync cycle has settled) and `summary.finished` (to know the cycle integrated). Per-cycle
// push/pull counts are NOT read here: on the V7 node they're cursor-delta progress fields that
// read 0 for single-batch syncs. The actual throughput is measured on OMS central instead, by
// parsing its `sync_v7 push` / `sync_v7 pull` log lines after the test.
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct FullSyncStatus {
    is_syncing: bool,
    summary: SyncStatus,
}
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct SyncStatus {
    finished: Option<DateTime<Utc>>,
}

// OMS central is a central server, so its `latestSyncStatus` returns the V5/V6 node
// (it syncs from mSupply central via v5). Used by the readiness gate below.
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct OmsCentralFullSyncStatus {
    is_syncing: bool,
    summary: SyncStatus,
}

impl LoadTest {
    pub async fn run(&self) -> anyhow::Result<()> {
        use tokio::process::Command;
        use util::hash::sha256;

        println!("Starting load test with the following parameters:");
        let msupply_central_test_url = format!("{}/{}", self.msupply_central_url, TEST_API);
        println!("Test URL: {}", msupply_central_test_url);
        println!("OMS Central Test URL: {}", self.oms_central_url);
        println!("Base Port: {}", self.base_port);
        println!("Output Directory: {}", self.output_dir.display());
        println!("Number of Sites: {}", self.sites);
        println!("Requisition Lines: {}", self.lines);
        println!("Duration: {} seconds", self.duration);

        let _ = std::fs::remove_dir_all(&self.output_dir);
        let client = Client::new();
        let test_site_name = self.test_site_name.as_ref().unwrap();
        let test_site_pass = Some(sha256(self.test_site_pass.as_ref().unwrap()));

        // Creating the sites on OG central
        let num_sites = if self.sites > 1 { self.sites } else { 2 };
        let site_n_stores = create_sites(
            &msupply_central_test_url,
            &client,
            test_site_name,
            &test_site_pass,
            num_sites,
        )
        .await?;

        let test_sites = self.create_test_sites(site_n_stores);

        let item_ids = self
            .create_items(
                msupply_central_test_url,
                client,
                test_site_name,
                test_site_pass,
            )
            .await?;

        // The remotes sync v7 solely from OMS central, so it must hold the sites/stores/items
        // (and the site rows used for auth) before they initialise. Drive OMS central through a
        // sync cycle per created store so all stores migrate from mSupply central.
        self.wait_for_oms_central_synced(num_sites).await?;

        self.create_configs(&test_sites)?;

        // Start each remote OMS instance
        println!("Starting remote OMS instances...");
        let mut handles = Vec::new();
        let duration = self.duration as u64;
        let num_lines = self.lines;

        for test_site in test_sites {
            let dir = self.output_dir.clone();
            let item_ids_copy = item_ids.clone();
            let handle: JoinHandle<anyhow::Result<()>> = tokio::spawn(async move {
                let log = std::fs::File::create(
                    dir.join(format!("site_{}_output.log", test_site.site.site_id)),
                )?;

                let mut child = Command::new("./target/debug/remote_server") // TODO: be better to run prod binary instead
                    .arg("--config-path")
                    .arg(&test_site.config_file_path)
                    .stdout(log.try_clone().unwrap())
                    .stderr(log)
                    .env("RUST_LOG", "none")
                    .kill_on_drop(true)
                    .spawn()?;

                sleep(Duration::from_secs(10)).await; // Let db get created, migrated and initialisation started

                info!(
                    "Site {} started, waiting for initial sync to complete",
                    test_site.site.site_id
                );
                if let Err(e) = test_site.wait_for_sync().await {
                    report_site_failure(&mut child, &dir, test_site.site.site_id, "initial sync")
                        .await;
                    return Err(e);
                }

                info!("Beginning load test for site: {}", test_site.site.site_id);

                // Drive load: create a requisition and sync until it has integrated, repeatedly,
                // until the duration elapses. The records this generates flow to OMS central as
                // pushes (and come back to other sites as pulls); the counts are recorded on OMS
                // central and parsed from its log after the test, not measured here.
                let start = std::time::Instant::now();
                let mut cycles = 0u64;
                loop {
                    if let Err(e) =
                        create_and_send_requisition(&test_site, num_lines, &item_ids_copy).await
                    {
                        report_site_failure(
                            &mut child,
                            &dir,
                            test_site.site.site_id,
                            "creating requisition",
                        )
                        .await;
                        return Err(e);
                    };

                    let cycle_start = std::time::Instant::now();
                    if let Err(e) = test_site.do_sync_until_integrated().await {
                        report_site_failure(
                            &mut child,
                            &dir,
                            test_site.site.site_id,
                            "syncing requisition",
                        )
                        .await;
                        return Err(e.into());
                    }
                    cycles += 1;
                    println!(
                        "Site {}: sync cycle {} done in {:?}",
                        test_site.site.site_id,
                        cycles,
                        cycle_start.elapsed()
                    );

                    if start.elapsed().as_secs() >= duration {
                        kill(&mut child, test_site.site.site_id).await;
                        break;
                    }
                }
                info!(
                    "Site {} finished after {} sync cycles",
                    test_site.site.site_id, cycles
                );
                Ok(())
            });
            handles.push(handle)
        }

        // Wait for either all tasks to complete or timeout. We delay by a significant amount here as the child processes don't start their timers based
        // on duration until after they've initialised, where this timer will start essentially immediately, before the children have initialised.
        // The more sites/children spawned, the longer we should expect initialisation to take.
        let timeout_duration = Duration::from_secs(duration + (60 * 2 * num_sites as u64));

        let handles_for_timeout = handles.iter().map(|h| h.abort_handle()).collect::<Vec<_>>();

        tokio::select! {
            _ = tokio::time::sleep(timeout_duration) => {
                println!("Timeout reached, terminating remaining processes...");
                // Force kill any remaining tasks
                for abort_handle in handles_for_timeout {
                    abort_handle.abort();
                }
            }
            _ = async {
                for handle in handles {
                    if let Err(e) = handle.await {
                        println!("Task failed: {}", e);
                    }
                }
            } => {
                println!("All tasks completed normally");
            }
        }

        // Throughput is measured on OMS central itself, from the `sync_v7 push`/`pull` lines it
        // logs (it sees all traffic). OMS central normally runs on a separate machine whose log
        // isn't reachable from here, so analysis happens separately, not in this CLI.
        println!("end");
        Ok(())
    }

    /// Wait until OMS central has synced the freshly-created sites/stores/items from mSupply
    /// central. The remotes sync v7 solely from OMS central, so it must hold this data (and the
    /// site rows used for auth) before they initialise. OMS central is a central server, so its
    /// `latestSyncStatus` returns the V5/V6 node. We remember the previously completed sync and
    /// wait for a newer one, so the data we just created is guaranteed to be included.
    async fn wait_for_oms_central_synced(&self, store_count: usize) -> Result<(), anyhow::Error> {
        // OMS central enforces access control on the sync-status GraphQL, so log in with an
        // OMS central user account and use the returned bearer token (the spawned remotes get
        // away with a placeholder header only because they run with debug_no_access_control).
        let url = reqwest::Url::parse(&self.oms_central_url)
            .map_err(|e| anyhow!("Invalid OMS central url '{}': {}", self.oms_central_url, e))?;
        let api = crate::graphql::Api::new_with_token(
            url,
            self.oms_central_username.clone(),
            self.oms_central_password.clone(),
        )
        .await
        .map_err(|e| anyhow!("Failed to authenticate with OMS central: {}", e))?;

        // COGS migrates one store's data to OMS central per sync cycle (see transition.md,
        // "Moving one Store at a Time"). A site can only upgrade to v7 once all its stores have
        // reached migration status "synced" on COGS, so drive OMS central through a full sync
        // cycle for each store we created — pulling and integrating each in turn — before the
        // remotes initialise and request their v7 token.
        let cycles = store_count + 1; // need one extra cycle as first cycle triggers the first store to get migrated by COGS
        println!(
            "Syncing OMS central to migrate {} store(s) from mSupply central...",
            store_count
        );
        for cycle in 1..=cycles {
            run_oms_central_sync_cycle(&api).await?;
            println!("OMS central sync cycle {}/{} complete", cycle, cycles);
        }
        println!("OMS central is synced.");
        Ok(())
    }

    fn create_configs(&self, test_sites: &Vec<TestSite>) -> Result<(), anyhow::Error> {
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
                base_dir: "app_data".to_string(),
                machine_uid: None,
                override_is_central_server: false,
                standalone_store_name: None,
                standalone_admin_username: None,
                standalone_admin_password: None,
            },
            database: DatabaseSettings {
                username: "postgres".to_string(),
                password: "password".to_string(),
                port: 5432,
                host: "localhost".to_string(),
                database_name: "omsupply-database".to_string(),
                database_path: None,
                connection_pool_max_connections: None,
                connection_pool_min_idle: None,
                connection_pool_timeout_seconds: None,
                init_sql: None,
            },
            logging: None,
            backup: None,
            mail: None,
            sync: None,
            features: None,
            changelog_partition: None,
        };
        let base_config_path = self.output_dir.join("base.yaml");
        std::fs::write(base_config_path, serde_yml::to_string(&base_config)?)?;
        Ok(for test_site in test_sites {
            std::fs::write(
                &test_site.config_file_path.clone(),
                serde_yml::to_string(&test_site.settings.clone())?,
            )?;
        })
    }

    async fn create_items(
        &self,
        url: String,
        client: Client,
        test_site_name: &String,
        test_site_pass: Option<String>,
    ) -> Result<Vec<String>, anyhow::Error> {
        let item_ids: Vec<String> = (0..self.lines).map(|_| uuid()).collect();
        let items: Vec<Value> = item_ids
            .iter()
            .map(|id| {
                json!({
                    "ID": id,
                    "type_of": "general",
                    "code": "test_item_code",
                    "item_name": "test_item",
                    "default_pack_size": 12,
                })
            })
            .collect();
        let body = json!({"item": items}).to_string();
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
            let message = response.text().await?;
            return Err(anyhow!("Failed to create items: {}", message));
        }
        Ok(item_ids)
    }

    fn create_test_sites(&self, site_n_stores: Vec<SiteNStore>) -> Vec<TestSite> {
        let mut test_sites: Vec<TestSite> = Vec::new();
        let password_sha256 = sha256("pass");
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
                    base_dir: database_path.to_string(),
                    machine_uid: Some("1337_test".to_string()),
                    override_is_central_server: false,
                    standalone_store_name: None,
                    standalone_admin_username: None,
                    standalone_admin_password: None,
                },
                database: DatabaseSettings {
                    username: "postgres".to_string(),
                    password: "password".to_string(),
                    port: 5432,
                    host: "localhost".to_string(),
                    database_name: format!("site_{}", site_n_store.site.site_id),
                    database_path: Some(database_path.to_string()),
                    connection_pool_max_connections: None,
                    connection_pool_min_idle: None,
                    connection_pool_timeout_seconds: None,
                    init_sql: None,
                },
                sync: Some(SyncSettings {
                    // Remotes sync v7 solely from OMS central. The remote DB is freshly
                    // reset, so it defaults to SyncVersion::V7 (see populate_sync_version
                    // migration); pointing the sync url at OMS central is all that's needed.
                    url: self.oms_central_url.clone(),
                    username: site_n_store.site.name.clone(),
                    password_sha256: password_sha256.clone(),
                    interval_seconds: 600,
                    batch_size: BatchSize {
                        remote_pull: 512,
                        remote_push: 512,
                        central_pull: 512,
                    },
                    disable_integration_transaction: false,
                }),
                logging: None,
                backup: None,
                mail: None,
                features: None,
                changelog_partition: None,
            };

            let full_site = TestSite {
                // Bound request/connect time so an unresponsive (hung) remote surfaces as a
                // timeout error instead of blocking a poll forever.
                client: Client::builder()
                    .timeout(Duration::from_secs(30))
                    .connect_timeout(Duration::from_secs(10))
                    .build()
                    .expect("Failed to build site HTTP client"),
                graphql_url: format!("http://localhost:{}/{}", settings.server.port, "graphql"),
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
        test_sites
    }
}

/// Trigger a single OMS central sync cycle and wait for it to finish (pull + integrate).
/// Completion is detected by `latestSyncStatus.summary` reporting a newer `finished` timestamp
/// than before the cycle was triggered, with no sync in progress.
async fn run_oms_central_sync_cycle(api: &crate::graphql::Api) -> Result<(), anyhow::Error> {
    let previous_finished = query_oms_central_sync_status(api)
        .await?
        .and_then(|s| s.summary.finished);

    // Trigger a sync now rather than waiting on OMS central's natural sync interval.
    let _ = api
        .gql("mutation ManualSync { root: manualSync }", json!({}), None)
        .await;

    let start = Instant::now();
    loop {
        sleep(Duration::from_secs(2)).await;

        if let Some(status) = query_oms_central_sync_status(api).await? {
            if !status.is_syncing
                && status.summary.finished.is_some()
                && status.summary.finished != previous_finished
            {
                return Ok(());
            }
        }

        if start.elapsed().as_secs() > 300 {
            return Err(anyhow!(
                "Timed out waiting for an OMS central sync cycle to finish"
            ));
        }
    }
}

/// Query OMS central's `latestSyncStatus`. Returns `None` when OMS central has not produced a
/// sync log yet (the union resolves to null). OMS central is central, so the status is the
/// V5/V6 node. The query aliases the field to `root` because `Api::gql` returns `data.root`.
async fn query_oms_central_sync_status(
    api: &crate::graphql::Api,
) -> Result<Option<OmsCentralFullSyncStatus>, anyhow::Error> {
    const SYNC_STATUS_QUERY: &str = r#"
query SyncInfo {
  root: latestSyncStatus {
    ... on FullSyncStatusV5V6Node {
      isSyncing
      summary {
        finished
      }
    }
  }
}
"#;

    let value = api
        .gql(SYNC_STATUS_QUERY, json!({}), None)
        .await
        .map_err(|e| anyhow!("Failed to query OMS central sync status: {}", e))?;

    serde_json::from_value(value)
        .map_err(|e| anyhow!("Failed to parse OMS central sync status: {}", e))
}

async fn create_sites(
    url: &String,
    client: &Client,
    test_site_name: &String,
    test_site_pass: &Option<String>,
    num_sites: usize,
) -> Result<Vec<SiteNStore>, anyhow::Error> {
    let mut last_store_name_id: Option<String> = None;
    let mut site_n_stores: Vec<SiteNStore> = Vec::new();
    for _ in 0..num_sites {
        let body = if last_store_name_id.is_some() {
            json!({"visibleNameIds": [last_store_name_id]})
        } else {
            json!({"visibleNameIds": []})
        }
        .to_string();

        let response = client
            .post(url.clone() + "/create_site")
            .header("app-name", "load_test")
            .header("app-version", "0")
            .header("msupply-site-uuid", "load_test")
            .header("sync-version", "load_test")
            .header("content-length", body.len())
            .basic_auth(test_site_name, test_site_pass.to_owned())
            .body(body)
            .send()
            .await?;

        if response.status().is_success() {
            let site_n_store: SiteNStore = response.json().await?;
            last_store_name_id = Some(site_n_store.store.name_id.clone());
            site_n_stores.push(site_n_store);
        } else {
            let message = response.text().await?;
            return Err(anyhow!("Failed to create site: {}", message));
        }
    }
    Ok(site_n_stores)
}

async fn kill(child: &mut Child, site_id: usize) {
    match child.kill().await {
        Ok(_) => println!("Child for site {} terminated successfully", site_id),
        Err(e) => println!("Failed to kill child for site {}: {}", site_id, e),
    }
}

/// Log diagnostics for a failed/unresponsive site, then kill its remote process. Reports whether
/// the remote process has already exited (a crash) or is still running but not responding (a hang),
/// and dumps the tail of the remote's own output log — which holds the underlying panic/error,
/// since the load test itself only sees "connection refused"/timeouts from outside.
async fn report_site_failure(child: &mut Child, output_dir: &Path, site_id: usize, phase: &str) {
    match child.try_wait() {
        Ok(Some(status)) => error!(
            "Site {} failed during {}: remote process has exited ({}) — see its log below for the cause",
            site_id, phase, status
        ),
        Ok(None) => error!(
            "Site {} failed during {}: remote process is still running but not responding (likely hung or deadlocked)",
            site_id, phase
        ),
        Err(e) => error!(
            "Site {} failed during {}: could not query remote process state: {}",
            site_id, phase, e
        ),
    }

    let log_path = output_dir.join(format!("site_{}_output.log", site_id));
    match read_log_tail(&log_path, 40) {
        Ok(tail) if !tail.trim().is_empty() => {
            error!(
                "Site {} remote log tail ({}):\n{}",
                site_id,
                log_path.display(),
                tail
            )
        }
        Ok(_) => error!(
            "Site {} remote log {} is empty",
            site_id,
            log_path.display()
        ),
        Err(e) => error!(
            "Site {} could not read remote log {}: {}",
            site_id,
            log_path.display(),
            e
        ),
    }

    kill(child, site_id).await;
}

/// Read the last `max_lines` lines of a file (best-effort, whole-file read — the remote output
/// logs are small as the remotes don't log verbosely).
fn read_log_tail(path: &Path, max_lines: usize) -> std::io::Result<String> {
    let content = std::fs::read_to_string(path)?;
    let lines: Vec<&str> = content.lines().collect();
    let start = lines.len().saturating_sub(max_lines);
    Ok(lines[start..].join("\n"))
}

/// Render a reqwest error together with its full source chain, so the underlying OS cause
/// (e.g. "connection refused (os error 61)" vs "operation timed out") is visible — the top-level
/// Display is only the generic "error sending request for url ...".
fn format_reqwest_error(e: &reqwest::Error) -> String {
    use std::error::Error;
    let mut out = e.to_string();
    let mut source = e.source();
    while let Some(cause) = source {
        out.push_str(" -> ");
        out.push_str(&cause.to_string());
        source = cause.source();
    }
    out
}

async fn create_and_send_requisition(
    test_site: &TestSite,
    num_lines: usize,
    item_ids: &Vec<String>,
) -> anyhow::Result<()> {
    const INSERT_REQUISITION_MUTATION: &str = r#"
mutation InsertRequestRequisition($storeId: String!, $input: InsertRequestRequisitionInput!) {
  insertRequestRequisition(storeId:$storeId, input: $input){
    ... on RequisitionNode {
      id
    }
    ... on InsertRequestRequisitionError {
      error {
        description
      }
    }
  }
}
"#;

    const BATCH_REQUISITION_LINES_MUTATION: &str = r#"
mutation BatchRequestRequisitionLineInsert ($storeId: String!, $input: BatchRequestRequisitionInput!) {
  batchRequestRequisition(storeId:$storeId, input:$input){
    ... on BatchRequestRequisitionResponse {
      insertRequestRequisitionLines  {
        id
      }
      updateRequestRequisitionLines{
        id
      }
    }
  }
}
"#;

    const UPDATE_REQUISITION_MUTATION: &str = r#"
mutation UpdateRequestRequisition ($storeId: String!, $input: UpdateRequestRequisitionInput!) {
  updateRequestRequisition(storeId: $storeId, input: $input) {
    ... on RequisitionNode {
    	id
    }
    ... on UpdateRequestRequisitionError {
      error {
        description
      }
    }
  }
}
"#;

    let requisition_id = uuid();
    let requisition_gql = json!({
        "operationName": "InsertRequestRequisition",
        "query": INSERT_REQUISITION_MUTATION,
        "variables": {
            "storeId": test_site.store.id,
            "input": {
                "id": requisition_id,
                "otherPartyId": test_site.next_store.name_id,
                "maxMonthsOfStock": 3,
                "minMonthsOfStock": 1
            }
        }
    });
    match test_site.do_post(&requisition_gql).await {
        Ok(response) => response,
        Err(e) => {
            println!("insertRequestRequisition request failed: {}", e);
            return Err(e.into());
        }
    };
    let mut line_inserts: Vec<Value> = Vec::new();
    let mut line_updates: Vec<Value> = Vec::new();

    for i in 0..num_lines {
        let line_id = uuid();
        line_inserts.push(json!({
            "id": line_id,
            "itemId": item_ids[i%num_lines],
            "requisitionId": requisition_id
        }));

        line_updates.push(json!({
            "id": line_id,
            "requestedQuantity": i+1,
            "comment": "Please send me the stocks"
        }))
    }

    let line_gql = json!({
        "operationName": "BatchRequestRequisitionLineInsert",
        "query": BATCH_REQUISITION_LINES_MUTATION,
        "variables": {
            "storeId": test_site.store.id,
            "input": {
                "insertRequestRequisitionLines": line_inserts
            }
        }
    });

    match test_site.do_post(&line_gql).await {
        Ok(response) => response,
        Err(e) => {
            println!("insertRequestRequisitionLine request failed: {}", e);
            return Err(e.into());
        }
    };

    let line_gql = json!({
        "operationName": "BatchRequestRequisitionLineInsert",
        "query": BATCH_REQUISITION_LINES_MUTATION,
        "variables": {
            "storeId": test_site.store.id,
            "input": {
                "updateRequestRequisitionLines": line_updates
            }
        }
    });
    match test_site.do_post(&line_gql).await {
        Ok(response) => response,
        Err(e) => {
            println!("insertRequestRequisitionLine request failed: {}", e);
            return Err(e.into());
        }
    };

    let requisition_gql = json!({
        "operationName": "UpdateRequestRequisition",
        "query": UPDATE_REQUISITION_MUTATION,
        "variables": {
            "storeId": test_site.store.id,
            "input": {
                "id": requisition_id,
                "status": "SENT"
            }
        }
    });
    match test_site.do_post(&requisition_gql).await {
        Ok(response) => response,
        Err(e) => {
            println!("insertRequestRequisition request failed: {}", e);
            return Err(e.into());
        }
    };

    Ok(())
}

impl TestSite {
    async fn do_post<T>(&self, body: &T) -> Result<Response, Error>
    where
        T: Serialize,
    {
        Ok(self
            .client
            .post(&self.graphql_url)
            .header("Authorization", "pretend :)")
            .body(serde_json::to_string(&body).unwrap())
            .send()
            .await?)
    }

    // Repeatedly starts sync until local db sync info confirms that integration of sync buffer finished
    // Consider consolidating with similar `sync_omsupply_central` in `server/service/src/sync/test/integration/omsupply_central/mod.rs`
    async fn do_sync_until_integrated(&self) -> Result<SyncInfo> {
        loop {
            self.do_sync().await?;
            let sync_info = self.wait_for_sync().await?;
            if sync_info.data.latest_sync_status.summary.finished.is_some() {
                return Ok(sync_info);
            }
        }
    }

    async fn do_sync(&self) -> Result<Response> {
        const MANUAL_SYNC_QUERY: &str = r#"
mutation ManualSync {
  manualSync
}
"#;
        let sync_gql = json!({
            "operationName": "ManualSync",
            "query": MANUAL_SYNC_QUERY,
        });

        match self.do_post(&sync_gql).await {
            Ok(response) => return Ok(response),
            Err(e) => return Err(e.into()),
        };
    }

    async fn wait_for_sync(&self) -> Result<SyncInfo> {
        // Give up if the remote produces nothing but errors for this long. A successful response
        // (even one reporting `isSyncing: true`) resets the clock, so a legitimately long sync
        // doesn't trip it — only a remote that has actually crashed or hung does.
        const UNRESPONSIVE_TIMEOUT: Duration = Duration::from_secs(60);
        const SYNC_INFO_QUERY: &str = r#"
query SyncInfo {
  latestSyncStatus {
    ... on FullSyncStatusV7Node {
      isSyncing
      summary {
        finished
      }
    }
  }
}
"#;
        let sync_gql = json!({
            "operationName": "SyncInfo",
            "query": SYNC_INFO_QUERY,
        });

        let mut first_error_at: Option<Instant> = None;
        let mut consecutive_errors: u32 = 0;
        let mut last_logged_at: Option<Instant> = None;

        loop {
            sleep(Duration::from_millis(1000)).await;

            let response = match self.do_post(&sync_gql).await {
                Ok(response) => {
                    // The remote answered — it's alive. Reset the unresponsive tracker.
                    first_error_at = None;
                    consecutive_errors = 0;
                    last_logged_at = None;
                    response
                }
                Err(e) => {
                    consecutive_errors += 1;
                    let since = *first_error_at.get_or_insert_with(Instant::now);
                    let elapsed = since.elapsed();

                    // Throttle: log the first failure, then at most once every 5s, with the error
                    // classification and full cause chain to distinguish crash vs hang vs reset.
                    if last_logged_at.map_or(true, |t| t.elapsed() >= Duration::from_secs(5)) {
                        error!(
                            "Site {}: cannot reach {} ({} consecutive failures over {:?}) \
                             [connect={}, timeout={}, request={}, status={:?}]: {}",
                            self.site.site_id,
                            self.graphql_url,
                            consecutive_errors,
                            elapsed,
                            e.is_connect(),
                            e.is_timeout(),
                            e.is_request(),
                            e.status(),
                            format_reqwest_error(&e),
                        );
                        last_logged_at = Some(Instant::now());
                    }

                    if elapsed >= UNRESPONSIVE_TIMEOUT {
                        return Err(anyhow!(
                            "Site {}: remote at {} unresponsive for {:?} ({} consecutive failures); \
                             last error: {}",
                            self.site.site_id,
                            self.graphql_url,
                            elapsed,
                            consecutive_errors,
                            format_reqwest_error(&e),
                        ));
                    }
                    continue;
                }
            };

            let status = response.status();
            if status.is_success() {
                let response_text = response.text().await?;
                match serde_json::from_str::<SyncInfo>(&response_text) {
                    Ok(sync_info) => {
                        if !sync_info.data.latest_sync_status.is_syncing {
                            return Ok(sync_info);
                        }
                    }
                    Err(e) => error!(
                        "Site {}: failed to parse sync info: {}\nResponse body: {}",
                        self.site.site_id, e, response_text
                    ),
                };
            } else {
                let body = response.text().await.unwrap_or_default();
                error!(
                    "Site {}: sync info query returned HTTP {}: {}",
                    self.site.site_id, status, body
                );
            }
        }
    }
}
