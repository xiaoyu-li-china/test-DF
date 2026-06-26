#!/usr/bin/env python3
import csv
import datetime
import json
import os
import requests
import sys
import argparse
from pathlib import Path
from collections import defaultdict


CONFIG = {
    "webhook_url": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY_HERE",
    "csv_file": "feeding_schedule.csv",
    "log_file": "feeding_logs.csv",
    "check_interval": 60,
    "meal_times": {
        "早餐": [7, 30],
        "午餐": [12, 0],
        "晚餐": [18, 30]
    },
    "escalation_minutes": 30,
    "escalation_phone": "",
    "aliyun": {
        "access_key_id": "",
        "access_key_secret": "",
        "tts_code": "",
        "called_show_number": ""
    },
    "google_sheet": {
        "enabled": False,
        "sheet_id": "",
        "sheet_range": "Sheet1!A:D",
        "api_key": "",
        "refresh_interval_minutes": 30
    }
}


NOTIFICATION_TRACKER = "notification_tracker.json"
LAST_GSHEET_SYNC = ".last_gsheet_sync.json"


def load_config(config_file="config.json"):
    if os.path.exists(config_file):
        with open(config_file, 'r', encoding='utf-8') as f:
            CONFIG.update(json.load(f))


def group_by_cage(feeding_list):
    cage_groups = defaultdict(list)
    for item in feeding_list:
        cage_groups[item["笼位"]].append(item)
    return cage_groups


def fetch_google_sheet():
    gs = CONFIG.get("google_sheet", {})
    if not gs.get("enabled"):
        return None
    
    sheet_id = gs.get("sheet_id")
    sheet_range = gs.get("sheet_range", "Sheet1!A:D")
    api_key = gs.get("api_key")
    
    if not sheet_id or not api_key:
        print("Google Sheet 配置不完整")
        return None
    
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{sheet_range}?key={api_key}"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print(f"拉取 Google Sheet 失败: {response.status_code} {response.text}")
            return None
        
        data = response.json()
        values = data.get("values", [])
        if not values or len(values) < 2:
            print("Google Sheet 数据为空")
            return None
        
        headers = [h.strip() for h in values[0]]
        schedule = []
        
        for row in values[1:]:
            if not row or len(row) < 4:
                continue
            item = {
                "笼位": row[0].strip() if len(row) > 0 else "",
                "宠物名": row[1].strip() if len(row) > 1 else "",
                "餐次": row[2].strip() if len(row) > 2 else "",
                "食量": row[3].strip() if len(row) > 3 else ""
            }
            if item["笼位"] and item["宠物名"] and item["餐次"]:
                schedule.append(item)
        
        sync_data = {
            "last_sync": datetime.datetime.now().isoformat(),
            "record_count": len(schedule)
        }
        with open(LAST_GSHEET_SYNC, 'w', encoding='utf-8') as f:
            json.dump(sync_data, f, ensure_ascii=False, indent=2)
        
        print(f"从 Google Sheet 拉取了 {len(schedule)} 条记录")
        return schedule
    
    except Exception as e:
        print(f"拉取 Google Sheet 异常: {e}")
        return None


def should_refresh_gsheet():
    gs = CONFIG.get("google_sheet", {})
    if not gs.get("enabled"):
        return False
    
    if not os.path.exists(LAST_GSHEET_SYNC):
        return True
    
    try:
        with open(LAST_GSHEET_SYNC, 'r', encoding='utf-8') as f:
            data = json.load(f)
        last_sync = datetime.datetime.fromisoformat(data.get("last_sync", "2000-01-01"))
        interval = datetime.timedelta(minutes=gs.get("refresh_interval_minutes", 30))
        return datetime.datetime.now() - last_sync > interval
    except:
        return True


def read_feeding_schedule(csv_file):
    gs = CONFIG.get("google_sheet", {})
    if gs.get("enabled") and should_refresh_gsheet():
        schedule = fetch_google_sheet()
        if schedule is not None:
            return schedule
    
    if gs.get("enabled") and os.path.exists(LAST_GSHEET_SYNC):
        schedule = fetch_google_sheet()
        if schedule is not None:
            return schedule
    
    schedule = []
    if not os.path.exists(csv_file):
        print(f"餐表文件 {csv_file} 不存在")
        return schedule
    
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            schedule.append({
                "笼位": row.get("笼位", "").strip(),
                "宠物名": row.get("宠物名", "").strip(),
                "餐次": row.get("餐次", "").strip(),
                "食量": row.get("食量", "").strip()
            })
    return schedule


def get_current_meal():
    now = datetime.datetime.now()
    current_hour = now.hour
    current_minute = now.minute
    
    for meal, (hour, minute) in CONFIG["meal_times"].items():
        if current_hour == hour and abs(current_minute - minute) <= 10:
            return meal
    return None


def get_meal_datetime(meal, date=None):
    if date is None:
        date = datetime.datetime.now().date()
    hour, minute = CONFIG["meal_times"][meal]
    return datetime.datetime.combine(date, datetime.time(hour, minute))


def get_overdue_meals():
    now = datetime.datetime.now()
    overdue = []
    escalation_minutes = CONFIG.get("escalation_minutes", 30)
    
    for meal, (hour, minute) in CONFIG["meal_times"].items():
        meal_time = get_meal_datetime(meal)
        if meal_time > now:
            continue
        
        time_diff = now - meal_time
        if time_diff.total_seconds() > escalation_minutes * 60:
            if not has_been_escalated(meal):
                overdue.append((meal, time_diff))
    
    return overdue


def send_wechat_notification(feeding_list, meal, is_escalation=False):
    if not feeding_list:
        return True
    
    cage_groups = group_by_cage(feeding_list)
    
    if is_escalation:
        content = f"⚠️ 【{meal}漏喂告警】已超过 {CONFIG.get('escalation_minutes', 30)} 分钟！\n\n"
    else:
        content = f"【{meal}喂食提醒】\n\n"
    
    for cage, pets in sorted(cage_groups.items()):
        content += f"🏠 笼位 {cage}\n"
        for pet in pets:
            content += f"  🐾 {pet['宠物名']}: {pet['食量']}\n"
        content += "---\n"
    
    content += f"\n共 {len(feeding_list)} 只宠物待喂食，请及时处理！"
    
    payload = {
        "msgtype": "text",
        "text": {
            "content": content
        }
    }
    
    try:
        response = requests.post(CONFIG["webhook_url"], json=payload, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print(f"发送通知失败: {e}")
        return False


def make_aliyun_call(phone, meal, overdue_minutes, pet_count):
    aliyun = CONFIG.get("aliyun", {})
    access_key_id = aliyun.get("access_key_id")
    access_key_secret = aliyun.get("access_key_secret")
    tts_code = aliyun.get("tts_code")
    called_show_number = aliyun.get("called_show_number")
    
    if not all([access_key_id, access_key_secret, phone, tts_code]):
        print("阿里云语音配置不完整，跳过电话通知")
        return False
    
    try:
        from aliyunsdkcore.client import AcsClient
        from aliyunsdkdyvmsapi.request.v20170525.SingleCallByTtsRequest import SingleCallByTtsRequest
        
        client = AcsClient(access_key_id, access_key_secret, 'cn-hangzhou')
        request = SingleCallByTtsRequest()
        request.set_accept_format('json')
        request.set_CalledNumber(phone)
        request.set_TtsCode(tts_code)
        request.set_PlayTimes(2)
        
        tts_param = {
            "meal": meal,
            "minutes": str(int(overdue_minutes)),
            "count": str(pet_count)
        }
        request.set_TtsParam(json.dumps(tts_param, ensure_ascii=False))
        
        if called_show_number:
            request.set_CalledShowNumber(called_show_number)
        
        response = client.do_action_with_exception(request)
        print(f"阿里云语音呼叫成功: {response}")
        return True
    
    except ImportError:
        print("未安装阿里云 SDK，请执行: pip install aliyun-python-sdk-core aliyun-python-sdk-dyvmsapi")
        return False
    except Exception as e:
        print(f"阿里云语音呼叫失败: {e}")
        return False


def load_notification_tracker():
    if not os.path.exists(NOTIFICATION_TRACKER):
        return {}
    
    try:
        with open(NOTIFICATION_TRACKER, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}


def save_notification_tracker(data):
    with open(NOTIFICATION_TRACKER, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def has_been_notified_today(meal):
    tracker = load_notification_tracker()
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    key = f"{today}_{meal}"
    return tracker.get(key, False)


def has_been_escalated(meal):
    tracker = load_notification_tracker()
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    key = f"{today}_{meal}_escalated"
    return tracker.get(key, False)


def mark_as_notified(meal):
    tracker = load_notification_tracker()
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    key = f"{today}_{meal}"
    tracker[key] = True
    tracker["last_notified"] = {
        "date": today,
        "meal": meal,
        "time": datetime.datetime.now().strftime("%H:%M:%S")
    }
    save_notification_tracker(tracker)


def mark_as_escalated(meal):
    tracker = load_notification_tracker()
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    key = f"{today}_{meal}_escalated"
    tracker[key] = True
    tracker["last_escalated"] = {
        "date": today,
        "meal": meal,
        "time": datetime.datetime.now().strftime("%H:%M:%S")
    }
    save_notification_tracker(tracker)


def get_existing_log_keys():
    if not os.path.exists(CONFIG["log_file"]):
        return set()
    
    keys = set()
    with open(CONFIG["log_file"], 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = (row.get("日期", ""), row.get("餐次", ""), row.get("笼位", ""), row.get("宠物名", ""))
            keys.add(key)
    return keys


def log_feeding(feeding_list, meal, status="待喂食"):
    now = datetime.datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    log_exists = os.path.exists(CONFIG["log_file"])
    existing_keys = get_existing_log_keys()
    
    with open(CONFIG["log_file"], 'a', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        if not log_exists:
            writer.writerow(["日期", "时间", "餐次", "笼位", "宠物名", "食量", "状态"])
        
        for item in feeding_list:
            key = (date_str, meal, item["笼位"], item["宠物名"])
            if key in existing_keys:
                print(f"跳过重复记录: {date_str} {meal} {item['笼位']} {item['宠物名']}")
                continue
            writer.writerow([date_str, time_str, meal, item["笼位"], item["宠物名"], item["食量"], status])
            existing_keys.add(key)


def get_pending_feeding(meal):
    if not os.path.exists(CONFIG["log_file"]):
        return []
    
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    pending = []
    
    with open(CONFIG["log_file"], 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if (row.get("日期") == today and
                row.get("餐次") == meal and
                row.get("状态") == "待喂食"):
                pending.append({
                    "笼位": row.get("笼位", ""),
                    "宠物名": row.get("宠物名", ""),
                    "食量": row.get("食量", "")
                })
    
    return pending


def run_check():
    meal = get_current_meal()
    
    if meal:
        if has_been_notified_today(meal):
            print(f"今日{meal}已发送过提醒")
        else:
            schedule = read_feeding_schedule(CONFIG["csv_file"])
            feeding_list = [item for item in schedule if item["餐次"] == meal]
            
            if feeding_list:
                print(f"发送{meal}提醒，共 {len(feeding_list)} 只宠物")
                send_wechat_notification(feeding_list, meal)
                log_feeding(feeding_list, meal, "待喂食")
                mark_as_notified(meal)
                print("提醒发送完成")
            else:
                print(f"{meal}没有需要喂食的宠物")
                mark_as_notified(meal)
    
    overdue_meals = get_overdue_meals()
    for meal, time_diff in overdue_meals:
        pending = get_pending_feeding(meal)
        if not pending:
            mark_as_escalated(meal)
            continue
        
        overdue_minutes = time_diff.total_seconds() // 60
        print(f"{meal}漏喂超过 {overdue_minutes:.0f} 分钟，启动 escalation")
        
        send_wechat_notification(pending, meal, is_escalation=True)
        
        phone = CONFIG.get("escalation_phone", "")
        if phone:
            make_aliyun_call(phone, meal, overdue_minutes, len(pending))
        
        log_feeding(pending, meal, "漏喂告警")
        mark_as_escalated(meal)


def show_schedule():
    schedule = read_feeding_schedule(CONFIG["csv_file"])
    if not schedule:
        print("没有找到餐表数据")
        return
    
    print(f"=== 喂食餐表 ({len(schedule)} 条记录) ===")
    for meal in ["早餐", "午餐", "晚餐"]:
        meal_items = [item for item in schedule if item["餐次"] == meal]
        if meal_items:
            print(f"\n{meal}:")
            cage_groups = group_by_cage(meal_items)
            for cage, pets in sorted(cage_groups.items()):
                for pet in pets:
                    print(f"  {cage} - {pet['宠物名']}: {pet['食量']}")


def create_sample_csv():
    sample_data = [
        ["笼位", "宠物名", "餐次", "食量"],
        ["A01", "旺财", "早餐", "狗粮 100g"],
        ["A01", "豆豆", "早餐", "狗粮 80g"],
        ["A01", "旺财", "午餐", "狗粮 100g"],
        ["A01", "旺财", "晚餐", "狗粮 120g"],
        ["A02", "咪咪", "早餐", "猫粮 50g"],
        ["A02", "咪咪", "晚餐", "猫粮 60g"],
        ["B01", "小白", "早餐", "狗粮 80g"],
        ["B01", "小白", "午餐", "狗粮 80g"],
    ]
    
    with open(CONFIG["csv_file"], 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(sample_data)
    print(f"已创建示例餐表文件: {CONFIG['csv_file']}")


def sync_gsheet():
    gs = CONFIG.get("google_sheet", {})
    if not gs.get("enabled"):
        print("Google Sheet 未启用")
        return
    
    schedule = fetch_google_sheet()
    if schedule:
        print(f"同步成功，共 {len(schedule)} 条记录")
    else:
        print("同步失败")


def main():
    parser = argparse.ArgumentParser(description="宠物店喂食提醒系统")
    parser.add_argument("--check", action="store_true", help="检查当前时间是否需要发送提醒")
    parser.add_argument("--schedule", action="store_true", help="显示餐表")
    parser.add_argument("--sample", action="store_true", help="创建示例餐表文件")
    parser.add_argument("--daemon", action="store_true", help="以守护进程方式运行")
    parser.add_argument("--meal", type=str, help="立即发送指定餐次的提醒 (早餐/午餐/晚餐)")
    parser.add_argument("--config", type=str, default="config.json", help="配置文件路径")
    parser.add_argument("--sync-gsheet", action="store_true", help="立即同步 Google Sheet")
    parser.add_argument("--force", action="store_true", help="强制发送，忽略已发送标记")
    
    args = parser.parse_args()
    
    load_config(args.config)
    
    if args.sample:
        create_sample_csv()
        return
    
    if args.sync_gsheet:
        sync_gsheet()
        return
    
    if args.schedule:
        show_schedule()
        return
    
    if args.meal:
        if not args.force and has_been_notified_today(args.meal):
            print(f"今日{args.meal}已发送过提醒，如需强制发送请加 --force 参数")
            return
        schedule = read_feeding_schedule(CONFIG["csv_file"])
        feeding_list = [item for item in schedule if item["餐次"] == args.meal]
        if feeding_list:
            send_wechat_notification(feeding_list, args.meal)
            log_feeding(feeding_list, args.meal, "待喂食")
            mark_as_notified(args.meal)
            print(f"已发送{args.meal}提醒")
        else:
            print(f"{args.meal}没有需要喂食的宠物")
            mark_as_notified(args.meal)
        return
    
    if args.check or args.daemon:
        if args.daemon:
            import time
            print(f"启动守护进程，每 {CONFIG['check_interval']} 秒检查一次...")
            while True:
                run_check()
                time.sleep(CONFIG["check_interval"])
        else:
            run_check()
        return
    
    parser.print_help()


if __name__ == "__main__":
    main()
