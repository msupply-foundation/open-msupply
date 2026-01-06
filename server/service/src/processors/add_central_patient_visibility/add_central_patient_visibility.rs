use async_trait::async_trait;
use log::debug;
use repository::{
    ChangelogFilter, ChangelogRow, ChangelogTableName, EqualFilter, KeyType, NameRowRepository,
    NameRowType, NameStoreJoinFilter, NameStoreJoinRepository,
};
use util::format_error;

use crate::{
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    programs::patient::{add_patient_to_oms_central, AddPatientToCentralError},
    service_provider::{ServiceContext, ServiceProvider},
    sync::{ActiveStoresOnSite, CentralServerConfig},
};

const DESCRIPTION: &str = "Add patient visibility to OMS central";

// If name_store_join is created between remote site and a patient (patient made visible on a remote
// site) - add visibility for that patient to OMS Central as well, so OMS central has all required
// patient records and receives appropriate updates via sync.
// See service/programs/patient/README for more info

// If patient is created on remote site, it is possible the patient won't exist on Legacy yet the
// first time this processor is triggered (remote site pushes to OMS Central before Legacy Central).
// Processor would fail after trying to add visibility to  OMS Central via call to Legacy.
// Retry logic doesn't (yet) exist for processors.
// Hence, this processor watches for name changelogs as well as name_store_join. Next time patient
// record is mutated on remote site and pushed to OMS Central, we see we don't have visibility and
// will retry. Not foolproof, but better than nothing for now.

// Processor will exit early once visibility is added to central

pub(crate) struct AddPatientVisibilityForCentral;

#[async_trait]
impl Processor for AddPatientVisibilityForCentral {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    // Only run on central server
    fn should_run(&self) -> bool {
        CentralServerConfig::is_central_server()
    }

    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let name_repo = NameRowRepository::new(&ctx.connection);
        let nsj_repo = NameStoreJoinRepository::new(&ctx.connection);

        let patient = match changelog.table_name {
            ChangelogTableName::Name => {
                debug!(
                    "AddPatientVisibilityForCentral: Processing changelog for name {}",
                    changelog.record_id
                );
                name_repo.find_one_by_id(&changelog.record_id)?.ok_or(
                    ProcessorError::RecordNotFound("Name".to_string(), changelog.record_id.clone()),
                )?
            }
            ChangelogTableName::NameStoreJoin => {
                debug!(
                    "AddPatientVisibilityForCentral: Processing changelog for name_store_join {}",
                    changelog.record_id
                );
                let name_store_join = nsj_repo
                    .query_by_filter(
                        NameStoreJoinFilter::new()
                            .id(EqualFilter::equal_to(changelog.record_id.to_string())),
                    )?
                    .pop()
                    .ok_or(ProcessorError::RecordNotFound(
                        "NameStoreJoin".to_string(),
                        changelog.record_id.clone(),
                    ))?;

                name_store_join.name
            }
            _ => {
                debug!("Not a name or name store join changelog, skipping");
                return Ok(None);
            }
        };

        // Other name types should have their visibility correctly managed via Legacy
        if patient.r#type != NameRowType::Patient {
            debug!("Not a patient name, skipping");
            return Ok(None);
        }

        let central_store_ids = ActiveStoresOnSite::get(&ctx.connection, None)
            .map_err(|err| ProcessorError::GetActiveStoresOnSiteError(err))?
            .store_ids();

        let patient_visible_on_central = nsj_repo
            .query_by_filter(
                NameStoreJoinFilter::new()
                    .name_id(EqualFilter::equal_to(patient.id.to_string()))
                    .store_id(EqualFilter::equal_any(central_store_ids)),
            )?
            .pop()
            .is_some();

        if patient_visible_on_central {
            debug!("Patient already visible on central, skipping");
            return Ok(None);
        }

        let patient_id = patient.id.clone();

        add_patient_to_oms_central(service_provider, ctx, &patient_id)
            .await
            .map_err(|err| match err {
                AddPatientToCentralError::ActiveStoresOnSiteError(err) => {
                    ProcessorError::GetActiveStoresOnSiteError(err)
                }
                _ => ProcessorError::OtherError(format!(
                    "Error adding visibility for patient {} to central: {}",
                    patient_id,
                    format_error(&err)
                )),
            })?;

        let result = format!(
            "Patient visibility added to central for patient {}, records will be received on next sync",
            patient.id
        );

        Ok(Some(result))
    }

    fn changelogs_filter(&self, _ctx: &ServiceContext) -> Result<ChangelogFilter, ProcessorError> {
        let filter = ChangelogFilter::new().table_name(EqualFilter {
            equal_any: Some(vec![
                ChangelogTableName::Name,
                ChangelogTableName::NameStoreJoin,
            ]),
            ..Default::default()
        });

        Ok(filter)
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::AddCentralPatientVisibilityProcessorCursor)
    }
}
