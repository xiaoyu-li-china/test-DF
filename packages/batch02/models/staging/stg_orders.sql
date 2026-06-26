{{ config(
    materialized='incremental',
    unique_key='order_id',
    merge_update_columns=['user_id', 'product_id', 'quantity', 'unit_price', 'order_status', 'order_date', 'gross_amount', 'refund_amount', 'net_amount'],
    on_schema_change='append_missing_columns',
    incremental_strategy='merge'
) }}

with source as (
    select * from {{ source('raw_data', 'raw_orders') }}
),

filtered as (
    select * from source
    where order_id is not null
    {% if is_incremental() %}
        and order_date > (select coalesce(max(order_date), '1900-01-01') from {{ this }})
    {% endif %}
),

renamed as (
    select
        order_id,
        user_id,
        product_id,
        quantity,
        unit_price,
        order_status,
        order_date,
        quantity * unit_price as gross_amount,
        case
            when order_status = 'returned' then quantity * unit_price
            else 0
        end as refund_amount,
        case
            when order_status = 'completed' then quantity * unit_price
            when order_status = 'pending' then quantity * unit_price
            else 0
        end as net_amount
    from filtered
)

select * from renamed
