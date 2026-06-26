import csv
import json
import os

import pytest

from clean_csv import (
    clean_csv,
    clean_row,
    clean_value,
    is_date_column,
    is_row_all_empty,
    try_parse_date,
    validate_against_schema,
    validate_date,
    validate_enum,
    validate_float,
    validate_int,
    validate_string,
)


class TestEmptyValueReplacement:
    def test_empty_string_becomes_na(self):
        assert clean_value('', 'name') == 'N/A'

    def test_whitespace_only_becomes_na(self):
        assert clean_value('   ', 'name') == 'N/A'

    def test_none_becomes_na(self):
        assert clean_value(None, 'name') == 'N/A'

    def test_non_empty_value_kept(self):
        assert clean_value('hello', 'name') == 'hello'

    def test_value_with_spaces_trimmed(self):
        assert clean_value('  hello  ', 'name') == 'hello'

    def test_clean_row_empty_all_fields(self):
        row = {'name': '', 'age': '', 'city': ''}
        assert clean_row(row, ['name', 'age', 'city']) is None

    def test_clean_row_whitespace_only(self):
        row = {'name': '   ', 'age': '  ', 'city': '\t'}
        assert clean_row(row, ['name', 'age', 'city']) is None

    def test_clean_row_partial_empty(self):
        row = {'name': 'Alice', 'age': '', 'city': ''}
        result = clean_row(row, ['name', 'age', 'city'])
        assert result is not None
        assert result['name'] == 'Alice'
        assert result['age'] == 'N/A'
        assert result['city'] == 'N/A'

    def test_is_row_all_empty_all_empty(self):
        row = {'a': '', 'b': '', 'c': None}
        assert is_row_all_empty(row, ['a', 'b', 'c']) is True

    def test_is_row_all_empty_has_value(self):
        row = {'a': '', 'b': 'x', 'c': ''}
        assert is_row_all_empty(row, ['a', 'b', 'c']) is False


class TestDateFormatting:
    def test_slash_ymd(self):
        assert try_parse_date('2024/1/5') == '2024-01-05'

    def test_slash_mdy(self):
        assert try_parse_date('01/31/2024') == '2024-01-31'

    def test_dash_ymd(self):
        assert try_parse_date('2024-06-03') == '2024-06-03'

    def test_dash_mdy(self):
        assert try_parse_date('12-25-2024') == '2024-12-25'

    def test_dot_ymd(self):
        assert try_parse_date('2024.3.15') == '2024-03-15'

    def test_non_date_returns_none(self):
        assert try_parse_date('not-a-date') is None

    def test_is_date_column_keyword(self):
        assert is_date_column('birth_date') is True
        assert is_date_column('created_time') is True
        assert is_date_column('update_date') is True
        assert is_date_column('日期') is True

    def test_is_not_date_column(self):
        assert is_date_column('name') is False
        assert is_date_column('age') is False

    def test_clean_value_auto_format_date(self):
        assert clean_value('2024/1/5', 'birth_date') == '2024-01-05'

    def test_clean_value_no_format_non_date_col(self):
        assert clean_value('2024/1/5', 'comment') == '2024/1/5'

    def test_clean_value_na_not_parsed_as_date(self):
        assert clean_value('', 'birth_date') == 'N/A'


class TestErrorRowCapture:
    def test_validate_int_pass(self):
        assert validate_int('42') is None

    def test_validate_int_fail(self):
        assert validate_int('abc') is not None

    def test_validate_float_pass(self):
        assert validate_float('3.14') is None

    def test_validate_float_fail(self):
        assert validate_float('xyz') is not None

    def test_validate_string_pass(self):
        assert validate_string('hello', min_len=1, max_len=10) is None

    def test_validate_string_too_short(self):
        assert validate_string('ab', min_len=3) is not None

    def test_validate_string_too_long(self):
        assert validate_string('abcdefghijk', max_len=5) is not None

    def test_validate_string_pattern_pass(self):
        assert validate_string('ABC', pattern=r'^[A-Z]+$') is None

    def test_validate_string_pattern_fail(self):
        assert validate_string('abc', pattern=r'^[A-Z]+$') is not None

    def test_validate_date_pass(self):
        assert validate_date('2024-01-15') is None

    def test_validate_date_fail(self):
        assert validate_date('not-a-date') is not None

    def test_validate_enum_pass(self):
        assert validate_enum('男', ['男', '女']) is None

    def test_validate_enum_fail(self):
        assert validate_enum('other', ['男', '女']) is not None

    def test_validate_against_schema_mixed(self):
        schema = {
            'columns': {
                'age': {'type': 'integer'},
                'name': {'type': 'string', 'max_length': 5},
            }
        }
        valid_row = {'age': '25', 'name': 'Alice'}
        assert validate_against_schema(valid_row, schema) == []

        invalid_row = {'age': 'abc', 'name': 'VeryLongName'}
        errors = validate_against_schema(invalid_row, schema)
        assert len(errors) == 2
        assert any('age' in e for e in errors)
        assert any('name' in e for e in errors)


class TestCleanCsvIntegration:
    def _write_csv(self, path, headers, rows):
        with open(path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)

    def _read_csv(self, path):
        with open(path, 'r', newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            return list(reader)

    def test_empty_value_replacement(self, tmp_path):
        input_file = tmp_path / 'input.csv'
        output_file = tmp_path / 'output.csv'
        self._write_csv(str(input_file), ['name', 'age', 'city'], [
            {'name': 'Alice', 'age': '30', 'city': ''},
            {'name': '', 'age': '', 'city': ''},
            {'name': 'Bob', 'age': '', 'city': 'NYC'},
        ])
        clean_csv(str(input_file), str(output_file))
        rows = self._read_csv(str(output_file))
        assert len(rows) == 2
        assert rows[0]['city'] == 'N/A'
        assert rows[0]['name'] == 'Alice'
        assert rows[1]['age'] == 'N/A'

    def test_all_empty_row_removed(self, tmp_path):
        input_file = tmp_path / 'input.csv'
        output_file = tmp_path / 'output.csv'
        self._write_csv(str(input_file), ['name', 'age'], [
            {'name': 'Alice', 'age': '30'},
            {'name': '', 'age': ''},
            {'name': 'Bob', 'age': '25'},
        ])
        clean_csv(str(input_file), str(output_file))
        rows = self._read_csv(str(output_file))
        assert len(rows) == 2
        assert rows[0]['name'] == 'Alice'
        assert rows[1]['name'] == 'Bob'

    def test_date_formatting(self, tmp_path):
        input_file = tmp_path / 'input.csv'
        output_file = tmp_path / 'output.csv'
        self._write_csv(str(input_file), ['name', 'birth_date'], [
            {'name': 'Alice', 'birth_date': '2024/1/5'},
            {'name': 'Bob', 'birth_date': '12-25-2023'},
            {'name': 'Charlie', 'birth_date': '2024.06.03'},
        ])
        clean_csv(str(input_file), str(output_file))
        rows = self._read_csv(str(output_file))
        assert rows[0]['birth_date'] == '2024-01-05'
        assert rows[1]['birth_date'] == '2023-12-25'
        assert rows[2]['birth_date'] == '2024-06-03'

    def test_schema_validation_errors(self, tmp_path):
        input_file = tmp_path / 'input.csv'
        output_file = tmp_path / 'output.csv'
        schema_file = tmp_path / 'schema.json'

        schema = {
            'columns': {
                'id': {'type': 'integer'},
                'name': {'type': 'string', 'max_length': 5},
                'score': {'type': 'float'},
            }
        }
        with open(str(schema_file), 'w', encoding='utf-8') as f:
            json.dump(schema, f)

        self._write_csv(str(input_file), ['id', 'name', 'score'], [
            {'id': '1', 'name': 'Alice', 'score': '95.5'},
            {'id': 'abc', 'name': 'VeryLongName', 'score': 'xyz'},
            {'id': '2', 'name': 'Bob', 'score': '88.0'},
        ])
        clean_csv(str(input_file), str(output_file), str(schema_file))

        valid_rows = self._read_csv(str(output_file))
        assert len(valid_rows) == 2
        assert valid_rows[0]['name'] == 'Alice'
        assert valid_rows[1]['name'] == 'Bob'

        errors_path = str(tmp_path / 'errors.csv')
        error_rows = self._read_csv(errors_path)
        assert len(error_rows) == 1
        assert 'id' in error_rows[0]['_errors']
        assert 'name' in error_rows[0]['_errors']
        assert 'score' in error_rows[0]['_errors']

    def test_schema_validation_enum(self, tmp_path):
        input_file = tmp_path / 'input.csv'
        output_file = tmp_path / 'output.csv'
        schema_file = tmp_path / 'schema.json'

        schema = {
            'columns': {
                'name': {'type': 'string'},
                'gender': {'type': 'enum', 'values': ['男', '女']},
            }
        }
        with open(str(schema_file), 'w', encoding='utf-8') as f:
            json.dump(schema, f)

        self._write_csv(str(input_file), ['name', 'gender'], [
            {'name': 'Alice', 'gender': '女'},
            {'name': 'Bob', 'gender': 'unknown'},
        ])
        clean_csv(str(input_file), str(output_file), str(schema_file))

        valid_rows = self._read_csv(str(output_file))
        assert len(valid_rows) == 1
        assert valid_rows[0]['gender'] == '女'

        errors_path = str(tmp_path / 'errors.csv')
        error_rows = self._read_csv(errors_path)
        assert len(error_rows) == 1
        assert 'gender' in error_rows[0]['_errors']

    def test_no_schema_no_errors_file(self, tmp_path):
        input_file = tmp_path / 'input.csv'
        output_file = tmp_path / 'output.csv'
        self._write_csv(str(input_file), ['name'], [
            {'name': 'Alice'},
        ])
        clean_csv(str(input_file), str(output_file), schema_path=None)
        errors_path = str(tmp_path / 'errors.csv')
        assert not os.path.exists(errors_path)

    def test_whitespace_stripped(self, tmp_path):
        input_file = tmp_path / 'input.csv'
        output_file = tmp_path / 'output.csv'
        self._write_csv(str(input_file), ['name', 'age'], [
            {'name': '  Alice  ', 'age': ' 30 '},
        ])
        clean_csv(str(input_file), str(output_file))
        rows = self._read_csv(str(output_file))
        assert rows[0]['name'] == 'Alice'
        assert rows[0]['age'] == '30'
