select
    o.order_id,
    o.product_id
from {{ ref('stg_orders') }} o
left join {{ ref('stg_products') }} p on o.product_id = p.product_id
where p.product_id is null
