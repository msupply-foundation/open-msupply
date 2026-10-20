use crate::migrations::*;

use diesel::prelude::*;
use std::collections::HashSet;

table! {
    campaign (id) {
        id -> Text,
        name -> Text,
        code -> Text,
    }
}

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_code_to_campaign"
    }

    // Campaigns get a code for other systems to match on (e.g. the OpenLMIS program), so the
    // name can be what users want to read. Until now integrations matched on the name, so the
    // code starts as the name — renaming a campaign afterwards doesn't break the match.
    // The start and end dates were never used, so they go.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE campaign ADD COLUMN code TEXT NOT NULL DEFAULT '';
            "#
        )?;

        let rows = campaign::table
            .select((campaign::id, campaign::name))
            .order((campaign::name.asc(), campaign::id.asc()))
            .load::<(String, String)>(connection.lock().connection())?;

        // Names are unique among live campaigns, but deleted ones can repeat them
        let all_names: HashSet<String> = rows.iter().map(|(_, name)| name.clone()).collect();
        let mut assigned: HashSet<String> = HashSet::new();
        for (id, name) in &rows {
            let code = if assigned.insert(name.clone()) {
                name.clone()
            } else {
                let mut suffix = 2;
                loop {
                    let candidate = format!("{name}_{suffix}");
                    if !all_names.contains(&candidate) && assigned.insert(candidate.clone()) {
                        break candidate;
                    }
                    suffix += 1;
                }
            };

            diesel::update(campaign::table)
                .filter(campaign::id.eq(id))
                .set(campaign::code.eq(code))
                .execute(connection.lock().connection())?;
        }

        sql!(
            connection,
            r#"
            ALTER TABLE campaign DROP COLUMN start_date;
            ALTER TABLE campaign DROP COLUMN end_date;
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::prelude::*;

    #[actix_rt::test]
    async fn migration_add_code_to_campaign() {
        let previous_version = v3_03_01::V3_03_01.version();
        let version = v3_04_00::V3_04_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_add_code_to_campaign"),
            version: Some(previous_version),
            ..Default::default()
        })
        .await;

        sql!(
            &connection,
            r#"
            INSERT INTO campaign (id, name, start_date, end_date, deleted_datetime)
            VALUES
            ('c1', 'RI', '2026-01-01', '2026-12-31', NULL),
            ('c2', 'COVAX', NULL, NULL, NULL),
            ('c3', 'RI', NULL, NULL, '2025-01-01 00:00:00');
            "#
        )
        .unwrap();

        migrate(&connection, Some(version), MigrationConfig::default()).unwrap();

        let codes = super::campaign::table
            .select((super::campaign::id, super::campaign::code))
            .order(super::campaign::id.asc())
            .load::<(String, String)>(connection.lock().connection())
            .unwrap();

        assert_eq!(
            codes,
            vec![
                ("c1".to_string(), "RI".to_string()),
                ("c2".to_string(), "COVAX".to_string()),
                ("c3".to_string(), "RI_2".to_string()),
            ]
        );
    }
}
