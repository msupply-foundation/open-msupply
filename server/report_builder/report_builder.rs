use anyhow::Result;
use clap::Parser;
use service::report::definition::{
    DefaultQuery, ReportDefinition, ReportDefinitionEntry, ReportDefinitionIndex, ReportOutputType,
    TeraTemplate,
};
use std::{
    self,
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
struct Args {
    /// Project directory name
    #[clap(short, long)]
    dir: String,
    /// output path
    #[clap(short, long)]
    output: Option<String>,
    /// Main template name
    #[clap(long)]
    template: String,
    #[clap(long)]
    header: Option<String>,
    #[clap(long)]
    footer: Option<String>,

    /// Name of the file containing a graphql query in json format, e.g.
    /// {
    ///     "query": "query string ...",
    ///     "variables": { ... }
    /// }
    #[clap(long)]
    query_gql: Option<String>,
    /// Default query type, one of: "invoice" | "stocktake" | "requisition",
    #[clap(long)]
    query_default: Option<String>,
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

fn build(args: &Args, mut files: HashMap<String, PathBuf>) -> Result<ReportDefinition> {
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
        let data = fs::read_to_string(file_path)
            .map_err(|err| anyhow::Error::msg(format!("Failed to load GQL query file: {}", err)))?;
        let query = serde_json::from_str(&data)?;
        index.query = Some(query_gql.clone());
        entries.insert(
            query_gql.clone(),
            ReportDefinitionEntry::GraphGLQuery(query),
        );
    } else if let Some(query_default) = &args.query_default {
        index.query = Some("query_default".to_string());
        entries.insert(
            "query_default".to_string(),
            ReportDefinitionEntry::DefaultQuery(parse_default_query(&query_default)?),
        );
    } else {
        return Err(anyhow::Error::msg(
            "No query specified, e.g. --query-gql or --query-default",
        ));
    }

    // resources: try to use remaining files as resources
    for (name, path) in files {
        let data = match fs::read_to_string(&path) {
            Ok(data) => data,
            Err(_) => {
                log::warn!("Ignore non text file resource: {:?}", path);
                continue;
            }
        };

        entries.insert(
            name,
            ReportDefinitionEntry::Resource(serde_json::Value::String(data)),
        );
    }

    Ok(ReportDefinition { index, entries })
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();

    let project_dir = Path::new(&args.dir);
    let files = find_project_files(&project_dir)?;
    let definition = build(&args, files)?;

    let output_path = args.output.unwrap_or("./output.json".to_string());
    fs::write(&output_path, serde_json::to_string_pretty(&definition)?).map_err(|_| {
        anyhow::Error::msg(format!(
            "Failed to write to {:?}. Does output dir exist?",
            output_path
        ))
    })?;

    Ok(())
}
