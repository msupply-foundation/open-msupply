use anyhow::Context;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use util::sync_serde::ok_or_none;

use crate::{migrations::*, sync_buffer::sync_buffer, GenderType, SyncAction};

#[derive(Deserialize, Serialize)]
pub struct ClinicianOmsFields {
    #[serde(default)]
    #[serde(deserialize_with = "ok_or_none")]
    pub gender: Option<GenderType>,
}

#[derive(Deserialize, Serialize)]
struct LegacyClinicianRow {
    female: bool,
    oms_fields: Option<ClinicianOmsFields>,
}

table! {
  clinician (id) {
    id -> Text,
    gender -> Nullable<crate::GenderTypeMapping>,
  }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = clinician)]
pub struct ClinicianRow {
    pub id: String,
    pub gender: Option<GenderType>,
}

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "reintegrate_clinician_gender"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let sync_buffer_rows = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("clinician")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (id, data) in sync_buffer_rows {
            let legacy_row = serde_json::from_str::<LegacyClinicianRow>(&data)
                .with_context(|| format!("Cannot parse sync buffer row data: {}", data))?;

            let Some(fields) = legacy_row.oms_fields else {
                continue;
            };

            if let Some(gender) = fields.gender {
                diesel::update(clinician::table)
                    .filter(clinician::id.eq(id))
                    .set(clinician::gender.eq(gender))
                    .execute(connection.lock().connection())?;
            }
        }

        Ok(())
    }
}
