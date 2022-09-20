"""
Copyright 2022 Objectiv B.V.
"""
from datetime import timedelta

import pandas as pd
import pytest
from numpy import timedelta64

from bach import SeriesTimedelta
from bach.expression import Expression


@pytest.mark.skip_bigquery('Athena specific test; test_supported_value_to_literal() below covers BigQuery')
@pytest.mark.skip_postgres('Athena specific test; test_supported_value_to_literal() below covers Postgres')
def test_supported_value_to_literal_athena(dialect):
    def assert_call(value, expected_token_value: float):
        result = SeriesTimedelta.supported_value_to_literal(dialect, value, dtype=SeriesTimedelta.dtype)
        assert result == Expression.string_value(str(expected_token_value))

    assert_call(timedelta(seconds=1234),                                1234.)
    assert_call(timedelta(seconds=1234, microseconds=1234),             1234.001234)
    assert_call(timedelta(days=5, seconds=1234, microseconds=1234),     433234.001234)
    assert_call(timedelta(days=-5, seconds=1234, microseconds=1234),    -430765.998766)
    assert_call(timedelta(days=365, seconds=1234, microseconds=1234),   31537234.001234)
    assert_call(timedelta(days=50_000, seconds=123, microseconds=9),    4320000123.000009)
    assert_call(pd.Timedelta(nanoseconds=123456789), 0.123457)

    assert_call(timedelta64(1234, 's'),                                                   1234.)
    assert_call(timedelta64(1234, 's') + timedelta64(1234, 'us'),                         1234.001234)
    assert_call(timedelta64(5, 'D') + timedelta64(1234, 's') + timedelta64(1234, 'us'),   433234.001234)
    assert_call(timedelta64(-5, 'D') + timedelta64(1234, 's') + timedelta64(1234, 'us'),  -430765.998766)
    assert_call(timedelta64(365, 'D') + timedelta64(1234, 's') + timedelta64(1234, 'us'), 31537234.001234)
    assert_call(timedelta64(50_000, 'D') + timedelta64(123, 's') + timedelta64(9, 'us'),  4320000123.000009)

    # Special cases: Not-a-Time will be represented as NULL, and NULL itself
    nat = timedelta64('NaT')
    dtype = SeriesTimedelta.dtype
    assert SeriesTimedelta.supported_value_to_literal(dialect, nat, dtype=dtype) == Expression.construct('NULL')
    assert SeriesTimedelta.supported_value_to_literal(dialect, None, dtype=dtype) == Expression.construct('NULL')


@pytest.mark.skip_athena('Athena is skipped because timedelta values are represented with floats.')
def test_supported_value_to_literal(dialect):
    def assert_call(value, expected_token_value: str):
        result = SeriesTimedelta.supported_value_to_literal(dialect, value, dtype=SeriesTimedelta.dtype)
        assert result == Expression.string_value(expected_token_value)

    assert_call(timedelta(seconds=1234),                                'P0DT0H20M34S')
    assert_call(timedelta(seconds=1234, microseconds=1234),             'P0DT0H20M34.001234S')
    assert_call(timedelta(days=5, seconds=1234, microseconds=1234),     'P5DT0H20M34.001234S')
    assert_call(timedelta(days=-5, seconds=1234, microseconds=1234),    'P-5DT0H20M34.001234S')
    assert_call(timedelta(days=365, seconds=1234, microseconds=1234),   'P365DT0H20M34.001234S')
    assert_call(timedelta(days=50_000, seconds=123, microseconds=9),    'P50000DT0H2M3.000009S')
    assert_call(pd.Timedelta(nanoseconds=123456789), 'P0DT0H0M0.123457S')

    assert_call(timedelta64(1234, 's'),                                                   'P0DT0H20M34S')
    assert_call(timedelta64(1234, 's') + timedelta64(1234, 'us'),                         'P0DT0H20M34.001234S')
    assert_call(timedelta64(5, 'D') + timedelta64(1234, 's') + timedelta64(1234, 'us'),   'P5DT0H20M34.001234S')
    assert_call(timedelta64(-5, 'D') + timedelta64(1234, 's') + timedelta64(1234, 'us'),  'P-5DT0H20M34.001234S')
    assert_call(timedelta64(365, 'D') + timedelta64(1234, 's') + timedelta64(1234, 'us'), 'P365DT0H20M34.001234S')
    assert_call(timedelta64(50_000, 'D') + timedelta64(123, 's') + timedelta64(9, 'us'),  'P50000DT0H2M3.000009S')

    # Special cases: Not-a-Time will be represented as NULL, and NULL itself
    nat = timedelta64('NaT')
    dtype = SeriesTimedelta.dtype
    assert SeriesTimedelta.supported_value_to_literal(dialect, nat, dtype=dtype) == Expression.construct('NULL')
    assert SeriesTimedelta.supported_value_to_literal(dialect, None, dtype=dtype) == Expression.construct('NULL')
