use clap::Parser;
use report_builder::{build::build, print::print_report, Action, Args};

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    match args.action {
        Action::Build(args) => {
            build(args)?;
        }
        Action::Print(args) => {
            print_report(
                args.config,
                args.store_id,
                args.store_name,
                args.output,
                args.report,
                args.data_id,
                args.arguments_file,
            )?;
        }
    };

    Ok(())
}
