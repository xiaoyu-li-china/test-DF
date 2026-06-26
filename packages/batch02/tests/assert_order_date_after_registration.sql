select
    o.order_id,
    o.order_date,
    u.registration_date
from {{ ref('stg_orders') }} o
inner join {{ ref('stg_users') }} u on o.user_id = u.user_id
where o.order_date < u.registration_date
