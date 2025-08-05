import os
import re

def replace_inline_init_in_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Regex to match inline_init blocks
    # Example: inline_init(|r: &mut Type| { ... })
    pattern = re.compile(
        r'inline_init\s*\(\s*\|\s*r\s*:\s*&mut\s*([A-Za-z0-9_]+)\s*\|\s*\{([^}]*)\}\s*\)',
        re.DOTALL
    )

    def replacer(match):
        struct_type = match.group(1)
        body = match.group(2)
        # Find assignments: r.field = value;
        assignments = re.findall(r'r\.([A-Za-z0-9_]+)\s*=\s*([^;]+);', body)
        fields = []
        for field, value in assignments:
            # Use .clone() for variables (simple heuristic: if value is a variable or function call)
            value = value.strip()
            if re.match(r'^[A-Za-z_][A-Za-z0-9_\.]*$', value):
                value = f"{value}.clone()"
            fields.append(f"{field}: {value}")
        # Add Default::default() for remaining fields
        struct_init = f"{struct_type} {{ " + ', '.join(fields) + ", ..Default::default() }}"
        return struct_init

    new_content = pattern.sub(replacer, content)

    with open(file_path, 'w') as f:
        f.write(new_content)

def replace_inline_init_in_workspace(root_dir):
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith('.rs'):
                file_path = os.path.join(dirpath, filename)
                replace_inline_init_in_file(file_path)

# Usage: set your workspace root directory here
replace_inline_init_in_workspace('.')
