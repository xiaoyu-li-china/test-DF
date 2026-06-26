select
    f.order_detail_key,
    f.order_id,
    f.user_key
from {{ ref('fct_order_details') }} f
left join {{ ref('dim_users') }} u on f.user_key = u.user_key
where u.user_key is null
