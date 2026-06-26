select
    order_id,
    unit_price
from {{ ref('stg_orders') }}
where unit_price <= 0
