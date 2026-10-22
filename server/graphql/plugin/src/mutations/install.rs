use crate::queries::uploaded_info::PluginInfoNode;
use std::collections::HashMap;

use async_graphql::Context;
use async_graphql::*;
use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use service::{
    UploadedFile,
    auth::{Resource, ResourceAccessRequest},
    plugin::{
        InstallUploadedPluginError,
        form_plugin::{FormInstallOptions, FormPluginInstallError},
    },
};
use util::format_error;

/// The program chosen for one of a form plugin's program keys.
#[derive(InputObject)]
pub struct PluginProgramInput {
    pub program_key: String,
    pub program_id: String,
}

/// The program chosen for each key. A key chosen twice is refused rather than
/// left to whichever came last.
fn program_choices(programs: Vec<PluginProgramInput>) -> Result<HashMap<String, String>, String> {
    let mut chosen = HashMap::new();
    for PluginProgramInput {
        program_key,
        program_id,
    } in programs
    {
        if let Some(earlier) = chosen.insert(program_key.clone(), program_id.clone()) {
            return Err(format!(
                "--program names key \"{program_key}\" twice ({earlier} and {program_id}); \
                 choose one program for it"
            ));
        }
    }
    Ok(chosen)
}

pub fn install_uploaded_plugin(
    ctx: &Context<'_>,
    file_id: String,
    programs: Option<Vec<PluginProgramInput>>,
    take_over: Option<Vec<String>>,
    blank_old_ui: Option<Vec<String>>,
) -> Result<PluginInfoNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ConfigurePlugin,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;
    let settings = ctx.get_settings();

    let chosen = program_choices(programs.unwrap_or_default())
        .map_err(|message| StandardGraphqlError::BadUserInput(message).extend())?;
    let form_options = FormInstallOptions {
        programs: chosen,
        take_over: take_over.unwrap_or_default().into_iter().collect(),
        blank_old_ui: blank_old_ui.unwrap_or_default().into_iter().collect(),
    };

    service_provider
        .plugin_service
        .install_uploaded_plugin(&context, settings, UploadedFile { file_id }, form_options)
        .map_err(|e| {
            let formatted = format_error(&e);
            match e {
                InstallUploadedPluginError::FormPlugin(FormPluginInstallError::DatabaseError(
                    _,
                ))
                | InstallUploadedPluginError::UploadedFileJsonError(_)
                | InstallUploadedPluginError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted)
                }
                // A refusal the person installing can act on, with its reason.
                InstallUploadedPluginError::FormPlugin(_) => {
                    StandardGraphqlError::BadUserInput(formatted)
                }
            }
            .extend()
        })
        .map(PluginInfoNode::from_install)
}

#[cfg(test)]
mod test {
    use super::{PluginProgramInput, program_choices};

    fn choice(program_key: &str, program_id: &str) -> PluginProgramInput {
        PluginProgramInput {
            program_key: program_key.to_string(),
            program_id: program_id.to_string(),
        }
    }

    #[test]
    fn a_program_per_key() {
        let chosen = program_choices(vec![
            choice("demo", "program_a"),
            choice("hiv", "program_b"),
        ])
        .unwrap();
        assert_eq!(chosen.len(), 2);
        assert_eq!(chosen["demo"], "program_a");
    }

    #[test]
    fn a_key_chosen_twice_is_refused() {
        let error = program_choices(vec![
            choice("demo", "program_a"),
            choice("demo", "program_b"),
        ])
        .unwrap_err();
        assert!(
            error.contains("\"demo\" twice (program_a and program_b)"),
            "{}",
            error
        );
    }
}
