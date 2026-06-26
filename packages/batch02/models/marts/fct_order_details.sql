{{ config(
    materialized='incremental',
    unique_key='order_detail_key',
    on_schema_change='append_missing_columns',
    incremental_strategy='merge',
    merge_update_columns=[
        'order_id', 'user_key', 'user_id', 'username', 'user_city',
        'age_group', 'customer_segment', 'product_key', 'product_id',
        'product_name', 'product_category', 'product_subcategory', 'brand',
        'quantity', 'unit_price', 'gross_amount', 'refund_amount', 'net_amount',
        'total_cost', 'profit', 'profit_margin_pct', 'order_status',
        'order_date', 'order_year', 'order_month', 'order_day_of_week'
    ]
) }}

with orders as (
    select * from {{ ref('stg_orders') }}
    {% if is_incremental() %}
        where order_date > (select coalesce(max(order_date), '1900-01-01') from {{ this }})
    {% endif %}
),

users as (
    select * from {{ ref('dim_users') }}
),

products as (
    select * from {{ ref('dim_products') }}
),

fct_order_details as (
    select
        {{ dbt_utils.generate_surrogate_key(['o.order_id']) }} as order_detail_key,
        o.order_id,
        u.user_key,
        u.user_id,
        u.username,
        u.city as user_city,
        u.age_group,
        u.customer_segment,
        p.product_key,
        p.product_id,
        p.product_name,
        p.category as product_category,
        p.subcategory as product_subcategory,
        p.brand,
        o.quantity,
        o.unit_price,
        o.gross_amount,
        o.refund_amount,
        o.net_amount,
        p.cost_price * o.quantity as total_cost,
        o.net_amount - (p.cost_price * o.quantity) as profit,
        case
            when o.net_amount - (p.cost_price * o.quantity) > 0
            then round((o.net_amount - (p.cost_price * o.quantity)) / o.net_amount * 100, 2)
            else 0
        end as profit_margin_pct,
        o.order_status,
        o.order_date,
        extract(year from o.order_date) as order_year,
        extract(month from o.order_date) as order_month,
        extract(dow from o.order_date) as order_day_of_week
    from orders o
    inner join users u on o.user_id = u.user_id
    inner join products p on o.product_id = p.product_id
)

select * from fct_order_details
