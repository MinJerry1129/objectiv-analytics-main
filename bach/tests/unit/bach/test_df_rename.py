"""
Copyright 2021 Objectiv B.V.
"""
import pytest

from tests.unit.bach.util import get_fake_df_test_data, get_fake_df


def test_rename_basic(dialect):
    bt = get_fake_df_test_data(dialect)

    nbt = bt.rename(columns={'founding': 'fnd'})
    assert 'founding' not in nbt.data.keys()
    assert 'fnd' in nbt.data.keys()
    assert 'founding' in bt.data.keys()
    assert 'fnd' not in bt.data.keys()
    assert bt.founding.expression == nbt.fnd.expression


def test_rename_self(dialect):
    # rename to self
    bt = get_fake_df_test_data(dialect)
    nbt = bt.rename(columns={'city': 'city'})
    assert 'city' in nbt.data.keys()
    assert 'city' in bt.data.keys()


def test_rename_check_order(dialect):
    # regression guard: make sure the order of columns is correct
    bt = get_fake_df_test_data(dialect)
    nbt = bt.rename(columns={'city': 'city', 'municipality': 'muni', 'founding': 'fnd'})
    assert 'city' in nbt.data.keys()
    assert 'city' in bt.data.keys()
    assert nbt.data_columns == ['skating_order', 'city', 'muni', 'inhabitants', 'fnd']


def test_rename_swap(dialect):
    bt = get_fake_df_test_data(dialect)
    expr_inhabitants = bt.inhabitants.expression
    expr_city = bt.city.expression
    nbt = bt.rename(columns={'city': 'inhabitants', 'inhabitants': 'city'})
    assert 'city' in nbt.data.keys()
    assert 'inhabitants' in nbt.data.keys()
    assert nbt.city.expression == expr_inhabitants
    assert nbt.inhabitants.expression == expr_city


def test_rename_multiple(dialect):
    bt = get_fake_df_test_data(dialect)
    nbt = bt.rename(columns={'founding': 'fnd', 'city': 'cty'})
    assert 'founding' not in nbt.data.keys()
    assert 'fnd' in nbt.data.keys()
    assert 'founding' in bt.data.keys()
    assert 'fnd' not in bt.data.keys()
    assert 'city' not in nbt.data.keys()
    assert 'cty' in nbt.data.keys()
    assert 'city' in bt.data.keys()
    assert 'cty' not in bt.data.keys()


def test_rename_mapper_dict(dialect):
    bt = get_fake_df_test_data(dialect)
    nbt = bt.rename(mapper={'city': 'cty'}, axis=1)
    assert 'city' not in nbt.data.keys()
    assert 'cty' in nbt.data.keys()
    assert 'city' in bt.data.keys()
    assert 'cty' not in bt.data.keys()


def test_rename_mapper_function(dialect):
    bt = get_fake_df_test_data(dialect)
    nbt = bt.rename(mapper=lambda x: x[::-1], axis=1)
    assert 'city' not in nbt.data.keys()
    assert 'ytic' in nbt.data.keys()
    assert 'city' in bt.data.keys()
    assert 'ytic' not in bt.data.keys()


def test_rename_mapper_self(dialect):
    bt = get_fake_df_test_data(dialect)
    expr = bt.city.expression
    bt = get_fake_df_test_data(dialect)
    nbt = bt.rename(mapper=lambda x: x, axis=1)
    assert 'city' in nbt.data.keys()
    assert 'city' in bt.data.keys()
    assert bt.city.expression == expr


def test_rename_ignore_errors(dialect):
    bt = get_fake_df_test_data(dialect)
    bt.rename(columns={'non existing column': 'new name'}, errors='ignore')

    with pytest.raises(KeyError):
        bt.rename(columns={'non existing column': 'new name'}, errors='raise')


def test_rename_fail_on_duplicate_columns(dialect):
    bt = get_fake_df(dialect, ['i', 'ii'], ['a', 'b'])

    with pytest.raises(ValueError, match='column name already exists'):
        bt.rename(columns={'a': 'b'})
    with pytest.raises(ValueError, match='column name already exists'):
        bt.rename(columns={'b': 'a'})
    with pytest.raises(ValueError, match='column name already exists'):
        bt.rename(columns={'a': 'c', 'b': 'c'})
    with pytest.raises(ValueError, match='column name already exists'):
        bt.rename(columns={'a': 'i'})


def test_rename_invalid_column_name(dialect):
    bt = get_fake_df(dialect, ['i'], ['a', 'b'])
    too_long_name = 'test' * 100
    with pytest.raises(ValueError, match='Column name ".*" is not valid for SQL dialect'):
        bt.rename(columns={'a': too_long_name})
