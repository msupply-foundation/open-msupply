pub mod amc;

#[cfg(test)]
mod generate_typescript_types {
    use super::*;
    use ts_rs::TS;

    #[derive(TS)]
    #[allow(unused)]
    struct Function<I: TS, O: TS> {
        input: I,
        output: O,
    }

    #[derive(TS)]
    #[allow(unused)]
    struct PluginTypes {
        average_monthly_consumption: Function<amc::Input, amc::Output>,
    }

    #[test]
    fn export_plugin_typescript() {
        PluginTypes::export_all_to("../../client/packages/plugins/backendTypes/generated").unwrap();
    }
}
