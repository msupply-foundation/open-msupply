import csv
import json
from helpers import *
from gaps_insert_functions import *

pqs_vaccine_lookup_file = 'pqs_vaccine_lookup.json'
item_id_lookup_file = 'item_id_lookup.json'
diluent_id_lookup_file = 'diluent_id_lookup.json'
item_variants_file_path = 'gaps_item_variants.csv'

item_variant_lookup = {}
item_id_lookup = {}
diluent_item_id_lookup = {}

item_id_inserted = {}
diluent_id_insert = {}

# A python function to generate ids for, item, item_variant, and diluent
# The item, and diluent ids are generated based on the VaccineTypeName
# The item_variant and diluent_variant ids is generated based on the PQSVaccineID
def generate_ids(row):
    item_code = row['VaccineTypeName']
    if item_code not in item_id_lookup:
        item_id_lookup[item_code] = str(uuid.uuid4())
    item_id = item_id_lookup[item_code]
    item_variant_id = str(uuid.uuid4())
    if item_code not in diluent_item_id_lookup:
        diluent_item_id_lookup[item_code] = str(uuid.uuid4())
    diluent_id = diluent_item_id_lookup[item_code]
    dillient_variant_id = str(uuid.uuid4())
    return {"item_id": item_id, "item_variant_id": item_variant_id, "diluent_id": diluent_id, "dillient_variant_id": dillient_variant_id}



# Load saved data
with open(pqs_vaccine_lookup_file, 'r') as file:
    item_variant_lookup = json.load(file)

with open(item_id_lookup_file, 'r') as file:
    item_id_lookup = json.load(file)

with open(diluent_id_lookup_file, 'r') as file:
    diluent_id_lookup = json.load(file)

# Main csv processing loop
with open(item_variants_file_path, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            pqs_vaccine_id = row['PQSVaccineID']
            if pqs_vaccine_id not in item_variant_lookup:
                item_variant_lookup[pqs_vaccine_id] = generate_ids(row)
            ids = item_variant_lookup[pqs_vaccine_id]
            
            # Insert the item
            item_id = ids['item_id']
            if item_id not in item_id_inserted:
                upsert_item_stmt(item_id, row)
                item_id_inserted[item_id] = True

            # # Insert the item_variant
            # upsert_item_variant_stmt(ids['item_variant_id'], item_id, row)
            
            # # Insert the diulent (item)
            # diluent_id = ids['diluent_id']
            # if row['DiluentBundled'] == 'No':
            #     # ironically dillient not bundled, means we need to bundle it...
            #     if diluent_id not in item_id_inserted and row['DiluentBundled'] == 'No':
            #         upsert_dilluent_stmt(diluent_id, row)
            #         diluent_id_insert[diluent_id] = True
            #     # Create the item_variant for the diluent
            #     upsert_diluent_variant_stmt(ids["diluent_variant_id"], diluent_id, row)


# save the generated ids to a file
with open(pqs_vaccine_lookup_file, 'w') as file:
    json.dump(item_variant_lookup, file)

with open(item_id_lookup_file, 'w') as file:
    json.dump(item_id_lookup, file)

with open(diluent_id_lookup_file, 'w') as file:
    json.dump(diluent_item_id_lookup, file)

