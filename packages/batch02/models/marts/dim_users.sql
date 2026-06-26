{{ config(
    materialized='incremental',
    unique_key='user_key',
    on_schema_change='append_missing_columns',
    incremental_strategy='merge',
    merge_update_columns=[
        'user_id', 'username', 'email', 'phone', 'city',
        'registration_date', 'age_group', 'age_group_sort_key',
        'total_orders', 'completed_orders', 'returned_orders', 'pending_orders',
        'total_net_spent', 'total_gross_spent',
        'first_order_date', 'last_order_date', 'avg_order_quantity', 'customer_segment'
    ]
) }}

with new_users as (
    select * from {{ ref('stg_users') }}
    {% if is_incremental() %}
        where user_id not in (select user_id from {{ this }})
    {% endif %}
),

changed_order_users as (
    select distinct user_id
    from {{ ref('stg_orders') }}
    {% if is_incremental() %}
        where order_date > (select coalesce(max(last_order_date), '1900-01-01') from {{ this }})
    {% endif %}
),

users_to_process as (
    select user_id from new_users
    union
    select user_id from changed_order_users
),

order_stats as (
    select
        user_id,
        count(*) as total_orders,
        count(case when order_status = 'completed' then 1 end) as completed_orders,
        count(case when order_status = 'returned' then 1 end) as returned_orders,
        count(case when order_status = 'pending' then 1 end) as pending_orders,
        sum(net_amount) as total_net_spent,
        sum(gross_amount) as total_gross_spent,
        min(order_date) as first_order_date,
        max(order_date) as last_order_date,
        round(avg(quantity), 1) as avg_order_quantity
    from {{ ref('stg_orders') }}
    group by user_id
),

dim_users as (
    select
        {{ dbt_utils.generate_surrogate_key(['u.user_id']) }} as user_key,
        u.user_id,
        u.username,
        u.email,
        u.phone,
        u.city,
        u.registration_date,
        u.age_group,
        u.age_group_sort_key,
        coalesce(os.total_orders, 0) as total_orders,
        coalesce(os.completed_orders, 0) as completed_orders,
        coalesce(os.returned_orders, 0) as returned_orders,
        coalesce(os.pending_orders, 0) as pending_orders,
        coalesce(os.total_net_spent, 0) as total_net_spent,
        coalesce(os.total_gross_spent, 0) as total_gross_spent,
        os.first_order_date,
        os.last_order_date,
        coalesce(os.avg_order_quantity, 0) as avg_order_quantity,
        case
            when os.total_orders is null then 'new'
            when os.total_orders >= 1 and os.total_orders <= 3 then 'regular'
            when os.total_orders > 3 then 'vip'
            else 'unknown'
        end as customer_segment
    from {{ ref('stg_users') }} u
    inner join users_to_process utp on u.user_id = utp.user_id
    left join order_stats os on u.user_id = os.user_id
)

select * from dim_users
