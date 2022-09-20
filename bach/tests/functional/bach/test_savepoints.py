"""
Copyright 2021 Objectiv B.V.
"""
from typing import List

import pytest
from sqlalchemy.future import Engine

from bach.savepoints import Savepoints, CreatedObject
from sql_models.model import Materialization
from tests.functional.bach.test_data_and_utils import get_df_with_test_data, assert_equals_data


@pytest.mark.skip_athena_todo()
@pytest.mark.skip_bigquery_todo()
def test_add_savepoint(engine):
    df = get_df_with_test_data(engine=engine)
    sps = Savepoints()
    sps.add_savepoint('test', df, Materialization.TABLE)
    df2 = df.groupby('municipality').min()
    df2.materialize(inplace=True)
    sps.add_savepoint('test2', df2, Materialization.TABLE)

    # Assert that we can get a copy of the original dataframes back again
    assert sps.get_df('test') is not df
    assert sps.get_df('test') == df
    assert sps.get_df('test2') is not df2
    assert sps.get_df('test2') == df2
    # Assert that we can get all savepoints
    assert len(sps.all) == 2


@pytest.mark.skip_athena_todo()
@pytest.mark.skip_bigquery_todo()
def test_add_savepoint_double(engine):
    df = get_df_with_test_data(engine=engine)
    sps = Savepoints()
    df = df.materialize()
    sps.add_savepoint('first', df, Materialization.TABLE)
    with pytest.raises(Exception, match='Another savepoint has the same base_node'):
        sps.add_savepoint('second', df, Materialization.QUERY)


@pytest.mark.skip_athena_todo()
@pytest.mark.skip_bigquery_todo()
def test_write_to_db_queries_only(engine, testrun_uid):
    df = get_df_with_test_data(engine=engine)
    engine = df.engine
    sps = Savepoints()
    sps.add_savepoint('the_name', df, Materialization.QUERY)
    result = sps.write_to_db(engine)
    assert result == []
    df = df[df.skating_order < 3]
    df = df.materialize()
    sps.add_savepoint('second_point', df, Materialization.QUERY)
    result = sps.write_to_db(engine)
    assert result == []

    # assert that the second_point doesn't assume anything has been materialized and just works
    df_use_materialized = sps.get_materialized_df('second_point')
    assert df_use_materialized.to_pandas().values.tolist() == df.to_pandas().values.tolist()
    assert_equals_data(
        df_use_materialized,
        expected_columns=[
            '_index_skating_order', 'skating_order', 'city', 'municipality', 'inhabitants', 'founding'
        ],
        expected_data=[
             [1, 1, 'Ljouwert', 'Leeuwarden', 93485, 1285],
             [2, 2, 'Snits', 'Súdwest-Fryslân', 33520, 1456]
        ]
    )


@pytest.mark.skip_athena_todo()
@pytest.mark.skip_bigquery_todo()
def test_write_to_db_create_objects(engine, testrun_uid: str):
    dialect = engine.dialect
    df = get_df_with_test_data(engine)
    engine = df.engine
    sps = Savepoints()

    df = df.materialize()
    sps.add_savepoint(f'sp_first_point_{testrun_uid}', df, Materialization.TABLE)

    # reduce df to one row and add savepoint
    df = df[df.skating_order == 1]
    df = df.materialize()
    sps.add_savepoint(f'sp_second_point_{testrun_uid}', df, Materialization.VIEW)

    # Change columns in df and add savepoint
    df = df[['skating_order', 'city', 'founding']]
    df['x'] = 12345
    df = df.materialize()
    sps.add_savepoint(f'sp_third_point_{testrun_uid}', df, Materialization.TABLE)

    # No changes, add query
    df = df.materialize()
    sps.add_savepoint(f'sp_final_point', df, Materialization.QUERY)

    expected_columns = ['_index_skating_order', 'skating_order', 'city', 'founding', 'x']
    expected_data = [[1, 1, 'Ljouwert', 1285, 12345]]

    generated_statements = sps.to_sql(dialect)
    name_to_sql = {stat.name: stat.sql for stat in generated_statements}

    assert name_to_sql['sp_final_point'].replace('\n', '') == \
           'select ' \
           '"_index_skating_order" as "_index_skating_order", ' \
           '"skating_order" as "skating_order", ' \
           '"city" as "city", ' \
           '"founding" as "founding", ' \
           '"x" as "x" ' \
           'from ' \
           f'"sp_third_point_{testrun_uid}"      '

    # get_materialized_df assumes that all tables and views have been created, so this will not yet work
    df_use_materialized = sps.get_materialized_df('sp_final_point')
    with pytest.raises(Exception, match=f'relation "sp_third_point_{testrun_uid}" does not exist'):
        assert_equals_data(df_use_materialized, expected_columns, expected_data)

    expected_created = [
        CreatedObject(f'sp_first_point_{testrun_uid}', Materialization.TABLE),
        CreatedObject(f'sp_second_point_{testrun_uid}', Materialization.VIEW),
        CreatedObject(f'sp_third_point_{testrun_uid}', Materialization.TABLE),
    ]

    result = sps.write_to_db()
    assert result == expected_created
    # now that 'sp_third_point' exists, the df from `et_materialized_df('sp_final_point')` should work too
    assert_equals_data(df_use_materialized, expected_columns, expected_data)

    with pytest.raises(Exception):
        # We expect a DB exception if we try to recreate the same tables/views
        sps.write_to_db()

    # Recreating with overwrite=True should work tho, as that drops the tables/views first
    result = sps.write_to_db(overwrite=True)
    assert result == expected_created

    # Test clean up:
    # TODO: make test clean-up robust to failures half-way
    remove_created_db_objects(engine, result)


def remove_created_db_objects(engine: Engine, created_objects: List[CreatedObject]):
    """ Utility function: remove the tables and views that were created. """
    with engine.connect() as conn:
        for object in reversed(created_objects):
            if object.materialization == Materialization.TABLE:
                conn.execute(f'drop table "{object.name}";')
            elif object.materialization == Materialization.VIEW:
                conn.execute(f'drop view "{object.name}";')
            else:
                raise Exception("unhandled case")
