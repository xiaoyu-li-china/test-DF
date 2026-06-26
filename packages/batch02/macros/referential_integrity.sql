{% test referential_integrity(model, column_name, ref_model, ref_column) %}

select
    t.{{ column_name }}
from {{ model }} t
left join {{ ref_model }} r on t.{{ column_name }} = r.{{ ref_column }}
where r.{{ ref_column }} is null

{% endtest %}
