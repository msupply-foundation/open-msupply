use clap::Parser;
use report_builder::{build::build, generate::generate_report, Action, Args};

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    match args.action {
        Action::Build(args) => {
            build(args)?;
        }
        Action::Print(args) => {
            generate_report(
                args.config,
                args.store_id,
                args.output,
                args.report,
                args.data_id,
                args.arguments_file,
            )?;
        }
    };

    Ok(())
}
