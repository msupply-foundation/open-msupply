use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
}

#[tauri::command]
pub async fn test_connection(url: String) -> Result<ConnectionTestResult, String> {
    let graphql_url = format!("{}/graphql", url.trim_end_matches('/'));

    let client = build_client()?;

    match client
        .post(&graphql_url)
        .header("Content-Type", "application/json")
        .body(r#"{"query":"{ __typename }"}"#)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                Ok(ConnectionTestResult {
                    success: true,
                    message: "Connection successful".to_string(),
                })
            } else {
                Ok(ConnectionTestResult {
                    success: false,
                    message: format!("Server returned status {}", response.status()),
                })
            }
        }
        Err(e) => Ok(ConnectionTestResult {
            success: false,
            message: format!("Connection failed: {}", e),
        }),
    }
}

// ─── GraphQL proxy ───────────────────────────────────────────────────────────
// Routes all Apollo Client traffic through Rust to bypass WebView CORS.

#[derive(Deserialize)]
pub struct GraphqlProxyRequest {
    pub url: String,
    pub body: String,
    pub headers: HashMap<String, String>,
}

#[derive(Serialize)]
pub struct GraphqlProxyResponse {
    pub status: u16,
    pub body: String,
}

#[tauri::command]
pub async fn graphql_proxy(request: GraphqlProxyRequest) -> Result<GraphqlProxyResponse, String> {
    let client = build_client()?;

    let mut req = client
        .post(&request.url)
        .header("Content-Type", "application/json");

    for (key, value) in &request.headers {
        req = req.header(key.as_str(), value.as_str());
    }

    let response = req
        .body(request.body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let body = response.text().await.map_err(|e| e.to_string())?;

    Ok(GraphqlProxyResponse { status, body })
}

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())
}
