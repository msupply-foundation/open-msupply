import csv
import re
import json

###### THIS SCRIPT WAS USED TO GENERATE ITEM CODES FOR VACCINE ITEMS IT IS NOT INTENDED TO BE RUN AGAIN ######

item_variants_file_path = 'gaps_item_variants.csv'

code_lookup = {}
old_code = {}
code_matched = {}


id_lookup_file = 'id_lookup.json'

id_lookup = {}

item_id_inserted = {}

# Load saved data
try:
    with open(id_lookup_file, 'r') as file:
        id_lookup = json.load(file)
except:
    print("No id_lookup file found, starting fresh")


def create_prefix(vaccine_type_name, mSupply_item_name):

    if(len(vaccine_type_name) <= 5):
        return vaccine_type_name.upper().replace(",", "")

    prefix = prefix=mSupply_item_name[0:3].upper()
    if "DTwP" in vaccine_type_name:
        prefix = f"DTWwP{len(vaccine_type_name)}"


    if "Tetanus Toxoid" in mSupply_item_name:
        prefix = f"{prefix}-TT"
    
    if "ACYWX" in mSupply_item_name:
        prefix = f"{prefix}-X"

    # Find anything in brackets/clarifyer
    m = re.search(r"\((.*)\)", vaccine_type_name)
    if m:
        prefix = f"{prefix}{len(m.group(1))}"
    return prefix


def create_presentation(presentation):
    # print(presentation)
    presentation_section = ""
    if "vial set" in  presentation.lower():
        presentation_section = "VS"
    elif "vial" in presentation.lower():
        presentation_section="V"
    if "ampoule" in presentation.lower():
        presentation_section = presentation_section + "A"
    if "prefilled syringe" in presentation.lower():
        presentation_section = presentation_section + "S"
    if "uniject" in presentation.lower():
        presentation_section = presentation_section + "U"
    if "plastic tube" == presentation.lower():
        presentation_section = presentation_section + "PT"
    if "buffer sachet" in presentation.lower():
        presentation_section = presentation_section + "BS"

    if len(presentation_section) == 0:
        presentation_section = len(presentation)

    # print(presentation_section)
    return presentation_section


# Main csv processing loop
with open(item_variants_file_path, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:

            item_name = row['mSupply item name']
            
            first_part = create_prefix(row["VaccineTypeName"],row['mSupply item name'])
            middle = create_presentation(row['Presentation'])
            last = row['DosesCount']

            code = f"{first_part}-{middle}-{last}"

            # code = row['mSupply item code']
            if code in code_lookup:
                if code_lookup[code] != row['mSupply item name']:
                    print(f"Duplicate code, {code}, \"{code_lookup[code]}\" , \"{row['mSupply item name']}\"")
            code_lookup[code] = row['mSupply item name']
            old_code[code] = row['mSupply item code']

            if not row['mSupply item code'] in code_matched:
                if row['mSupply item code'] in id_lookup:
                    id_lookup[code] = id_lookup[row['mSupply item code']]
                    code_matched[row['mSupply item code']] = True
                else:
                    print(f"Missing code {row['mSupply item code']}")
                
for key, value in code_lookup.items():
    old_code_value =  old_code[key]
    print(f"\"{value}\",\"{key}\", \"{old_code_value}\"")


# save the generated ids to a file
with open(id_lookup_file, 'w') as file:
    json.dump(id_lookup, file)