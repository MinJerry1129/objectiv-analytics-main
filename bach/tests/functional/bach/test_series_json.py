"""
Copyright 2021 Objectiv B.V.
"""
import pandas

from bach import DataFrame
from bach.series import SeriesString, SeriesDict, SeriesList
from sql_models.util import is_postgres, is_bigquery, is_athena
from tests.functional.bach.test_data_and_utils import get_df_with_json_data, assert_equals_data, \
    get_df_with_test_data
import pytest

# We want to run all tests here for all supported databases, and thus we have the 'engine' argument on all
# tests.
# Additionally, on Postgres we have two json dtypes: 'json' and 'jsonb' that should support the same
# operations. Therefore, we also have the 'dtype' argument. On all other databases than postgres we skip
# the tests for dtype 'jsonb' as those databases only support 'json'

pytestmark = [
    pytest.mark.parametrize('dtype', ('json', 'json_postgres'), indirect=True),
]


@pytest.fixture()
def dtype(engine, request):
    if request.param == 'json_postgres' and not is_postgres(engine):
        pytest.skip(msg='json_postgres dtype is only supported on Postgres. Skipping for other databases')
    return request.param


def test_json_get_value(engine, dtype):
    bt = get_df_with_json_data(engine=engine, dtype=dtype)
    bt['get_val_dict'] = bt.dict_column.json.get_value('c')
    bt['get_val_dict_str'] = bt.dict_column.json.get_value('c', as_str=True)
    bt['get_val_mixed'] = bt.mixed_column.json.get_value('a')
    bt['get_val_mixed_str'] = bt.mixed_column.json.get_value('a', as_str=True)
    bt = bt[['get_val_dict', 'get_val_dict_str', 'get_val_mixed', 'get_val_mixed_str']]

    # When using `as_str=True`. The returned value is a string. But there is no canonical way to represent
    # json as a string, so different databases might return different things.
    # To work around that the JsonDictMagivStrValue compares equal to two strings.
    class JsonDictMagivStrValue:
        def __eq__(self, other):
            return other == '{"a": "c"}' or other == '{"a":"c"}'
    magic_value = JsonDictMagivStrValue()

    assert_equals_data(
        bt,
        use_to_pandas=True,
        expected_columns=[
            '_index_row', 'get_val_dict', 'get_val_dict_str', 'get_val_mixed', 'get_val_mixed_str'
        ],
        expected_data=[
            [0, None, None, 'b', 'b'],
            [1, None, None, None, None],
            [2, {'a': 'c'}, magic_value, 'b', 'b'],
            [3, None, None, None, None],
            [4, None, None, None, None]
        ]

    )
    assert bt.dtypes['get_val_dict'] == 'json'
    assert bt.dtypes['get_val_dict_str'] == 'string'
    assert bt.dtypes['get_val_mixed'] == 'json'
    assert bt.dtypes['get_val_mixed_str'] == 'string'


def test_json_get_single_value(engine, dtype):
    bt = get_df_with_json_data(engine=engine, dtype=dtype)
    a = bt.mixed_column[2]
    assert a == {'a': 'b', 'c': {'a': 'c'}}


def test_json_equals(engine, dtype):
    df = get_df_with_json_data(engine=engine, dtype=dtype)
    df['j2j_dict'] = df['dict_column'] == df['dict_column']
    df['j2literal'] = df['list_column'] == '[{"a": "b"}, {"c": "d"}]'
    assert_equals_data(
        df[['j2j_dict', 'j2literal']],
        expected_columns=['_index_row', 'j2j_dict', 'j2literal'],
        expected_data=[
            [0, True, True],
            [1, True, False],
            [2, True, False],
            [3, True, False],
            [4, None, None]
        ]
    )


def test_json_array_contains(engine, dtype):
    # Setting up custom test data
    # The data from `get_df_with_json_data` only contains one row with an array with scalars, so we use this
    # custom test data instead.
    test_data = [
        [0, '["a", "b", "c", "d"]'],
        [1, '[0, 1, 2, 3, 4]'],
        [2, '[true, true, true, true, true]'],
        [3, '[true, true, false, true, true]'],
        [4, '[0.1, 1.1, 1.337, 4.123, 123.456]'],
        [5, '[-0.1, -1.1, -1.337, -4.123, -123.456]'],
        [6, '["a", true, 3, -1.337, null]'],
        [7, None],
        [8, '[]'],
    ]
    pdf = pandas.DataFrame.from_records(test_data, columns=['index', 'column'])
    pdf.set_index(pdf.columns[0], drop=True, inplace=True)
    df = DataFrame.from_pandas(engine=engine, df=pdf, convert_objects=True)
    df['column'] = df.column.astype(dtype)
    df = df.materialize()
    # Done setting up custom test data

    # Actual test below
    df['a'] = df.column.json.array_contains('a')
    df['b'] = df.column.json.array_contains('b')
    df['e'] = df.column.json.array_contains('e')
    df['one'] = df.column.json.array_contains(1)
    df['three'] = df.column.json.array_contains(3)
    df['five'] = df.column.json.array_contains(5)
    df['true'] = df.column.json.array_contains(True)
    df['false'] = df.column.json.array_contains(False)
    df['f1_1'] = df.column.json.array_contains(1.1)
    df['f_1_337'] = df.column.json.array_contains(-1.337)
    df['none'] = df.column.json.array_contains(None)
    df = df.drop(columns=['column'])
    assert_equals_data(
        df,
        expected_columns=['_index_index',
                          'a', 'b', 'e', 'one', 'three', 'five', 'true', 'false', 'f1_1', 'f_1_337', 'none'],
        expected_data=[
            [0, True,  True,  False, False, False, False, False, False, False, False, False],
            [1, False, False, False, True,  True,  False, False, False, False, False, False],
            [2, False, False, False, False, False, False, True,  False, False, False, False],
            [3, False, False, False, False, False, False, True,  True,  False, False, False],
            [4, False, False, False, False, False, False, False, False, True,  False, False],
            [5, False, False, False, False, False, False, False, False, False, True,  False],
            [6, True,  False, False, False, True,  False, True,  False, False, True,  True ],
            [7, None,  None,  None,  None,  None,  None,  None,  None,  None,  None,  None ],
            [8, False, False, False, False, False, False, False, False, False, False, False]
        ]
    )


def test_json_getitem(engine, dtype):
    bt = get_df_with_json_data(engine=engine, dtype=dtype)
    bt = bt[['mixed_column']]
    bt['get_0'] = bt.mixed_column.json[0]
    bt['get_min3'] = bt.mixed_column.json[-3]
    bt['get_min4'] = bt.mixed_column.json[-4]  # Should be the same as json[0] for row 0 and 4
    bt['get_min5'] = bt.mixed_column.json[-5]  # -5 doesn't exist, we expect to get `None`
    bt['get_a'] = bt.mixed_column.json["a"]
    bt = bt.drop(columns=['mixed_column'])
    assert_equals_data(
        bt,
        use_to_pandas=True,
        expected_columns=['_index_row', 'get_0', 'get_min3', 'get_min4', 'get_min5', 'get_a'],
        expected_data=[
            [0, None, None, None, None, "b"],
            [1, "a", "b", "a", None, None],
            [2, None, None, None, None, "b"],
            [3,
             {"_type": "WebDocumentContext", "id": "#document"},
             {"_type": "SectionContext", "id": "home"},
             {"_type": "WebDocumentContext", "id": "#document"},
             None,
             None],
            [4, None, None, None, None, None]
        ]
    )


def test_json_getitem_special_chars(engine, dtype):
    # We support 'special' characters, except for double quotes because of limitations in BigQuery
    # see comments in bach.series.series_json.JsonBigQueryAccessor.get_value for more information
    df = get_df_with_json_data(engine=engine, dtype=dtype)
    df = df[['row']].sort_index()[:1].materialize()
    data = {
        'test.test': 'a',
        'test': {'test': 'b'},
        '123test': 'c',
        '[{}@!{R#(!@(!': 'd',
        '"double quote is "not" allowed"': 'e',
    }
    df['data'] = data
    df = df.materialize()
    df['select_a'] = df['data'].json['test.test']
    df['select_b'] = df['data'].json['test'].json['test']
    df['select_c'] = df['data'].json['123test']
    df['select_d'] = df['data'].json['[{}@!{R#(!@(!']
    assert_equals_data(
        df,
        use_to_pandas=True,
        expected_columns=['_index_row', 'row', 'data', 'select_a', 'select_b', 'select_c', 'select_d'],
        expected_data=[[0, 0, data, 'a', 'b', 'c', 'd']]
    )

    with pytest.raises(ValueError, match='key values containing double quotes are not supported'):
        df['select_e'] = df['data'].json['"double quote is "not" allowed"']


def test_json_getitem_slice(engine, dtype):
    bt = get_df_with_json_data(engine=engine, dtype=dtype)
    bt = bt[['list_column']]
    bt['one_to_end'] = bt.list_column.json[1:]
    bt['one_to_minus_one'] = bt.list_column.json[1:-1]
    bt['end_to_end'] = bt.list_column.json[:]
    bt = bt.drop(columns=['list_column'])

    # for readability we define the expected output per column, format: [row_id, expected_data]
    expected_one_to_end = [
        [0, [{"c": "d"}]],
        [1, ["b", "c", "d"]],
        [2, [{"_type": "c", "id": "d"}, {"_type": "e", "id": "f"}]],
        [3, [{"_type": "SectionContext", "id": "home"}, {"_type": "SectionContext", "id": "top-10"},
             {"_type": "ItemContext", "id": "5o7Wv5Q5ZE"}]],
        [4, []]
    ]
    expected_one_to_minus_one = [
        [0, []],
        [1, ["b", "c"]],
        [2, [{"_type": "c", "id": "d"}]],
        [3, [{"_type": "SectionContext", "id": "home"}, {"_type": "SectionContext", "id": "top-10"}]],
        [4, []]
    ]
    expected_end_to_end = [
        [0, [{'a': 'b'}, {'c': 'd'}]],
        [1, ['a', 'b', 'c', 'd']],
        [2, [{'id': 'b', '_type': 'a'}, {'id': 'd', '_type': 'c'}, {'id': 'f', '_type': 'e'}]],
        [3, [
            {'id': '#document', '_type': 'WebDocumentContext'},
            {'id': 'home', '_type': 'SectionContext'},
            {'id': 'top-10', '_type': 'SectionContext'}, {'id': '5o7Wv5Q5ZE', '_type': 'ItemContext'}]],
        [4, []]
    ]
    expected_data = [
        [i, expected_one_to_end[i][1], expected_one_to_minus_one[i][1], expected_end_to_end[i][1]]
        for i in range(5)
    ]
    assert_equals_data(
        bt,
        use_to_pandas=True,
        expected_columns=['_index_row', 'one_to_end', 'one_to_minus_one', 'end_to_end'],
        expected_data=expected_data
    )


def test_json_getitem_slice_non_happy_mixed_data(engine, dtype):
    # Slices only work on columns with only lists
    # But behaviour of Postgres and Athena is different from BigQuery. For now we just accept that's the
    # way it is.
    bt = get_df_with_json_data(engine=engine, dtype=dtype)
    bts = bt.mixed_column.json[1:-1]
    if is_postgres(engine) or is_athena(engine):
        with pytest.raises(Exception):
            bts.to_pandas()
    elif is_bigquery(engine):
        assert_equals_data(
            bts,
            use_to_pandas=True,
            expected_columns=['_index_row', 'mixed_column'],
            expected_data=[
                [0, []],
                [1, ["b", "c"]],
                [2, []],
                [3, [{"_type": "SectionContext", "id": "home"}, {"_type": "SectionContext", "id": "top-10"}]],
                [4, []]
            ]
        )
    else:
        raise Exception(f'Test does not support {engine.name}')


# tests below are for functions kind of specific to the objectiv (location) stack
def test_json_getitem_query(engine, dtype):
    bt = get_df_with_json_data(engine=engine, dtype=dtype)
    bt = bt[['list_column']]
    bt['a'] = bt.list_column.json[{"_type": "SectionContext"}: ]
    bt['b'] = bt.list_column.json[1:{"id": "d"}]
    bt['c'] = bt.list_column.json[{'_type': 'a'}: {'id': 'd'}]
    bt = bt.drop(columns=['list_column'])

    # if dict in slice is contained in any of the dicts in the json list, the first index of the first match
    # is returned to the slice.
    assert_equals_data(
        bt,
        use_to_pandas=True,
        expected_columns=['_index_row', 'a', 'b', 'c'],
        expected_data=[
            [0, [],
                [],
                []
            ], [1,
                [],
                [],
                []
            ], [2,
                [],
                [{'id': 'd', '_type': 'c'}],
                [{'id': 'b', '_type': 'a'}, {'id': 'd', '_type': 'c'}]
            ], [3,
                [{"_type": "SectionContext", "id": "home"}, {"_type": "SectionContext", "id": "top-10"},
                 {"_type": "ItemContext", "id": "5o7Wv5Q5ZE"}],
                [],
                []
            ], [4,
                [],
                [],
                []
            ]
        ]
    )


def test_json_get_array_length(engine, dtype):
    df = get_df_with_json_data(engine=engine, dtype=dtype)
    s = df.list_column.json.get_array_length()
    assert_equals_data(
        s,
        expected_columns=['_index_row', 'list_column'],
        expected_data=[
            [0, 2],
            [1, 4],
            [2, 3],
            [3, 4],
            [4, None]
        ]
    )


def test_json_flatten_array(engine, dtype):
    df = get_df_with_json_data(engine=engine, dtype=dtype)

    list_column = df['list_column']

    result_item, result_offset = list_column.json.flatten_array()
    result_item = result_item.sort_by_series(
        by=[result_item.index['_index_row'], result_offset]
    )
    assert_equals_data(
        result_item,
        expected_columns=['_index_row', 'list_column'],
        expected_data=[
            [0, {'a': 'b'}],
            [0, {'c': 'd'}],
            [1, 'a'],
            [1, 'b'],
            [1, 'c'],
            [1, 'd'],
            [2, {'id': 'b', '_type': 'a'}],
            [2, {'id': 'd', '_type': 'c'}],
            [2, {'id': 'f', '_type': 'e'}],
            [3, {'id': '#document', '_type': 'WebDocumentContext'}],
            [3, {'id': 'home', '_type': 'SectionContext'}],
            [3, {'id': 'top-10', '_type': 'SectionContext'}],
            [3, {'id': '5o7Wv5Q5ZE', '_type': 'ItemContext'}],
        ],
        use_to_pandas=True,
    )

def test_complex_types_astype_json(engine, dtype):

    if is_athena(engine) or is_postgres(engine):
        # not supported on those platforms.
        return None

    df = get_df_with_test_data(engine)[['skating_order']]
    df = df.sort_index()[:1].materialize()
    struct = {
        'a': 123,
        'b': 'test',
        'c': 123.456,
    }
    struct_dtype = {'a': 'int64', 'b': 'string', 'c': 'float64'}
    llist = [
        'a', 'b', 'c'
    ]
    llist_dtype = [SeriesString.dtype]
    df['struct'] = SeriesDict.from_value(base=df, value=struct, name='struct', dtype=struct_dtype)
    df['list'] = SeriesList.from_value(base=df, value=llist, name='list', dtype=llist_dtype)
    df['struct_json'] = df['struct'].astype(dtype)
    df['list_json'] = df['list'].astype(dtype)
    assert_equals_data(
        df,
        expected_columns=['_index_skating_order', 'skating_order',
                          'struct', 'list',
                          'struct_json', 'list_json'],
        expected_data=[[1, 1,
                        {'a': 123, 'b': 'test', 'c': 123.456}, ['a', 'b', 'c'],
                        '{"a":123,"b":"test","c":123.456}', '["a","b","c"]']]
    )