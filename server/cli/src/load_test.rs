use std::path::PathBuf;

use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use util::uuid::uuid;
const TEST_API: &str = "sync/v5/test";

#[derive(clap::Args)]
pub struct LoadTest {
    /// Central server url including protocol (http) and port
    #[clap(short, long)]
    pub url: String,

    /// The output directory for test results
    #[clap(short, long)]
    pub output_dir: PathBuf,

    /// The site name of the initial test site that th cli will use to access the API
    #[clap(long, default_value = "test_site")]
    pub test_site_name: Option<String>,

    /// The password for the test site
    #[clap(long, default_value = "pass")]
    pub test_site_pass: Option<String>,

    /// Base port to user for the remote sites (increments by 1 for each site)
    #[clap(short, long)]
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

#[derive(Deserialize, Debug)]
struct SyncSite {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "site_ID")]
    site_id: usize,
    name: String,
    #[serde(rename = "password")]
    password_sha256: String,
}
#[derive(Deserialize, Debug)]
struct SyncStore {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "name_ID")]
    name_id: String,
}
#[derive(Deserialize, Debug)]
pub(crate) struct SiteNStore {
    site: SyncSite,
    store: SyncStore,
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
        use util::hash::sha256;

        println!("Starting load test with the following parameters:");
        let url = format!("{}/{}", self.url, TEST_API);
        println!("Test URL: {}", url);
        println!("Base Port: {}", self.base_port);
        println!("Output Directory: {}", self.output_dir.display());
        println!("Number of Sites: {}", self.sites);
        println!("Invoice Lines: {}", self.invoice_lines);
        println!("Duration: {} seconds", self.duration);

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

        // Creating name store joins between each site's store and the next
        let mut name_store_joins: Vec<Value> = Vec::new();

        for i in 0..site_n_stores.len() {
            let next = if i >= site_n_stores.len() - 1 {
                0
            } else {
                i + 1
            };
            let name_store_join1 = json!({
                "ID": &uuid(),
                "name_ID": site_n_stores[next].store.name_id,
                "store_ID": site_n_stores[i].store.id,
                "om_name_is_customer": true,
                "om_name_is_supplier": true,
            });
            name_store_joins.push(name_store_join1);

            let name_store_join2 = json!({
                "ID": &uuid(),
                "name_ID": site_n_stores[i].store.name_id,
                "store_ID": site_n_stores[next].store.id,
                "om_name_is_customer": true,
                "om_name_is_supplier": true,
            });
            name_store_joins.push(name_store_join2);
        }

        let body = json!({"name_store_join": name_store_joins}).to_string();
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

        println!("end");
        Ok(())
    }
}
