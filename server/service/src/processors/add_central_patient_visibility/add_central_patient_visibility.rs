use log::debug;
use repository::{
    ChangelogFilter, ChangelogRow, ChangelogTableName, EqualFilter, KeyType, NameRowType,
    NameStoreJoinFilter, NameStoreJoinRepository,
};

use crate::{
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
    sync::CentralServerConfig,
};

const DESCRIPTION: &str = "Add patient visibility to OMS central";

// OMS remote sites may sync patient records to OMS central - meaning these patients
// end up visible in OMS Central UI (if is dispensary).
// At this point, we should call Legacy mSupply to add visibility for the patient to
// OMS Central - to ensure OMS Central has all related patient records, and receives
// appropriate updates via sync
// See service/programs/patient/README for more info

pub(crate) struct AddPatientVisibilityForCentral;

impl Processor for AddPatientVisibilityForCentral {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    // Only run on central server
    fn should_run(&self) -> bool {
        CentralServerConfig::is_central_server()
    }

    fn try_process_record(
        &self,
        ctx: &ServiceContext,
        _service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        debug!(
            "AddPatientVisibilityForCentral: Processing name_store_join changelog {}",
            changelog.record_id
        );

        let repo = NameStoreJoinRepository::new(&ctx.connection);

        let patient = repo
            .query_by_filter(
                NameStoreJoinFilter::new().id(EqualFilter::equal_to(&changelog.record_id)),
            )?
            .pop()
            .ok_or(ProcessorError::RecordNotFound(
                "NameStoreJoin".to_string(),
                changelog.record_id.clone(),
            ))?;

        // Other name types should have their visibility correctly managed via Legacy
        if patient.name.r#type != NameRowType::Patient {
            debug!("Not a patient name, skipping");
            return Ok(None);
        }

        let patient_visible_on_central = repo
            .query_by_filter(
                NameStoreJoinFilter::new().name_id(EqualFilter::equal_to(&patient.name.id)),
            )?
            .pop()
            .is_some();

        if patient_visible_on_central {
            debug!("Patient already visible on central, skipping");
            return Ok(None);
        }

        let result = format!(
            "Patient visibility added to central for patient {}",
            patient.name.id
        );

        Ok(Some(result))
    }

    fn changelogs_filter(&self, _ctx: &ServiceContext) -> Result<ChangelogFilter, ProcessorError> {
        let filter = ChangelogFilter::new().table_name(EqualFilter {
            equal_to: Some(ChangelogTableName::NameStoreJoin),
            ..Default::default()
        });

        Ok(filter)
    }

    fn cursor_type(&self) -> KeyType {
        KeyType::AddCentralPatientVisibilityProcessorCursor
    }
}
