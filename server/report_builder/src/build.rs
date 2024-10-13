use anyhow::Result;
use base64::prelude::*;
use service::report::definition::{
    DefaultQuery, GraphQlQuery, Manifest, ReportDefinition, ReportDefinitionEntry,
    ReportDefinitionIndex, ReportOutputType, SQLQuery, TeraTemplate,
};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::Command,
};

use crate::BuildArgs;

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
    args: &BuildArgs,
    files: &mut HashMap<String, PathBuf>,
) -> Result<Vec<SQLQuery>> {
    let Some(sql_queries) = &args.query_sql else {
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

fn make_report(args: &BuildArgs, mut files: HashMap<String, PathBuf>) -> Result<ReportDefinition> {
    let mut index = ReportDefinitionIndex {
        template: Some(args.template.clone()),
        header: None,
        footer: None,
        query: vec![],
        convert_data: None,
        custom_wasm_function: None,
    };
    let mut entries: HashMap<String, ReportDefinitionEntry> = HashMap::new();

    // main template
    let template_file = files
        .remove(&args.template)
        .ok_or(anyhow::Error::msg("Template file does not exist"))?;
    let data = fs::read_to_string(template_file)
        .map_err(|err| anyhow::Error::msg(format!("Failed to load template file: {}", err)))?;
    entries.insert(
        args.template.clone(),
        ReportDefinitionEntry::TeraTemplate(TeraTemplate {
            output: ReportOutputType::Html,
            template: data,
        }),
    );

    // header
    if let Some(header) = &args.header {
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
    if let Some(footer) = &args.footer {
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
    let query_specified = args.query_gql.is_some()
        || args.query_default.is_some()
        || !args
            .query_sql
            .as_ref()
            .map(|it| it.is_empty())
            .unwrap_or(false);
    if !query_specified {
        return Err(anyhow::Error::msg(
            "No query specified, e.g. --query-gql or --query-default or --query-sql",
        ));
    }
    if let Some(query_gql) = &args.query_gql {
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
    } else if let Some(query_default) = &args.query_default {
        index.query.push("query_default".to_string());
        entries.insert(
            "query_default".to_string(),
            ReportDefinitionEntry::DefaultQuery(parse_default_query(query_default)?),
        );
    }
    for sql_query in extract_sql_entry(args, &mut files)? {
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
                let manifest: Manifest = serde_json::from_str(&data).map_err(|err| {
                    anyhow::Error::msg(format!("Failed to parse manifest.json: {}", err))
                })?;
                (name.to_string(), ReportDefinitionEntry::Manifest(manifest))
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

    // first check if there is nominated path to custom wasm function
    if let Some(custom_wasm_function) = &args.custom_wasm_function {
        let encoded = BASE64_STANDARD.encode(fs::read(custom_wasm_function).unwrap());
        index.convert_data = Some(encoded)
    };

    // Then look for data conversion with js functions
    if let Some(convert_data) = &args.convert_data {
        if index.convert_data.is_none() {
            let js = &format!("./{}/convert_data.js", convert_data);

            let ts = &format!("./{}/convert_data.d.ts", convert_data);

            let wasm = &format!("./{}/convert_data.wasm", convert_data);

            let dir_path = &format!("./{}/", convert_data);

            Command::new(&format!("ls {}", dir_path));

            Command::new("extism-js")
                .args([&js, "-i", &ts, "-o", &wasm])
                .output()
                .unwrap();

            let encoded = BASE64_STANDARD.encode(fs::read(wasm).unwrap());

            index.convert_data = Some(encoded)
        }
    }

    Ok(ReportDefinition { index, entries })
}

pub fn build(args: BuildArgs) -> anyhow::Result<()> {
    let definition = build_report_definition(&args)?;
    let output_path = args.output.unwrap_or("./generated/output.json".to_string());
    let output_path = Path::new(&output_path);
    fs::create_dir_all(output_path.parent().ok_or(anyhow::Error::msg(format!(
        "Invalid output path: {:?}",
        output_path
    )))?)?;

    fs::write(output_path, serde_json::to_string_pretty(&definition)?).map_err(|_| {
        anyhow::Error::msg(format!(
            "Failed to write to {:?}. Does output dir exist?",
            output_path
        ))
    })?;

    Ok(())
}

pub fn build_report_definition(args: &BuildArgs) -> anyhow::Result<ReportDefinition> {
    let project_dir = Path::new(&args.dir);
    let files = find_project_files(project_dir)?;
    let definition = make_report(args, files)?;
    Ok(definition)
}
