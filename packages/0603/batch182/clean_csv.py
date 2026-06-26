import csv
import json
import os
import re
import sys
from datetime import datetime

DATE_PATTERNS = [
    (re.compile(r'^\d{4}/\d{1,2}/\d{1,2}$'), '%Y/%m/%d'),
    (re.compile(r'^\d{1,2}/\d{1,2}/\d{4}$'), '%m/%d/%Y'),
    (re.compile(r'^\d{4}-\d{1,2}-\d{1,2}$'), '%Y-%m-%d'),
    (re.compile(r'^\d{1,2}-\d{1,2}-\d{4}$'), '%m-%d-%Y'),
    (re.compile(r'^\d{4}\.\d{1,2}\.\d{1,2}$'), '%Y.%m.%d'),
    (re.compile(r'^\d{1,2}\.\d{1,2}\.\d{4}$'), '%d.%m.%Y'),
]

DATE_KEYWORDS = re.compile(
    r'date|time|日期|时间|birth|born|created|updated|modified|start|end',
    re.IGNORECASE,
)


def try_parse_date(value):
    for pattern, fmt in DATE_PATTERNS:
        if pattern.match(value):
            try:
                return datetime.strptime(value, fmt).strftime('%Y-%m-%d')
            except ValueError:
                continue
    return None


def is_date_column(header):
    return bool(DATE_KEYWORDS.search(header))


def validate_int(value):
    try:
        int(value)
        return None
    except (ValueError, TypeError):
        return f"expected integer, got '{value}'"


def validate_float(value):
    try:
        float(value)
        return None
    except (ValueError, TypeError):
        return f"expected float, got '{value}'"


def validate_string(value, min_len=None, max_len=None, pattern=None):
    if not isinstance(value, str):
        return f"expected string, got type {type(value).__name__}"
    if min_len is not None and len(value) < min_len:
        return f"length {len(value)} < min length {min_len}"
    if max_len is not None and len(value) > max_len:
        return f"length {len(value)} > max length {max_len}"
    if pattern is not None and not re.match(pattern, value):
        return f"does not match pattern '{pattern}'"
    return None


def validate_date(value, fmt='%Y-%m-%d'):
    try:
        datetime.strptime(value, fmt)
        return None
    except (ValueError, TypeError):
        return f"expected date format '{fmt}', got '{value}'"


def validate_enum(value, allowed):
    if value not in allowed:
        return f"value '{value}' not in allowed set {allowed}"
    return None


def validate_against_schema(cleaned_row, schema):
    errors = []
    for col, rules in schema.get('columns', {}).items():
        val = cleaned_row.get(col, '')
        dtype = rules.get('type')
        if dtype == 'integer':
            err = validate_int(val)
            if err:
                errors.append(f"{col}: {err}")
        elif dtype == 'float':
            err = validate_float(val)
            if err:
                errors.append(f"{col}: {err}")
        elif dtype == 'string':
            min_len = rules.get('min_length')
            max_len = rules.get('max_length')
            pattern = rules.get('pattern')
            err = validate_string(val, min_len, max_len, pattern)
            if err:
                errors.append(f"{col}: {err}")
        elif dtype == 'date':
            fmt = rules.get('format', '%Y-%m-%d')
            err = validate_date(val, fmt)
            if err:
                errors.append(f"{col}: {err}")
        elif dtype == 'enum':
            allowed = rules.get('values', [])
            err = validate_enum(val, allowed)
            if err:
                errors.append(f"{col}: {err}")
    return errors


def is_row_all_empty(row, headers):
    for header in headers:
        val = row.get(header, '')
        if val is not None and str(val).strip() != '':
            return False
    return True


def clean_value(val, header):
    if isinstance(val, str):
        val = val.strip()
    else:
        val = str(val).strip() if val is not None else ''

    if val == '':
        return 'N/A'

    if is_date_column(header) and val != 'N/A':
        parsed = try_parse_date(val)
        if parsed is not None:
            return parsed

    return val


def clean_row(row, headers):
    if is_row_all_empty(row, headers):
        return None
    return {header: clean_value(row.get(header, ''), header) for header in headers}


def load_schema(schema_path):
    if not schema_path or not os.path.exists(schema_path):
        return None
    with open(schema_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def clean_csv(input_path, output_path, schema_path=None):
    schema = load_schema(schema_path)
    errors_path = os.path.join(os.path.dirname(output_path), 'errors.csv') if output_path else 'errors.csv'

    with open(input_path, 'r', newline='', encoding='utf-8-sig') as fin, \
         open(output_path, 'w', newline='', encoding='utf-8-sig') as fout:
        reader = csv.DictReader(fin)
        headers = reader.fieldnames
        if headers is None:
            print('Error: CSV file is empty or has no header.', file=sys.stderr)
            sys.exit(1)

        writer = csv.DictWriter(fout, fieldnames=headers)
        writer.writeheader()

        error_writer = None
        error_headers = headers + ['_errors']
        error_file = None
        error_count = 0

        if schema:
            error_file = open(errors_path, 'w', newline='', encoding='utf-8-sig')
            error_writer = csv.DictWriter(error_file, fieldnames=error_headers)
            error_writer.writeheader()

        valid_count = 0
        for row in reader:
            result = clean_row(row, headers)
            if result is None:
                continue

            if schema:
                validation_errors = validate_against_schema(result, schema)
                if validation_errors:
                    error_row = dict(result)
                    error_row['_errors'] = '; '.join(validation_errors)
                    error_writer.writerow(error_row)
                    error_count += 1
                    continue

            writer.writerow(result)
            valid_count += 1

        if error_file:
            error_file.close()

    if schema:
        print(f'Valid: {valid_count} rows -> {output_path}')
        print(f'Errors: {error_count} rows -> {errors_path}')
    else:
        print(f'Cleaned {valid_count} rows -> {output_path}')


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Clean and validate CSV files')
    parser.add_argument('input_csv', help='Input CSV file path')
    parser.add_argument('output_csv', nargs='?', help='Output CSV file path (default: *_cleaned.csv)')
    parser.add_argument('--schema', default='schema.json', help='Schema JSON file path (default: schema.json)')
    args = parser.parse_args()

    input_file = args.input_csv
    output_file = args.output_csv if args.output_csv else input_file.rsplit('.', 1)[0] + '_cleaned.csv'
    clean_csv(input_file, output_file, args.schema)
