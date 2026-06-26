select
    order_id,
    refund_amount,
    gross_amount
from {{ ref('stg_orders') }}
where refund_amount > gross_amount
