{{ config(
    materialized='incremental',
    unique_key='user_id',
    merge_update_columns=['username', 'email', 'phone', 'city', 'registration_date', 'age_group', 'age_group_sort_key'],
    on_schema_change='append_missing_columns',
    incremental_strategy='merge'
) }}

with source as (
    select * from {{ source('raw_data', 'raw_users') }}
),

filtered as (
    select * from source
    where user_id is not null
    {% if is_incremental() %}
        and registration_date > (select coalesce(max(registration_date), '1900-01-01') from {{ this }})
    {% endif %}
),

renamed as (
    select
        user_id,
        username,
        email,
        phone,
        city,
        registration_date,
        age_group,
        case
            when age_group = '18-24' then 1
            when age_group = '25-34' then 2
            when age_group = '35-44' then 3
            when age_group = '45-54' then 4
            when age_group = '55+' then 5
            else 0
        end as age_group_sort_key
    from filtered
)

select * from renamed
