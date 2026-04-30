use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS vaccination_card;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW vaccination_card AS
    SELECT
      vcd.id || '_' || pe.id AS id,
      vcd.id as vaccine_course_dose_id,
      vcd.label,
      vcd.min_interval_days,
      vcd.min_age,
      vcd.max_age,
      vcd.custom_age_label,
      vc.id as vaccine_course_id,
      vc.can_skip_dose,
      v.id as vaccination_id,
      v.vaccination_date,
      v.given,
      v.stock_line_id,
      n.id AS facility_name_id,
      v.facility_free_text,
      s.batch,
      pe.id as program_enrolment_id
    FROM vaccine_course_dose vcd
    JOIN vaccine_course vc
      ON vcd.vaccine_course_id = vc.id
    JOIN program_enrolment pe
      ON pe.program_id = vc.program_id
    LEFT JOIN vaccination v
      ON v.vaccine_course_dose_id = vcd.id AND v.program_enrolment_id = pe.id
    LEFT JOIN name_link nl
      ON v.facility_name_link_id = nl.id
    LEFT JOIN name n
      ON nl.name_id = n.id
    LEFT JOIN stock_line s
      ON v.stock_line_id = s.id
    -- Only show doses that haven't been deleted, unless they have a vaccination
    WHERE vcd.deleted_datetime IS NULL OR v.id IS NOT NULL;
            "#
        )?;

        Ok(())
    }
}
