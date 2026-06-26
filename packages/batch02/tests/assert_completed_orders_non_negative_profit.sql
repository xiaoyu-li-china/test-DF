select
    f.order_detail_key,
    f.profit,
    f.net_amount,
    f.total_cost
from {{ ref('fct_order_details') }} f
where f.order_status = 'completed' and f.profit < 0
