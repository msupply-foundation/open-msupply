pub mod build;
pub mod print;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[clap(version, about)]
pub struct Args {
    #[clap(subcommand)]
    pub action: Action,
}

#[derive(Subcommand)]
pub enum Action {
    Build(BuildArgs),
    Print(PrintArgs),
}

#[derive(clap::Args)]
pub struct BuildArgs {
    /// Project directory name
    #[clap(short, long)]
    pub dir: String,
    /// output path
    #[clap(short, long)]
    pub output: Option<String>,
    /// Main template name
    #[clap(long)]
    pub template: String,
    #[clap(long)]
    pub header: Option<String>,
    #[clap(long)]
    pub footer: Option<String>,

    /// Name of the file containing a graphql query
    #[clap(long)]
    pub query_gql: Option<String>,
    /// Default query type, one of: "invoice" | "stocktake" | "requisition",
    #[clap(long)]
    pub query_default: Option<String>,

    #[clap(long)]
    pub query_sqlite: Option<String>,
    #[clap(long)]
    pub query_postgres: Option<String>,
}

#[derive(clap::Args)]
pub struct PrintArgs {
    /// Path to the report definition json file
    #[clap(short, long)]
    pub report: String,
    #[clap(long)]
    pub store_id: String,
    /// The data to be printed
    #[clap(long)]
    pub data_id: Option<String>,
    #[clap(long)]
    pub arguments_file: Option<String>,
    /// The output file path
    #[clap(long)]
    pub output: Option<String>,
    /// The YAML config data to connected to the remote server.
    /// Containing:
    /// - url
    /// - username
    /// - password
    #[clap(long)]
    pub config: String,
}
