use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS vaccination_course;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
               CREATE VIEW vaccination_course AS
    SELECT
      vc.id,
      vc.name AS vaccine_course_name,
      coverage_rate,
      wastage_rate,
      vcd.id AS vaccine_course_dose_id,
      label AS dose_label,
      min_interval_days,
      min_age,
      max_age,
      custom_age_label,
      vci.id AS vaccine_course_item_id,
      item.id AS item_id,
      il.id AS item_link_id,
      item.name AS item_name,
      item.code AS item_code,
      item.type AS item_type,
      item.default_pack_size,
      item.is_vaccine AS is_vaccine_item,
      item.vaccine_doses,
      item.unit_id AS unit_id,
      unit.name AS unit,
      unit."index" AS unit_index,
      d.id AS demographic_id,
      d.name AS demographic_name,
      d.population_percentage AS population_percentage,
      p.id AS program_id,
      p.name AS program_name
    FROM
      vaccine_course vc
      JOIN vaccine_course_dose vcd ON vc.id = vcd.vaccine_course_id
      JOIN vaccine_course_item vci ON vci.vaccine_course_id = vc.id
      JOIN item_link il ON vci.item_link_id = il.id
      JOIN item ON item.id = il.item_id
      LEFT JOIN unit ON item.unit_id = unit.id
      LEFT JOIN demographic d ON d.id = vc.demographic_id
      JOIN PROGRAM p ON p.id = vc.program_id
    WHERE
      vc.deleted_datetime IS NULL
      AND vcd.deleted_datetime IS NULL
      AND vci.deleted_datetime IS NULL;
            "#
        )?;

        Ok(())
    }
}
