pub mod print;

use clap::{Parser, Subcommand, ValueEnum};
use serde::Serialize;

#[derive(Parser)]
#[clap(version, about)]
pub struct Args {
    #[clap(subcommand)]
    pub action: Action,
}

#[derive(Subcommand)]
pub enum Action {
    Print(PrintArgs),
}

#[derive(ValueEnum, Default, Clone, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Format {
    #[default]
    Pdf,
    Html,
    Excel,
}

#[derive(clap::Args)]
pub struct PrintArgs {
    /// Path to the report definition json file
    #[clap(short, long)]
    pub report: String,
    #[clap(long)]
    pub store_id: Option<String>,
    #[clap(long)]
    pub store_name: Option<String>,
    /// The data to be printed
    #[clap(long)]
    pub data_id: Option<String>,
    #[clap(long)]
    pub arguments_file: Option<String>,
    /// The path to the excel template file
    #[clap(long)]
    pub excel_template_file: Option<String>,
    #[clap(long)]
    pub format: Option<Format>,
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
