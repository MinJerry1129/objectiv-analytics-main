from sql_models.util import is_bigquery
from tests.unit.bach.util import get_fake_df


def test_window_row_number(dialect):
    left = get_fake_df(dialect, ['a'], ['b', 'c'])
    series_b = left['b']

    w = left.sort_values(by='b', ascending=True).window()
    result = series_b.window_row_number(w)

    result_sql = result.expression.to_sql(dialect)
    if is_bigquery(dialect):
        assert result_sql == 'row_number() over ( order by (`b` is null) asc, `b` asc )'

    else:
        assert result_sql == (
            'row_number() over ( order by "b" asc nulls last RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
        )


def test_window_rank(dialect):
    left = get_fake_df(dialect, ['a'], ['b', 'c'])
    series_b = left['b']

    w = left.sort_values(by='b', ascending=True).window()
    result = series_b.window_rank(w)

    result_sql = result.expression.to_sql(dialect)
    if is_bigquery(dialect):
        assert result_sql == 'rank() over ( order by (`b` is null) asc, `b` asc )'

    else:
        assert result_sql == (
            'rank() over ( order by "b" asc nulls last RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
        )


def test_window_dense_rank(dialect):
    left = get_fake_df(dialect, ['a'], ['b', 'c'])
    series_b = left['b']

    w = left.sort_values(by='b', ascending=True).window()
    result = series_b.window_dense_rank(w)

    result_sql = result.expression.to_sql(dialect)
    if is_bigquery(dialect):
        assert result_sql == 'dense_rank() over ( order by (`b` is null) asc, `b` asc )'

    else:
        assert result_sql == (
            'dense_rank() over ( order by "b" asc nulls last RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
        )


def test_window_percent_rank(dialect):
    left = get_fake_df(dialect, ['a'], ['b', 'c'])
    series_b = left['b']

    w = left.sort_values(by='b', ascending=True).window()
    result = series_b.window_percent_rank(w)

    result_sql = result.expression.to_sql(dialect)
    if is_bigquery(dialect):
        assert result_sql == 'percent_rank() over ( order by (`b` is null) asc, `b` asc )'

    else:
        assert result_sql == (
            'percent_rank() over ( order by "b" asc nulls last RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
        )


def test_window_cume_dist(dialect):
    left = get_fake_df(dialect, ['a'], ['b', 'c'])
    series_b = left['b']

    w = left.sort_values(by='b', ascending=False).window()
    result = series_b.window_cume_dist(window=w)

    result_sql = result.expression.to_sql(dialect)
    if is_bigquery(dialect):
        assert result_sql == 'cume_dist() over ( order by (`b` is null) asc, `b` desc )'

    else:
        assert result_sql == (
            'cume_dist() over ( order by "b" desc nulls last RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
        )


def test_window_ntile(dialect):
    left = get_fake_df(dialect, ['a'], ['b', 'c'])
    series_b = left['b']

    w = left.sort_values(by='b', ascending=False).window()
    result = series_b.window_ntile(window=w)

    result_sql = result.expression.to_sql(dialect)
    if is_bigquery(dialect):
        assert result_sql == 'ntile(1) over ( order by (`b` is null) asc, `b` desc )'

    else:
        assert result_sql == (
            'ntile(1) over ( order by "b" desc nulls last RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
        )


def test_window_lag(dialect):
    left = get_fake_df(dialect, ['a'], ['b', 'c'])
    series_b = left['b']

    w = left.sort_values(by='b', ascending=False).window()
    result = series_b.window_lag(window=w)

    result_sql = result.expression.to_sql(dialect)
    column_name = '`b`' if is_bigquery(dialect) else '"b"'
    value = 'NULL' if is_bigquery(dialect) else 'cast(NULL as bigint)'

    if is_bigquery(dialect):
        assert result_sql == (
            f'lag({column_name}, 1, {value}) over '
            f'( order by ({column_name} is null) asc, {column_name} desc )'
        )
        return

    assert result_sql == (
        f'lag({column_name}, 1, {value}) over '
        f'( order by {column_name} desc nulls last RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
    )


def test_window_lead(dialect):
    left = get_fake_df(dialect, ['a'], ['b', 'c'])
    series_b = left['b']

    w = left.sort_values(by='b', ascending=False).window()
    result = series_b.window_lead(window=w)

    result_sql = result.expression.to_sql(dialect)
    column_name = '`b`' if is_bigquery(dialect) else '"b"'
    value = 'NULL' if is_bigquery(dialect) else 'cast(NULL as bigint)'

    if is_bigquery(dialect):
        assert result_sql == (
            f'lead({column_name}, 1, {value}) over '
            f'( order by ({column_name} is null) asc, {column_name} desc )'
        )
        return

    assert result_sql == (
        f'lead({column_name}, 1, {value}) over '
        f'( order by {column_name} desc nulls last RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
    )


def test_window_first_value(dialect):
    left = get_fake_df(dialect, ['a'], ['b', 'c'])
    series_b = left['b']

    w = left.sort_values(by='b', ascending=False).window()
    result = series_b.window_first_value(w)

    result_sql = result.expression.to_sql(dialect)
    if is_bigquery(dialect):
        column_name = '`b`'
        order_by_stmt = f'({column_name} is null) asc, {column_name} desc'
    else:
        column_name = '"b"'
        order_by_stmt = f'{column_name} desc nulls last'

    assert result_sql == (
        f'first_value({column_name}) over '
        f'( order by {order_by_stmt} RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
    )


def test_window_last_value(dialect):
    left = get_fake_df(dialect, ['a'], ['b', 'c'])
    series_b = left['b']

    w = left.sort_values(by='b', ascending=False).window()
    result = series_b.window_last_value(w)

    result_sql = result.expression.to_sql(dialect)
    if is_bigquery(dialect):
        column_name = '`b`'
        order_by_stmt = f'({column_name} is null) asc, {column_name} desc'
    else:
        column_name = '"b"'
        order_by_stmt = f'{column_name} desc nulls last'

    assert result_sql == (
        f'last_value({column_name}) over '
        f'( order by {order_by_stmt} RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
    )


def test_window_nth_value(dialect):
    left = get_fake_df(dialect, ['a'], ['b', 'c'])
    series_b = left['b']

    w = left.sort_values(by='b', ascending=False).window()
    result = series_b.window_nth_value(10, window=w)

    result_sql = result.expression.to_sql(dialect)
    if is_bigquery(dialect):
        column_name = '`b`'
        order_by_stmt = f'({column_name} is null) asc, {column_name} desc'
    else:
        column_name = '"b"'
        order_by_stmt = f'{column_name} desc nulls last'

    assert result_sql == (
        f'nth_value({column_name}, 10) over '
        f'( order by {order_by_stmt} RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
    )
