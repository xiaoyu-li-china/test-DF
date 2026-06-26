{% test mutually_exclusive_counts(model, total_column, part_columns) %}

select *
from {{ model }}
where {{ total_column }} != (
    {% for col in part_columns %}
        coalesce({{ col }}, 0){% if not loop.last %} + {% endif %}
    {% endfor %}
)

{% endtest %}
