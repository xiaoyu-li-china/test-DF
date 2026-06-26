{{ config(
    materialized='incremental',
    unique_key='product_key',
    on_schema_change='append_missing_columns',
    incremental_strategy='merge',
    merge_update_columns=[
        'product_id', 'product_name', 'category', 'subcategory', 'brand',
        'cost_price', 'list_price', 'gross_margin', 'gross_margin_pct',
        'total_times_ordered', 'total_quantity_sold', 'total_net_revenue',
        'return_count', 'unique_buyers', 'sales_performance_tier'
    ]
) }}

with new_products as (
    select * from {{ ref('stg_products') }}
    {% if is_incremental() %}
        where product_id not in (select product_id from {{ this }})
    {% endif %}
),

changed_order_products as (
    select distinct product_id
    from {{ ref('stg_orders') }}
    {% if is_incremental() %}
        where order_date > (select coalesce(max(order_date), '1900-01-01') from {{ ref('stg_orders') }})
    {% endif %}
),

products_to_process as (
    select product_id from new_products
    union
    select product_id from changed_order_products
),

order_stats as (
    select
        product_id,
        count(*) as total_times_ordered,
        sum(quantity) as total_quantity_sold,
        sum(net_amount) as total_net_revenue,
        count(case when order_status = 'returned' then 1 end) as return_count,
        count(distinct user_id) as unique_buyers
    from {{ ref('stg_orders') }}
    group by product_id
),

dim_products as (
    select
        {{ dbt_utils.generate_surrogate_key(['p.product_id']) }} as product_key,
        p.product_id,
        p.product_name,
        p.category,
        p.subcategory,
        p.brand,
        p.cost_price,
        p.list_price,
        p.gross_margin,
        p.gross_margin_pct,
        coalesce(os.total_times_ordered, 0) as total_times_ordered,
        coalesce(os.total_quantity_sold, 0) as total_quantity_sold,
        coalesce(os.total_net_revenue, 0) as total_net_revenue,
        coalesce(os.return_count, 0) as return_count,
        coalesce(os.unique_buyers, 0) as unique_buyers,
        case
            when os.total_quantity_sold is null then 'no_sales'
            when os.total_quantity_sold <= 5 then 'low_seller'
            when os.total_quantity_sold <= 15 then 'medium_seller'
            else 'top_seller'
        end as sales_performance_tier
    from {{ ref('stg_products') }} p
    inner join products_to_process ptp on p.product_id = ptp.product_id
    left join order_stats os on p.product_id = os.product_id
)

select * from dim_products
