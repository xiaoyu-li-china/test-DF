from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator
from airflow.sensors.external_task import ExternalTaskSensor

default_args = {
    "owner": "data-engineering",
    "depends_on_past": False,
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(hours=1),
}

DBT_PROJECT_DIR = "/opt/airflow/dags/dbt/data_warehouse"
DBT_PROFILES_DIR = "/opt/airflow/dags/dbt/data_warehouse"

with DAG(
    dag_id="dbt_data_warehouse_pipeline",
    default_args=default_args,
    description="dbt 数据仓库模型构建与测试流水线",
    schedule_interval="0 6 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["dbt", "data-warehouse"],
) as dag:

    start = EmptyOperator(task_id="start")

    dbt_seed = BashOperator(
        task_id="dbt_seed",
        bash_command=f"cd {DBT_PROJECT_DIR} && dbt seed --profiles-dir {DBT_PROFILES_DIR} --full-refresh",
    )

    dbt_run_staging = BashOperator(
        task_id="dbt_run_staging",
        bash_command=f"cd {DBT_PROJECT_DIR} && dbt run --profiles-dir {DBT_PROFILES_DIR} --select staging.*",
    )

    dbt_run_marts_dims = BashOperator(
        task_id="dbt_run_marts_dims",
        bash_command=f"cd {DBT_PROJECT_DIR} && dbt run --profiles-dir {DBT_PROFILES_DIR} --select dim_users dim_products",
    )

    dbt_run_marts_fct = BashOperator(
        task_id="dbt_run_marts_fct",
        bash_command=f"cd {DBT_PROJECT_DIR} && dbt run --profiles-dir {DBT_PROFILES_DIR} --select fct_order_details",
    )

    dbt_test_staging = BashOperator(
        task_id="dbt_test_staging",
        bash_command=f"cd {DBT_PROJECT_DIR} && dbt test --profiles-dir {DBT_PROFILES_DIR} --select staging.*",
    )

    dbt_test_marts = BashOperator(
        task_id="dbt_test_marts",
        bash_command=f"cd {DBT_PROJECT_DIR} && dbt test --profiles-dir {DBT_PROFILES_DIR} --select marts.*",
    )

    dbt_test_custom = BashOperator(
        task_id="dbt_test_custom",
        bash_command=f"cd {DBT_PROJECT_DIR} && dbt test --profiles-dir {DBT_PROFILES_DIR} --select test_type:singular",
    )

    dbt_run_full = BashOperator(
        task_id="dbt_run_full_refresh",
        bash_command=f"cd {DBT_PROJECT_DIR} && dbt run --profiles-dir {DBT_PROFILES_DIR} --full-refresh",
    )

    dbt_source_freshness = BashOperator(
        task_id="dbt_source_freshness",
        bash_command=f"cd {DBT_PROJECT_DIR} && dbt source freshness --profiles-dir {DBT_PROFILES_DIR}",
    )

    end = EmptyOperator(task_id="end")

    start >> dbt_seed >> dbt_run_staging >> dbt_run_marts_dims >> dbt_run_marts_fct

    dbt_run_staging >> dbt_test_staging
    dbt_run_marts_fct >> dbt_test_marts
    dbt_run_marts_fct >> dbt_test_custom

    [dbt_test_staging, dbt_test_marts, dbt_test_custom] >> dbt_source_freshness >> end

    dbt_run_full_refresh = dbt_run_full
