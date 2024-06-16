use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Create the name properties available for GAPS - UI to configure these may come at a later date
    sql!(
        connection,
        r#"
        INSERT INTO property (id, key, name, value_type, allowed_values) VALUES 
          ('supply_level', 'supply_level', 'Supply Level', 'STRING', 'Primary,Sub-National,Lowest Distribution,Service Point'),
          ('facility_type', 'facility_type', 'Facility Type', 'STRING', 'National Vaccine Store,Regional Vaccine Store,Referral Hospital,Municipal Warehouse,Maternal Clinic'),
          ('ownership_type', 'ownership_type', 'Ownership Type', 'STRING', 'Government,NGO,Private,Faith-based'),
          ('population_served', 'population_served', 'Population Served', 'FLOAT', NULL),
          ('electricity_availability', 'electricity_availability', 'Electricity Availability', 'STRING', '> 16 hours,8-16 hours,< 8 hours,No availability'),
          ('solar_availability', 'solar_availability', 'Solar Availability', 'STRING', '> 16 hours,8-16 hours,< 8 hours,No availability'),
          ('gas_availability', 'gas_availability', 'Gas Availability', 'STRING', '> 16 hours,8-16 hours,< 8 hours,No availability'),
          ('kerosene_availability', 'kerosene_availability', 'Kerosene Availability', 'STRING', '> 16 hours,8-16 hours,< 8 hours,No availability');

        INSERT INTO name_property (id, property_id, remote_editable) VALUES 
          ('supply_level', 'supply_level', false),
          ('facility_type', 'facility_type', false),
          ('ownership_type', 'ownership_type', false),
          ('population_served', 'population_served', true),
          ('electricity_availability', 'electricity_availability', true),
          ('solar_availability', 'solar_availability', true),
          ('gas_availability', 'gas_availability', true),
          ('kerosene_availability', 'kerosene_availability', true);
        "#,
    )?;
    Ok(())
}
