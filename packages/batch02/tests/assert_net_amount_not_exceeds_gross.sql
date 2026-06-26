select
    order_id,
    gross_amount,
    net_amount,
    refund_amount
from {{ ref('stg_orders') }}
where net_amount > gross_amount
