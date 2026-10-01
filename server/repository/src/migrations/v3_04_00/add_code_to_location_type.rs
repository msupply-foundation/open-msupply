use crate::migrations::*;

use diesel::prelude::*;
use std::collections::HashSet;

table! {
    location_type (id) {
        id -> Text,
        name -> Text,
        code -> Text,
    }
}

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_code_to_location_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE location_type ADD COLUMN code TEXT NOT NULL DEFAULT '';
            "#
        )?;

        let rows = location_type::table
            .select((location_type::id, location_type::name))
            .order((location_type::name.asc(), location_type::id.asc()))
            .load::<(String, String)>(connection.lock().connection())?;

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

            diesel::update(location_type::table)
                .filter(location_type::id.eq(id))
                .set(location_type::code.eq(code))
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::prelude::*;

    #[actix_rt::test]
    async fn migration_add_code_to_location_type() {
        let previous_version = v3_02_00::V3_02_00.version();
        let version = v3_04_00::V3_04_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_add_code_to_location_type"),
            version: Some(previous_version),
            ..Default::default()
        })
        .await;

        sql!(
            &connection,
            r#"
            INSERT INTO location_type (id, name, min_temperature, max_temperature)
            VALUES
            ('lt3', 'Cold_Room', 2.0, 8.0),
            ('lt1', 'Cold_Room', 2.0, 8.0),
            ('lt2', 'Freezer', -20.0, -10.0),
            ('lt4', 'Cold_Room_2', 2.0, 8.0);
            "#
        )
        .unwrap();

        migrate(&connection, Some(version), MigrationConfig::default()).unwrap();

        let codes = super::location_type::table
            .select((super::location_type::id, super::location_type::code))
            .order(super::location_type::id.asc())
            .load::<(String, String)>(connection.lock().connection())
            .unwrap();

        assert_eq!(
            codes,
            vec![
                ("lt1".to_string(), "Cold_Room".to_string()),
                ("lt2".to_string(), "Freezer".to_string()),
                ("lt3".to_string(), "Cold_Room_3".to_string()),
                ("lt4".to_string(), "Cold_Room_2".to_string()),
            ]
        );
    }
}
