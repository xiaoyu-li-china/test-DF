select
    f.order_detail_key,
    f.order_id,
    f.product_key
from {{ ref('fct_order_details') }} f
left join {{ ref('dim_products') }} p on f.product_key = p.product_key
where p.product_key is null
