use regex::Regex;
use reqwest::Url;
use serde::{Deserialize, Serialize};

use std::{fs, path::Path};

use crate::Api;

#[derive(clap::ValueEnum, Default, Clone, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Format {
    #[default]
    Pdf,
    Html,
    Excel,
}

const PRINT_QUERY: &str = r#"
query GenerateReportDefinition($storeId: String!, $name: String, $report: JSON!, $dataId: String, $arguments: JSON, $format: PrintFormat, $excelTemplate: [Int]) {
  root: generateReportDefinition(dataId: $dataId, name: $name, report: $report, storeId: $storeId, arguments: $arguments, format: $format, excelTemplateBuffer: $excelTemplate) {
    ... on PrintReportNode {
      __typename
      fileId
    }
    ... on PrintReportError {
      __typename
      error {
        description
        ... on FailedToFetchReportData {
          __typename
          description
          errors
        }
      }
    }
  }
}
"#;

const STORES_QUERY: &str = r#"
  query stores($storeName: String) {
    root: stores(filter: {name: {equalTo: $storeName}}) {
      ... on StoreConnector {
        nodes {
          id
        }
      }
    }
  }
"#;

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub url: String,
    pub username: String,
    pub password: String,
}

async fn fetch_store_id(api: &Api, store_name: &str) -> anyhow::Result<String> {
    let result = api
        .gql(
            STORES_QUERY,
            serde_json::json!({ "storeName": store_name }),
            None,
        )
        .await?;

    let store_id = result
        .get("nodes")
        .and_then(|n| n.as_array())
        .and_then(|a| a.first())
        .and_then(|s| s.get("id"))
        .and_then(|s| s.as_str())
        .ok_or_else(|| anyhow::Error::msg(format!("Can't find store: {}", store_name)))?;

    Ok(store_id.to_string())
}

async fn generate_request(
    api: &Api,
    store_id: &str,
    name: &Option<String>,
    report: serde_json::Value,
    data_id: Option<String>,
    arguments: Option<serde_json::Value>,
    format: Format,
    excel_template_buffer: Option<Vec<u8>>,
) -> anyhow::Result<String> {
    let result = api
        .gql(
            PRINT_QUERY,
            serde_json::json!({
                "storeId": store_id,
                "dataId": data_id,
                "name": name,
                "report": report,
                "arguments": arguments,
                "format": format,
                "excelTemplate": excel_template_buffer
            }),
            Some("PrintReportNode"),
        )
        .await?;

    let file_id = result["fileId"].as_str().unwrap().to_string();
    Ok(file_id)
}

async fn fetch_file(
    api: &Api,
    file_id: &str,
    output_filename: &Option<String>,
) -> anyhow::Result<String> {
    let url = api.url.join("files")?;
    let response = reqwest::Client::new()
        .get(url)
        .bearer_auth(&api.token)
        .query(&[("id", file_id)])
        .send()
        .await?;

    let content_disposition = response
        .headers()
        .get(reqwest::header::CONTENT_DISPOSITION)
        .ok_or(anyhow::Error::msg("Missing content disposition header"))?
        .to_str()?;
    let re = Regex::new(r#"filename="(.*)""#).unwrap();
    let filename = re
        .captures_iter(content_disposition)
        .next()
        .unwrap()
        .get(1)
        .unwrap()
        .as_str()
        .to_string();

    let output_filename = match output_filename {
        Some(output_filename) => {
            let parent_dir = Path::new(output_filename)
                .parent()
                .ok_or(anyhow::Error::msg(format!(
                    "Invalid output path: {:?}",
                    output_filename
                )))?;
            fs::create_dir_all(parent_dir)?;
            output_filename.to_string()
        }
        None => filename,
    };
    log::info!("Write report to: {}", output_filename);
    fs::write(&output_filename, response.bytes().await?)?;
    Ok(output_filename)
}

pub struct ReportGenerateData {
    pub report: serde_json::Value,
    pub config: Config,
    pub store_id: Option<String>,
    pub store_name: Option<String>,
    pub output_filename: Option<String>,
    pub format: Format,
    pub data_id: Option<String>,
    pub arguments: Option<serde_json::Value>,
    pub excel_template_buffer: Option<Vec<u8>>,
}

pub async fn generate_report(
    config_path: String,
    store_id: Option<String>,
    store_name: Option<String>,
    output_filename: Option<String>,
    report_file: String,
    data_id: Option<String>,
    arguments_file: Option<String>,
    format: Format,
    excel_template_file: Option<String>,
) -> anyhow::Result<()> {
    let arguments = if let Some(arguments_file) = arguments_file {
        log::info!("Load arguments from: {}", arguments_file);
        let report_data = fs::read_to_string(arguments_file)
            .map_err(|err| anyhow::Error::msg(format!("Failed to load argument file: {}", err)))?;
        Some(serde_json::from_str(&report_data)?)
    } else {
        None
    };

    log::info!("Load report data from: {}", report_file);
    let report_data = fs::read_to_string(report_file).map_err(|err| {
        anyhow::Error::msg(format!("Failed to load report definition file: {}", err))
    })?;
    let report: serde_json::Value = serde_json::from_str(&report_data).map_err(|err| {
        anyhow::Error::msg(format!("Failed to parse report definition file: {}", err))
    })?;

    log::info!("Load remote server config from: {}", config_path);
    let config_data = fs::read_to_string(config_path)
        .map_err(|err| anyhow::Error::msg(format!("Failed to load config file: {}", err)))?;
    let config: Config = serde_yml::from_str(&config_data)
        .map_err(|err| anyhow::Error::msg(format!("Failed to parse config file: {}", err)))?;

    let excel_template_buffer = excel_template_file.map(|path| fs::read(path)).transpose()?;

    generate_report_inner(ReportGenerateData {
        report,
        config,
        store_id,
        store_name,
        output_filename,
        format,
        data_id,
        arguments,
        excel_template_buffer,
    })
    .await
}

pub async fn generate_report_inner(input: ReportGenerateData) -> anyhow::Result<()> {
    let ReportGenerateData {
        report,
        config,
        store_id,
        store_name,
        output_filename,
        format,
        data_id,
        arguments,
        excel_template_buffer,
    } = input;

    let base_url = Url::parse(&config.url)
        .map_err(|err| anyhow::Error::msg(format!("Invalid base url: {}", err)))?;

    log::info!("Authenticating with remote server at {}", base_url);
    let api = Api::new_with_token(base_url, config.username, config.password)
        .await
        .map_err(|err| {
            anyhow::Error::msg(format!(
                "Failed to authenticate with remote server: {}",
                err
            ))
        })?;

    let store_id = if let Some(store_id) = store_id {
        store_id
    } else {
        let Some(store_name) = store_name else {
            return Err(anyhow::Error::msg(
                "Either store_id or store_name must be specified".to_string(),
            ));
        };
        log::info!("Fetching store id for {store_name}");
        fetch_store_id(&api, &store_name).await?
    };

    log::info!("Sending report generate request");
    let file_name = output_filename.as_ref().and_then(|p| {
        Path::new(&p)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
    });
    let file_id = generate_request(
        &api,
        &store_id,
        &file_name,
        report,
        data_id,
        arguments,
        format,
        excel_template_buffer,
    )
    .await?;

    log::info!("Downloading report");
    fetch_file(&api, &file_id, &output_filename).await?;

    Ok(())
}
