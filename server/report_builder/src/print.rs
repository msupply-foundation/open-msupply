use regex::Regex;
use reqwest::Url;
use serde::{Deserialize, Serialize};

use std::{fs, path::Path};

use crate::Format;

const AUTH_QUERY: &str = r#"
query AuthToken($username: String!, $password: String) {
  authToken(password: $password, username: $username) {
    ... on AuthToken {
      __typename
      token
    }
    ... on AuthTokenError {
      __typename
      error {
        description
      }
    }
  }
}
"#;

const PRINT_QUERY: &str = r#"
query GenerateReportDefinition($storeId: String!, $name: String, $report: JSON!, $dataId: String, $arguments: JSON, $format: PrintFormat, $excelTemplate: [Int]) {
  generateReportDefinition(dataId: $dataId, name: $name, report: $report, storeId: $storeId, arguments: $arguments, format: $format, excelTemplateBuffer: $excelTemplate) {
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
    stores(filter: {name: {equalTo: $storeName}}) {
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

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct GraphQlResponse {
    data: serde_json::Value,
    errors: Option<serde_json::Value>,
}

fn token_request(url: Url, config: &Config) -> anyhow::Result<String> {
    let body = serde_json::json!({
      "query": AUTH_QUERY,
      "variables": {
        "username": config.username,
        "password": config.password,
      }
    });
    let result: GraphQlResponse = reqwest::blocking::Client::new()
        .post(url)
        .json(&body)
        .send()?
        .json()?;
    let auth_token = &result.data["authToken"];
    if auth_token["__typename"] != "AuthToken" {
        return Err(anyhow::Error::msg(format!(
            "Failed to authenticate: {:?}",
            result
        )));
    }
    Ok(auth_token["token"].as_str().unwrap().to_string())
}

fn fetch_store_id(url: Url, token: &str, store_name: &str) -> anyhow::Result<String> {
    let body = serde_json::json!({
      "query": STORES_QUERY,
      "variables": {
        "storeName": store_name
      }
    });
    let response = reqwest::blocking::Client::new()
        .post(url)
        .bearer_auth(token)
        .json(&body)
        .send()?;
    let _status = response.status();
    let gql_result: GraphQlResponse = response.json()?;
    let store_id: &Option<&str> = &gql_result
        .data
        .get("stores")
        .and_then(|d| d.get("nodes"))
        .and_then(|s| s.as_array())
        .and_then(|a| a.first())
        .and_then(|s| s.get("id"))
        .and_then(|s| s.as_str());
    let Some(store_id) = store_id else {
        return Err(anyhow::Error::msg(format!(
            "Can't find store: {:?}\n{:#?}",
            store_name, gql_result
        )));
    };

    Ok(store_id.to_string())
}

fn generate_request(
    url: Url,
    token: &str,
    store_id: &str,
    name: &Option<String>,
    report: serde_json::Value,
    data_id: Option<String>,
    arguments: Option<serde_json::Value>,
    format: Format,
    excel_template_buffer: Option<Vec<u8>>,
) -> anyhow::Result<String> {
    let body = serde_json::json!({
      "query": PRINT_QUERY,
      "variables": {
        "storeId": store_id,
        "dataId": data_id,
        "name": name,
        "report": report,
        "arguments": arguments,
        "format": format,
        "excelTemplate": excel_template_buffer
      }
    });
    let response = reqwest::blocking::Client::new()
        .post(url)
        .bearer_auth(token)
        .json(&body)
        .send()?;
    let status = response.status();
    let gql_result: GraphQlResponse = response.json()?;
    let result = &gql_result.data["generateReportDefinition"];
    if result["__typename"] != "PrintReportNode" {
        return Err(anyhow::Error::msg(format!(
            "Failed to generate report: status={:?}  {:#?}",
            status, gql_result
        )));
    }

    let file_id = result["fileId"].as_str().unwrap().to_string();
    Ok(file_id)
}

fn fetch_file(
    url: Url,
    token: &str,
    file_id: &str,
    output_filename: &Option<String>,
) -> anyhow::Result<String> {
    let result = reqwest::blocking::Client::new()
        .get(url)
        .bearer_auth(token)
        .query(&[("id", file_id)])
        .send()?;
    let content_disposition = result
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
    println!("> Write report to: {}", output_filename);
    fs::write(&output_filename, result.bytes()?)?;
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

pub fn generate_report(
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
        println!("> Load arguments from: {}", arguments_file);
        let report_data = fs::read_to_string(arguments_file)
            .map_err(|err| anyhow::Error::msg(format!("Failed to load argument file: {}", err)))?;
        Some(serde_json::from_str(&report_data)?)
    } else {
        None
    };

    println!("> Load report data from: {}", report_file);
    let report_data = fs::read_to_string(report_file).map_err(|err| {
        anyhow::Error::msg(format!("Failed to load report definition file: {}", err))
    })?;
    let report: serde_json::Value = serde_json::from_str(&report_data).map_err(|err| {
        anyhow::Error::msg(format!("Failed to parse report definition file: {}", err))
    })?;

    println!("> Load remote server config from: {}", config_path);
    let config_data = fs::read_to_string(config_path)
        .map_err(|err| anyhow::Error::msg(format!("Failed to load config file: {}", err)))?;
    let config: Config = serde_yaml::from_str(&config_data)
        .map_err(|err| anyhow::Error::msg(format!("Failed to parse config file: {}", err)))?;

    let excel_template_buffer = excel_template_file.map(|path| fs::read(path)).transpose()?;

    let inner_data = ReportGenerateData {
        report,
        config,
        store_id,
        store_name,
        output_filename,
        format,
        data_id,
        arguments,
        excel_template_buffer,
    };

    generate_report_inner(inner_data)?;

    Ok(())
}

pub fn generate_report_inner(input: ReportGenerateData) -> anyhow::Result<()> {
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
    let gql_url = base_url.join("graphql")?;
    let files_url = base_url.join("files")?;

    println!("> User graphql endpoint: {}", gql_url);
    println!("> Authenticate with remote server");
    let token = token_request(gql_url.clone(), &config).map_err(|err| {
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
        println!("> Fetch store id for {store_name}");
        fetch_store_id(gql_url.clone(), &token, &store_name)?
    };

    println!("> Send report generate request ");
    let file_name = output_filename.as_ref().and_then(|p| {
        Path::new(&p)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
    });
    let file_id = generate_request(
        gql_url.clone(),
        &token,
        &store_id,
        &file_name,
        report,
        data_id,
        arguments,
        format,
        excel_template_buffer,
    )
    .map_err(|err| anyhow::Error::msg(format!("Failed to fetch report data: {}", err)))?;

    println!("> Download report from {}", files_url);
    fetch_file(files_url, &token, &file_id, &output_filename)?;

    Ok(())
}
