use anyhow::Result;
use repository::ContextType;
use service::report::definition::{
    ConvertDataType, DefaultQuery, GraphQlQuery, Manifest as DefinitionManifest, ReportDefinition,
    ReportDefinitionEntry, ReportDefinitionIndex, ReportOutputType, SQLQuery, TeraTemplate,
};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

const TEMPLATE_FILENAME: &str = "template.html";

#[derive(serde::Deserialize, Clone)]
pub struct Manifest {
    pub is_custom: bool,
    pub version: String,
    pub code: String,
    pub context: ContextType,
    pub sub_context: Option<String>,
    pub name: String,
    pub header: Option<String>,
    pub footer: Option<String>,
    pub queries: Option<ManifestQueries>,
    pub default_query: Option<String>,
    pub arguments: Option<Arguments>,
    pub test_arguments: Option<TestReportArguments>,
    pub convert_data: Option<String>,
    #[serde(default)]
    pub convert_data_type: ConvertDataType,
    pub query_default: Option<String>,
    pub excel_template: Option<String>,
}

#[derive(serde::Deserialize, Clone)]
pub struct ManifestQueries {
    pub gql: Option<String>,
    pub sql: Option<Vec<String>>,
}

#[derive(serde::Deserialize, Clone)]
pub struct Arguments {
    pub schema: Option<String>,
    pub ui: Option<String>,
}

#[derive(serde::Deserialize, Clone)]
pub struct TestReportArguments {
    pub arguments: Option<String>,
    pub reference_data: Option<String>,
    pub data_id: Option<String>,
}

fn find_project_files(dir: &Path) -> anyhow::Result<HashMap<String, PathBuf>> {
    let mut map = HashMap::new();
    let paths = std::fs::read_dir(dir)?;
    for path in paths {
        let entry = path?;
        let metadata = entry.metadata()?;
        if !metadata.is_file() {
            continue;
        }

        let name = entry.file_name();
        let name = name.to_string_lossy();
        map.insert(name.to_string(), entry.path());
    }
    Ok(map)
}

fn parse_default_query(input: &str) -> anyhow::Result<DefaultQuery> {
    let query = match input {
        "invoice" => DefaultQuery::Invoice,
        "stocktake" => DefaultQuery::Stocktake,
        "requisition" => DefaultQuery::Requisition,
        _ => {
            return Err(anyhow::Error::msg(format!(
                "Invalid default query: {}",
                input
            )))
        }
    };
    Ok(query)
}

/// Returns query name and SQLQuery
fn extract_sql_entry(
    manifest: &Manifest,
    files: &mut HashMap<String, PathBuf>,
) -> Result<Vec<SQLQuery>> {
    let Some(sql_queries) = manifest.queries.as_ref().and_then(|q| q.sql.as_ref()) else {
        return Ok(vec![]);
    };
    let result: Result<Vec<_>> = sql_queries
        .iter()
        .map(|query| {
            let common_query = format!("{query}.sql");
            if let Some(file_path) = files.remove(&common_query) {
                let query_sql = fs::read_to_string(file_path).map_err(|err| {
                    anyhow::Error::msg(format!("Failed to load query file: {}", err))
                })?;
                return Ok(SQLQuery {
                    name: query.clone(),
                    query_sqlite: query_sql.clone(),
                    query_postgres: query_sql.clone(),
                });
            }
            let query_sqlite = format!("{query}.sqlite.sql");
            let file_path = files
                .remove(&query_sqlite)
                .ok_or(anyhow::Error::msg(format!(
                    "Sqlite query file ({query_sqlite}) does not exist"
                )))?;
            let query_sqlite_sql = fs::read_to_string(file_path).map_err(|err| {
                anyhow::Error::msg(format!("Failed to load Sqlite query file: {}", err))
            })?;
            let query_postgres = format!("{query}.postgres.sql");
            let file_path = files
                .remove(&query_postgres)
                .ok_or(anyhow::Error::msg(format!(
                    "Postgres query file ({query_postgres}) does not exist"
                )))?;
            let query_postgres_sql = fs::read_to_string(file_path).map_err(|err| {
                anyhow::Error::msg(format!("Failed to load Postgres query file: {}", err))
            })?;
            Ok(SQLQuery {
                name: query.clone(),
                query_sqlite: query_sqlite_sql.clone(),
                query_postgres: query_postgres_sql.clone(),
            })
        })
        .collect();
    result
}

fn make_report(manifest: &Manifest, mut files: HashMap<String, PathBuf>) -> Result<ReportDefinition> {
    let mut index = ReportDefinitionIndex {
        template: Some(TEMPLATE_FILENAME.to_string()),
        header: None,
        footer: None,
        query: vec![],
        // Convert data is generated outside of this method call
        ..Default::default()
    };
    let mut entries: HashMap<String, ReportDefinitionEntry> = HashMap::new();

    // main template
    let template_file = files
        .remove(TEMPLATE_FILENAME)
        .ok_or(anyhow::Error::msg("Template file does not exist"))?;
    let data = fs::read_to_string(template_file)
        .map_err(|err| anyhow::Error::msg(format!("Failed to load template file: {}", err)))?;
    entries.insert(
        TEMPLATE_FILENAME.to_string(),
        ReportDefinitionEntry::TeraTemplate(TeraTemplate {
            output: ReportOutputType::Html,
            template: data,
        }),
    );

    // header
    if let Some(header) = &manifest.header {
        let file_path = files
            .remove(header)
            .ok_or(anyhow::Error::msg("Header file does not exist"))?;
        let data = fs::read_to_string(file_path)
            .map_err(|err| anyhow::Error::msg(format!("Failed to load header file: {}", err)))?;
        index.header = Some(header.clone());
        entries.insert(
            header.clone(),
            ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                output: ReportOutputType::Html,
                template: data,
            }),
        );
    }

    // footer
    if let Some(footer) = &manifest.footer {
        let file_path = files
            .remove(footer)
            .ok_or(anyhow::Error::msg("Footer file does not exist"))?;
        let data = fs::read_to_string(file_path)
            .map_err(|err| anyhow::Error::msg(format!("Failed to load footer file: {}", err)))?;
        index.footer = Some(footer.clone());
        entries.insert(
            footer.clone(),
            ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                output: ReportOutputType::Html,
                template: data,
            }),
        );
    }

    // query
    let query_gql = manifest.queries.as_ref().and_then(|q| q.gql.as_ref());
    if let Some(query_gql) = query_gql {
        let file_path = files
            .remove(query_gql)
            .ok_or(anyhow::Error::msg("GraphQl query file does not exist"))?;
        let query = fs::read_to_string(file_path)
            .map_err(|err| anyhow::Error::msg(format!("Failed to load GQL query file: {}", err)))?;
        index.query.push(query_gql.clone());
        entries.insert(
            query_gql.clone(),
            ReportDefinitionEntry::GraphGLQuery(GraphQlQuery {
                query,
                variables: None,
            }),
        );
    } else if let Some(query_default) = &manifest.query_default {
        index.query.push("query_default".to_string());
        entries.insert(
            "query_default".to_string(),
            ReportDefinitionEntry::DefaultQuery(parse_default_query(query_default)?),
        );
    }
    for sql_query in extract_sql_entry(manifest, &mut files)? {
        index.query.push(sql_query.name.clone());
        entries.insert(
            sql_query.name.clone(),
            ReportDefinitionEntry::SQLQuery(sql_query),
        );
    }

    // resources: try to use remaining files as resources
    for (name, path) in files {
        if name.ends_with(".graphql") {
            // ignore graphql files (they are included using the query argument)
            continue;
        }
        let data = match fs::read_to_string(&path) {
            Ok(data) => data,
            Err(_) => {
                log::warn!("Ignore non text file resource: {:?}", path);
                continue;
            }
        };
        let (name, value) = if name.ends_with(".ref.json") {
            // add reference
            let data = serde_json::from_str(&data).map_err(|err| {
                anyhow::Error::msg(format!("Failed to parse reference {}: {}", name, err))
            })?;
            let name = name.strip_suffix(".ref.json").unwrap();
            (name.to_string(), ReportDefinitionEntry::Ref(data))
        } else if name.ends_with(".json") {
            let name = name.strip_suffix(".json").unwrap();
            if name == "manifest" {
                let definition_manifest: DefinitionManifest =
                    serde_json::from_str(&data).map_err(|err| {
                        anyhow::Error::msg(format!(
                            "Failed to parse report-manifest.json: {}",
                            err
                        ))
                    })?;
                (
                    name.to_string(),
                    ReportDefinitionEntry::Manifest(definition_manifest),
                )
            } else {
                // add data as json
                let data = serde_json::from_str(&data).map_err(|err| {
                    anyhow::Error::msg(format!("Failed to parse json resource {}: {}", name, err))
                })?;
                (name.to_string(), ReportDefinitionEntry::Resource(data))
            }
        } else {
            (
                name,
                ReportDefinitionEntry::Resource(serde_json::Value::String(data)),
            )
        };

        entries.insert(name, value);
    }

    Ok(ReportDefinition { index, entries })
}

pub fn build_report_definition(manifest: &Manifest, src_dir: &Path) -> anyhow::Result<ReportDefinition> {
    let files = find_project_files(src_dir)?;
    let definition = make_report(manifest, files)?;
    Ok(definition)
}
