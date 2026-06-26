select
    f.order_id,
    count(*) as row_count
from {{ ref('fct_order_details') }} f
group by f.order_id
having count(*) > 1
