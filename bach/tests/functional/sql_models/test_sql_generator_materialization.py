"""
Copyright 2021 Objectiv B.V.
"""
from typing import List, Any, Tuple, Dict, Optional

import pytest
from sqlalchemy.engine import Engine

from sql_models.graph_operations import find_node, replace_node_in_graph
from sql_models.model import Materialization
from sql_models.sql_generator import to_sql_materialized_nodes, GeneratedSqlStatement
from tests.unit.sql_models.util import ValueModel, RefModel, JoinModel, RefValueModel


@pytest.mark.skip_athena_todo()
@pytest.mark.skip_bigquery_todo()
def test_execute_multi_statement_sql_materialization(engine):
    # Graph, with values calculated by the query shown above each node
    #
    #                                              16
    #    1       6             16      16     /-- rm2 <--\     40
    #   vm1 <-- rvm1 <--+--- rvm2 <-- rm1 <--+     24     +-- graph
    #                    \                    \-- jm2 <--/
    #                     \     8                 /
    #                      +-- jm1 <-------------/
    #              2      /
    #            vm2 <---/
    #

    dialect = engine.dialect
    # Create original graph, with all materializations as CTE
    vm1 = ValueModel.build(key='a', val=1)
    rvm1 = RefValueModel.build(ref=vm1, val=5)
    rvm2 = RefValueModel.build(ref=rvm1, val=10)
    rm1 = RefModel.build(ref=rvm2)
    rm2 = RefModel.build(ref=rm1)
    vm2 = ValueModel.build(key='a', val=2)
    jm1 = JoinModel.build(ref_left=vm2, ref_right=rvm1)
    jm2 = JoinModel.build(ref_left=jm1, ref_right=rm1)
    graph = JoinModel.build(ref_left=jm2, ref_right=rm2).copy_set_materialization_name('graph')

    # Expected output of the query
    expected_columns = ['key', 'value']
    expected_values = [['a', 40]]
    expected = expected_columns, expected_values
    # Verify that the model's query gives the expected output
    sql_statements = to_sql_materialized_nodes(dialect=dialect, start_node=graph, include_start_node=True)
    assert len(sql_statements) == 1
    result = run_queries(engine=engine, sql_statements=sql_statements)
    assert result['graph'] == expected

    # Test: modify materialization of node 'jm2' in the graph
    reference_path = find_node(start_node=graph, function=lambda n: n is jm2).reference_path
    jm2_replacement = jm2.copy_set_materialization(Materialization.TEMP_TABLE)
    graph = replace_node_in_graph(
        start_node=graph,
        reference_path=reference_path,
        replacement_model=jm2_replacement
    )
    # Verify that the model's query gives the expected output
    sql_statements = to_sql_materialized_nodes(dialect, graph)
    assert len(sql_statements) == 2
    result = run_queries(engine=engine, sql_statements=sql_statements)
    assert result['graph'] == expected

    # Test: modify materialization of nodes 'jm1' and 'rvm2' in the graph
    graph = replace_node_in_graph(
        start_node=graph,
        reference_path=find_node(start_node=graph, function=lambda n: n is jm1).reference_path,
        replacement_model=jm1.copy_set_materialization(Materialization.VIEW)
    )
    graph = replace_node_in_graph(
        start_node=graph,
        reference_path=find_node(start_node=graph, function=lambda n: n is rvm2).reference_path,
        replacement_model=rvm2.copy_set_materialization(Materialization.TABLE)
    )
    # Verify that the model's query gives the expected output
    sql_statements = to_sql_materialized_nodes(dialect, graph)
    assert len(sql_statements) == 4
    result = run_queries(engine=engine, sql_statements=sql_statements)
    assert result['graph'] == expected

    # Test: modify materialization of nodes 'rvm1' in the graph, to 'QUERY' meaning it should be a separate
    # query, but also a CTE for other queries
    graph = replace_node_in_graph(
        start_node=graph,
        reference_path=find_node(start_node=graph, function=lambda n: n is rvm1).reference_path,
        replacement_model=rvm1.copy_set_materialization(Materialization.QUERY)
    )
    # Verify that the model's query gives the expected output
    sql_statements = to_sql_materialized_nodes(dialect, graph)
    assert len(sql_statements) == 5
    result = run_queries(engine=engine, sql_statements=sql_statements)
    assert result == {
        'JoinModel___217a4aca3f6eb18bcd833bb6d8fc4953': None,
        'JoinModel___3e090538453c4ba34d586639715a3db2': None,
        'RefValueModel___58764d28c32cf9c71fee32f9055194f2': None,
        'RefValueModel___f1f66ce5c1f6c9cf2539f09daace1565': (
            ['key', 'value'],
            [['a', 6]]
        ),
        'graph': (
            ['key', 'value'],
            [['a', 40]]
        )
    }


@pytest.mark.skip_athena_todo()
@pytest.mark.skip_bigquery_todo()
def test_materialized_shared_ctes(engine):
    # Graph: jm1 and jm2 are materialized, vm2 is shared between the two
    #    1
    #   vm1 <---\     3
    #            +-- jm1* <--\
    #     2      /             \    8
    #   vm2 <--+               +-- graph
    #           \      5       /
    #     3       +-- jm2* <--/
    #   vm3 <---/

    dialect = engine.dialect
    # Create original graph, with all materializations as CTE
    vm1 = ValueModel.build(key='a', val=1)
    vm2 = ValueModel.build(key='a', val=2)
    vm3 = ValueModel.build(key='a', val=3)
    jm1 = JoinModel.build(ref_left=vm2, ref_right=vm1)\
        .copy_set_materialization(Materialization.TEMP_TABLE)\
        .copy_set_materialization_name('jm1')
    jm2 = JoinModel.build(ref_left=vm3, ref_right=vm2)\
        .copy_set_materialization(Materialization.TEMP_TABLE)\
        .copy_set_materialization_name('jm2')
    graph = JoinModel.build(ref_left=jm2, ref_right=jm1).copy_set_materialization_name('graph')

    # Verify that the model's query gives the expected output
    sql_statements = to_sql_materialized_nodes(dialect, graph)
    assert len(sql_statements) == 3
    result = run_queries(engine=engine, sql_statements=sql_statements)
    assert result == {
        'graph': (
            ['key', 'value'],
            [['a', 8]]  # (1 + 2) + (2 + 3) = 3 + 5 = 8
        ),
        'jm1': None,
        'jm2': None
    }


def run_queries(
    engine: Engine,
    sql_statements: List[GeneratedSqlStatement]
) -> Dict[str, Optional[Tuple[List[str], List[List[Any]]]]]:
    """
    Execute all sql statements and return a dictionary with the result of each. The statements will be
    executed inside a transaction that will be rolled back, which will any table/view create statements.
    All statements are executed in the order in which they are in the dictionary.

    :param sql_statements: Dict mapping a name to a sql statements. Sql statemetns should not contain any
        transactions begin/commit/rollback statements.
    :return: Dictionary, one entry for each entry in sql_statements, matching names.
        Each value is either one of two options:
            1) None, in case the sql-statement didn't return anything.
            2) A tuple with two fields:
                1) List of column-names
                2) List of rows, with each row being a list of values
    """
    if not sql_statements:
        raise ValueError('Expected non-empty dictionary')
    result = {}

    with engine.connect() as conn:
        with conn.begin() as transaction:
            for sql_statement in sql_statements:
                name = sql_statement.name
                sql = sql_statement.sql
                print(f'\n{sql}\n')
                # escape sql, as conn.execute will think that '%' indicates a parameter
                sql = sql.replace('%', '%%')
                res = conn.execute(sql)
                column_names = list(res.keys())
                if not column_names:
                    result[name] = None
                else:
                    db_values = [list(row) for row in res]
                    result[name] = (column_names, db_values)

            # rollback. This will remove any tables or views that we might have created.
            transaction.rollback()
            return result
