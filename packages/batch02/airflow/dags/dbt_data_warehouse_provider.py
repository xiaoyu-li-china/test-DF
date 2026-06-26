from datetime import datetime, timedelta
from pathlib import Path
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow_dbt_python.operators.dbt import (
    DbtSeedOperator,
    DbtRunOperator,
    DbtTestOperator,
    DbtSourceFreshnessOperator,
)

default_args = {
    "owner": "data-engineering",
    "depends_on_past": False,
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

DBT_PROJECT_DIR = Path("/opt/airflow/dags/dbt/data_warehouse")
DBT_PROFILES_DIR = DBT_PROJECT_DIR

with DAG(
    dag_id="dbt_data_warehouse_provider",
    default_args=default_args,
    description="dbt 数据仓库流水线（使用 airflow-dbt-python provider）",
    schedule_interval="0 6 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["dbt", "data-warehouse", "provider"],
) as dag:

    start = EmptyOperator(task_id="start")

    seed = DbtSeedOperator(
        task_id="dbt_seed",
        project_dir=str(DBT_PROJECT_DIR),
        profiles_dir=str(DBT_PROFILES_DIR),
        full_refresh=True,
    )

    run_staging = DbtRunOperator(
        task_id="dbt_run_staging",
        project_dir=str(DBT_PROJECT_DIR),
        profiles_dir=str(DBT_PROFILES_DIR),
        select=["staging.*"],
    )

    test_staging = DbtTestOperator(
        task_id="dbt_test_staging",
        project_dir=str(DBT_PROJECT_DIR),
        profiles_dir=str(DBT_PROFILES_DIR),
        select=["staging.*"],
    )

    run_dim_users = DbtRunOperator(
        task_id="dbt_run_dim_users",
        project_dir=str(DBT_PROJECT_DIR),
        profiles_dir=str(DBT_PROFILES_DIR),
        select=["dim_users"],
    )

    run_dim_products = DbtRunOperator(
        task_id="dbt_run_dim_products",
        project_dir=str(DBT_PROJECT_DIR),
        profiles_dir=str(DBT_PROFILES_DIR),
        select=["dim_products"],
    )

    run_fct = DbtRunOperator(
        task_id="dbt_run_fct_order_details",
        project_dir=str(DBT_PROJECT_DIR),
        profiles_dir=str(DBT_PROFILES_DIR),
        select=["fct_order_details"],
    )

    test_marts_schema = DbtTestOperator(
        task_id="dbt_test_marts_schema",
        project_dir=str(DBT_PROJECT_DIR),
        profiles_dir=str(DBT_PROFILES_DIR),
        select=["marts.*"],
        test_type="schema",
    )

    test_marts_data = DbtTestOperator(
        task_id="dbt_test_marts_data",
        project_dir=str(DBT_PROJECT_DIR),
        profiles_dir=str(DBT_PROFILES_DIR),
        select=["marts.*"],
        test_type="data",
    )

    source_freshness = DbtSourceFreshnessOperator(
        task_id="dbt_source_freshness",
        project_dir=str(DBT_PROJECT_DIR),
        profiles_dir=str(DBT_PROFILES_DIR),
    )

    end = EmptyOperator(task_id="end")

    start >> seed >> run_staging
    run_staging >> test_staging
    run_staging >> [run_dim_users, run_dim_products]
    [run_dim_users, run_dim_products] >> run_fct
    run_fct >> [test_marts_schema, test_marts_data]
    [test_marts_schema, test_marts_data] >> source_freshness >> end
