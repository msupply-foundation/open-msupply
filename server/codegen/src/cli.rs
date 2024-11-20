use anyhow;
use clap::Parser;
use codegen::generate_repository_code;
use convert_case::{Case, Casing};

#[derive(clap::Parser)]
#[clap(version, about)]
struct Args {
    #[clap(subcommand)]
    action: Action,
}

#[derive(clap::Subcommand)]
enum Action {
    CreateRepo {
        /// Name for New Repository
        #[clap(short, long)]
        name: String,
    },
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    match args.action {
        Action::CreateRepo { name } => {
            let code = generate_repository_code(&name);
            let file_path = format!(
                "../repository/src/db_diesel/{}_row.rs",
                name.to_case(Case::Snake)
            );
            std::fs::write(file_path, code).unwrap();
        }
    }
    Ok(())
}
