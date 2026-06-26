{{ config(
    materialized='incremental',
    unique_key='product_id',
    merge_update_columns=['product_name', 'category', 'subcategory', 'brand', 'cost_price', 'list_price', 'gross_margin', 'gross_margin_pct'],
    on_schema_change='append_missing_columns',
    incremental_strategy='merge'
) }}

with source as (
    select * from {{ source('raw_data', 'raw_products') }}
),

filtered as (
    select * from source
    where product_id is not null
),

renamed as (
    select
        product_id,
        product_name,
        category,
        subcategory,
        brand,
        cost_price,
        list_price,
        list_price - cost_price as gross_margin,
        round((list_price - cost_price) / list_price * 100, 2) as gross_margin_pct
    from filtered
)

select * from renamed
