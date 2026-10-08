use clap::Parser;
use report_builder::{Action, Args, build::build, print::generate_report};

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
                args.store_name,
                args.output,
                args.report,
                args.data_id,
                args.arguments_file,
                args.format.unwrap_or_default(),
                args.excel_template_file,
            )?;
        }
    };
    Ok(())
}
