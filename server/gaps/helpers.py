import uuid


# A python function to create a cold_storage_type_id lookup query based on the 
# VaccineStorageTemperature one of `2-8°C`, `-20°C`, `-70°C`
def cold_storage_type_id_lookup(storage_temp):
    if storage_temp == '2-8°C':
        return '(SELECT id FROM cold_storage_type WHERE name = \'+5\' or min_temperature = 2 and max_temperature = 8 LIMIT 1)'
    elif storage_temp == '-20°C':
        return '(SELECT id FROM cold_storage_type WHERE name = \'-20\' or min_temperature = -20 and max_temperature = -20 LIMIT 1)'
    elif storage_temp == '-70°C':
        return '(SELECT id FROM cold_storage_type WHERE name = \'-70\' or min_temperature = -70 and max_temperature = -70 LIMIT 1)'
    else:
        return 'null'


def create_master_list():
    print("INSERT INTO master_list (id, name, code, description, is_active) VALUES ('43491ce9-bc89-4ee5-988d-9dbb2856e398', 'gaps_items', 'gaps_items', 'All Items automatically create for Cold Chain Gap Analysis', true) ON CONFLICT DO NOTHING;")
    print("INSERT INTO master_list_name_join (id, master_list_id, name_link_id) SELECT uuid_in(md5(random()::text || random()::text)::cstring), '43491ce9-bc89-4ee5-988d-9dbb2856e398', id FROM name_link WHERE id NOT IN (select name_link_id from master_list_name_join WHERE master_list_id = '43491ce9-bc89-4ee5-988d-9dbb2856e398');")


def get_or_generate_ids(lookup_hash, row):
    
    # item_variant_id
    item_variant_lookup_id = row['PQSVaccineID']
    if item_variant_lookup_id == '':
        item_variant_lookup_id = "iv_" + row['VaccineTypeName'] + "_" + row['CommercialName'] + "_" + row['DosesCount']
    if item_variant_lookup_id not in lookup_hash:
        lookup_hash[item_variant_lookup_id] = str(uuid.uuid4())
        
    item_variant_id = lookup_hash[item_variant_lookup_id]


    # item_id 
    item_code = row['VaccineTypeName']
    if item_code not in lookup_hash:
        lookup_hash[item_code] = str(uuid.uuid4())

    item_id = lookup_hash[item_code]

    # diluent_id
    diluent_item_code = row['VaccineTypeName'] + "_diluent"
    if diluent_item_code not in lookup_hash:
        lookup_hash[diluent_item_code] = str(uuid.uuid4())

    diluent_id = lookup_hash[diluent_item_code]

    # diluent_variant_id
    diluent_variant_lookup_id = item_variant_lookup_id + "_diluent"
    if diluent_variant_lookup_id not in lookup_hash:
        lookup_hash[diluent_variant_lookup_id] = str(uuid.uuid4())

    diluent_variant_id = lookup_hash[diluent_variant_lookup_id]

    # item_bundle_id
    item_bundle_lookup_id = item_variant_lookup_id + "_bundle"
    if item_bundle_lookup_id not in lookup_hash:
        lookup_hash[item_bundle_lookup_id] = str(uuid.uuid4())

    item_bundle_id = lookup_hash[item_bundle_lookup_id]

    # Packaging Variants
    packaging_variant_1_lookup_id = item_variant_lookup_id + "_packaging_1"
    if packaging_variant_1_lookup_id not in lookup_hash:
        lookup_hash[packaging_variant_1_lookup_id] = str(uuid.uuid4())
    packaging_variant_1_id = lookup_hash[packaging_variant_1_lookup_id]

    packaging_variant_2_lookup_id = item_variant_lookup_id + "_packaging_2"
    if packaging_variant_2_lookup_id not in lookup_hash:
        lookup_hash[packaging_variant_2_lookup_id] = str(uuid.uuid4())
    packaging_variant_2_id = lookup_hash[packaging_variant_2_lookup_id]

    packaging_variant_3_lookup_id = item_variant_lookup_id + "_packaging_3"
    if packaging_variant_3_lookup_id not in lookup_hash:
        lookup_hash[packaging_variant_3_lookup_id] = str(uuid.uuid4())
    packaging_variant_3_id = lookup_hash[packaging_variant_3_lookup_id]


    return {"item_id": item_id, "item_variant_id": item_variant_id, "diluent_id": diluent_id, "diluent_variant_id": diluent_variant_id, "item_bundle_id": item_bundle_id, "packaging_variant_1_id": packaging_variant_1_id, "packaging_variant_2_id": packaging_variant_2_id, "packaging_variant_3_id": packaging_variant_3_id}