use anyhow::Result;
use service::report::definition::{
    DefaultQuery, GraphQlQuery, ReportDefinition, ReportDefinitionEntry, ReportDefinitionIndex,
    ReportOutputType, SQLQuery, TeraTemplate,
};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
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
) -> Result<Option<(String, SQLQuery)>> {
    match (&args.query_sqlite, &args.query_postgres) {
        (None, None) => Ok(None),
        (Some(query_sqlite), Some(query_postgres)) => {
            let file_path = files
                .remove(query_sqlite)
                .ok_or(anyhow::Error::msg("Sqlite query file does not exist"))?;
            let query_sqlite_sql = fs::read_to_string(file_path).map_err(|err| {
                anyhow::Error::msg(format!("Failed to load Sqlite query file: {}", err))
            })?;
            let query_postgres_sql = if query_postgres == query_sqlite {
                query_sqlite_sql.clone()
            } else {
                let file_path = files
                    .remove(query_postgres)
                    .ok_or(anyhow::Error::msg("Postgres query file does not exist"))?;
                fs::read_to_string(file_path).map_err(|err| {
                    anyhow::Error::msg(format!("Failed to load Postgres query file: {}", err))
                })?
            };
            Ok(Some((
                // Use the Sqlite file name for reference...
                query_sqlite.clone(),
                SQLQuery {
                    query_sqlite: query_sqlite_sql,
                    query_postgres: query_postgres_sql,
                },
            )))
        }
        (None, Some(_)) => Err(anyhow::Error::msg("Sqlite query must be specified as well")),
        (Some(_), None) => Err(anyhow::Error::msg(
            "Postgres query must be specified as well",
        )),
    }
}

fn make_report(args: &BuildArgs, mut files: HashMap<String, PathBuf>) -> Result<ReportDefinition> {
    let mut index = ReportDefinitionIndex {
        template: Some(args.template.clone()),
        header: None,
        footer: None,
        query: None,
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
    if let Some(query_gql) = &args.query_gql {
        let file_path = files
            .remove(query_gql)
            .ok_or(anyhow::Error::msg("GraphQl query file does not exist"))?;
        let query = fs::read_to_string(file_path)
            .map_err(|err| anyhow::Error::msg(format!("Failed to load GQL query file: {}", err)))?;
        index.query = Some(query_gql.clone());
        entries.insert(
            query_gql.clone(),
            ReportDefinitionEntry::GraphGLQuery(GraphQlQuery {
                query,
                variables: None,
            }),
        );
    } else if let Some((query, sql_query)) = extract_sql_entry(args, &mut files)? {
        index.query = Some(query.clone());
        entries.insert(query, ReportDefinitionEntry::SQLQuery(sql_query));
    } else if let Some(query_default) = &args.query_default {
        index.query = Some("query_default".to_string());
        entries.insert(
            "query_default".to_string(),
            ReportDefinitionEntry::DefaultQuery(parse_default_query(query_default)?),
        );
    } else {
        return Err(anyhow::Error::msg(
            "No query specified, e.g. --query-gql or --query-default",
        ));
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
            // add data as json
            let data = serde_json::from_str(&data).map_err(|err| {
                anyhow::Error::msg(format!("Failed to parse json resource {}: {}", name, err))
            })?;
            let name = name.strip_suffix(".json").unwrap();
            (name.to_string(), ReportDefinitionEntry::Resource(data))
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

pub fn build(args: BuildArgs) -> anyhow::Result<()> {
    let project_dir = Path::new(&args.dir);
    let files = find_project_files(project_dir)?;
    let definition = make_report(&args, files)?;

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
