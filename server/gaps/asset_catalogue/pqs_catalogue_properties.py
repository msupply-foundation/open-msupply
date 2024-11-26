import csv
import uuid
import json

file_path = 'pqs_catalogue.csv'

classes = {
"Cold chain equipment": "fad280b6-8384-41af-84cf-c7b6b4526ef0"
}
categories = {
    "Cold rooms and freezer rooms":"b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d" ,
    "Refrigerators and freezers":"02cbea92-d5bf-4832-863b-c04e093a7760",
    "Insulated containers":"b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d",
}
types = {
    "Cold rooms": "9a4ad0dd-138a-41b2-81df-08772635085e",
    "Freezer rooms": "6d49edfd-a12b-43c8-99fb-3300d67e0192"
}

def validate(value):
    if value == "-":
        return 0
    if value == "User input":
        return None
    if value == "None":
        return None
    if value == "Unknown":
        return None
    if value == "":
        return None
    return value

# Catalogue
# Catalogue Code
# Class name
# Category name
# Type name
# Manufacturer
# Model
# Energy source
# Storage volume +5 °C (Litres)
# Storage volume -20 °C (Litres)
# Storage volume -70 °C (Litres)
# Refrigerant type
# External dimensions WxDxH (cm)
# Waterpack storage capacity (Kg)
# Waterpack freezing capacity per 24 hours (Kg)
# Energy consumption (stable running, continuous power) (kWh per day)
# Energy consumption during freezing (kWh per day),Hold over time (hours)
# Climate zone
# Freeze protection 

with open(file_path, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            code = row['Catalogue Code']
            class_name = row['Class name']
            category = row['Category name']
            t = row['Type name']

            properties = {}

            volume = validate(row['Storage volume +5 °C (Litres)'])
            if(volume != None):
                properties['storage_capacity_5c'] = float(volume)

            volume = validate(row['Storage volume -20 °C (Litres)'])
            if(volume != None):
                properties['storage_capacity_20c'] = float(volume)

            volume = validate(row['Storage volume -70 °C (Litres)'])
            if(volume != None):
                properties['storage_capacity_70c'] = float(volume)

            if(validate(row['Refrigerant type'])):
                properties['refrigerant_type'] = row['Refrigerant type']

            if(validate(row['External dimensions WxDxH (cm)'])):
                properties['external_dimensions'] = row['External dimensions WxDxH (cm)']

            if(validate(row['Waterpack storage capacity (Kg)'])):
                properties['waterpack_storage_capacity'] = float(row['Waterpack storage capacity (Kg)'])

            if(validate(row['Waterpack freezing capacity per 24 hours (Kg)'])):
                properties['waterpack_freezing_capacity'] = float(row['Waterpack freezing capacity per 24 hours (Kg)'])

            if(validate(row['Energy consumption (stable running, continuous power) (kWh per day)'])):
                properties['energy_consumption_stable'] = float(row['Energy consumption (stable running, continuous power) (kWh per day)'])
            
            if(validate(row['Energy consumption during freezing (kWh per day)'])):
                properties['energy_consumption_freezing'] = float(row['Energy consumption during freezing (kWh per day)'])

            if(validate(row['Hold over time (hours)'])):
                properties['hold_over_time'] = float(row['Hold over time (hours)'])

            if(validate(row['Climate zone'])):
                properties['climate_zone'] = row['Climate zone']

            if(validate(row['Freeze protection'])):
                properties['freeze_protection'] = row['Freeze protection']

            if(validate(row['Energy source'])):
                properties['energy_source'] = row['Energy source']

        

            json_properties = json.dumps(properties)

            print(f"UPDATE asset_catalogue_item SET properties = '{json_properties}' WHERE code = '{code}';")
        
