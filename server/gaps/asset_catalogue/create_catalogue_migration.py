import csv
import uuid

file_path = 'pqs_catalogue.csv'

codes = {}
classes = {}
categories = {}
types = {}


with open(file_path, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            code = row['Code']
            class_name = row['Class']
            category = row['Category']
            t = row['Type']
            if code not in codes:
                codes[code] = uuid.uuid4()
            code_id = codes[code]
            if class_name not in classes:
                classes[class_name] = uuid.uuid4()
            class_id = classes[class_name]           
            if category not in categories:
                categories[category] = { 'c_id': uuid.uuid4(), 'class_id': class_id}
            category_id = categories[category]["c_id"]
            if t not in types:
                types[t] = { 't_id': uuid.uuid4(), 'class_id': class_id, 'category_id': category_id}
            type_id = types[t]['t_id']

            print(f"INSERT INTO asset_catalogue_item (id, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model ) VALUES ('{uuid.uuid4()}', '{code}', '{class_id}', '{category_id}', '{type_id}', '{row['Manufacturer']}', '{row['Model']}' );")
        
        for key, value in classes.items():
            print(f"INSERT INTO asset_class (id, name) VALUES ('{value}', '{key}');")

        for key, value in categories.items():
            print(f"INSERT INTO asset_category (id, name, asset_class_id) VALUES ('{value['c_id']}', '{key}', '{value['class_id']}');")

        for key, value in types.items():
            print(f"INSERT INTO asset_type (id, name, asset_category_id) VALUES ('{value['t_id']}', '{key}', '{value['category_id']}');")