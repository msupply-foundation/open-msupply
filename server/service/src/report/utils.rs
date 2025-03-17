use repository::{FormSchemaJson, Report};

use crate::{
    json_translate::crawl_and_translate,
    localisations::{Localisations, TranslationError},
};

pub(crate) fn translate_report_arugment_schema(
    Report {
        report_row,
        argument_schema,
    }: Report,
    translation_service: &Box<Localisations>,
    user_language: &str,
) -> Result<Report, TranslationError> {
    let Some(argument_schema) = argument_schema else {
        return Ok(Report {
            report_row,
            argument_schema: None,
        });
    };

    let mut json_schema = argument_schema.json_schema;
    crawl_and_translate(&mut json_schema, translation_service, user_language)?;
    let mut ui_schema = argument_schema.ui_schema;
    crawl_and_translate(&mut ui_schema, translation_service, user_language)?;

    let argument_schema = Some(FormSchemaJson {
        json_schema,
        ui_schema,
        ..argument_schema
    });

    Ok(Report {
        report_row,
        argument_schema,
    })
}
