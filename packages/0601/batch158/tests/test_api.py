import threading
import time
from app.models import ApplicationStatus


class TestApplicationWorkflow:

    def test_submit_application_success(self, client, sample_animal):
        resp = client.post(
            "/applications",
            json={
                "applicant_name": "李四",
                "applicant_phone": "13900002222",
                "applicant_email": "lisi@example.com",
                "address": "上海市浦东新区某路100号",
                "pet_experience": "无养宠经验，但喜欢动物",
                "animal_id": sample_animal["id"],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["applicant_name"] == "李四"
        assert data["status"] == "pending"
        assert data["animal_id"] == sample_animal["id"]
        assert data["home_visit_status"] == "not_scheduled"
        assert data["living_photos"] is None

    def test_submit_application_animal_not_found(self, client):
        resp = client.post(
            "/applications",
            json={
                "applicant_name": "王五",
                "applicant_phone": "13700003333",
                "address": "广州市天河区",
                "pet_experience": "养过狗",
                "animal_id": 9999,
            },
        )
        assert resp.status_code == 404
        assert "不存在" in resp.json()["detail"]

    def test_submit_application_animal_already_adopted(self, client, sample_animal):
        app_resp = client.post(
            "/applications",
            json={
                "applicant_name": "赵六",
                "applicant_phone": "13600004444",
                "address": "深圳市南山区",
                "pet_experience": "养过猫",
                "animal_id": sample_animal["id"],
            },
        )
        app_id = app_resp.json()["id"]
        client.patch(
            f"/applications/{app_id}",
            json={"status": "approved", "reviewer_note": "通过"},
        )
        resp = client.post(
            "/applications",
            json={
                "applicant_name": "钱七",
                "applicant_phone": "13500005555",
                "address": "成都市武侯区",
                "pet_experience": "养过仓鼠",
                "animal_id": sample_animal["id"],
            },
        )
        assert resp.status_code == 409
        assert "已被领养" in resp.json()["detail"]

    def test_list_pending_applications(self, client, sample_animal):
        client.post(
            "/applications",
            json={
                "applicant_name": "甲",
                "applicant_phone": "11100001111",
                "address": "地址A",
                "pet_experience": "经验A",
                "animal_id": sample_animal["id"],
            },
        )
        client.post(
            "/applications",
            json={
                "applicant_name": "乙",
                "applicant_phone": "11100002222",
                "address": "地址B",
                "pet_experience": "经验B",
                "animal_id": sample_animal["id"],
            },
        )
        resp = client.get("/applications/pending")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 2

    def test_query_my_applications(self, client, sample_animal):
        client.post(
            "/applications",
            json={
                "applicant_name": "孙八",
                "applicant_phone": "13400006666",
                "address": "杭州市西湖区",
                "pet_experience": "养过金鱼",
                "animal_id": sample_animal["id"],
            },
        )
        resp = client.get(
            "/applications/me",
            params={"applicant_name": "孙八", "applicant_phone": "13400006666"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["applicant_name"] == "孙八"

    def test_query_my_applications_empty(self, client):
        resp = client.get(
            "/applications/me",
            params={"applicant_name": "不存在", "applicant_phone": "00000000000"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    def test_upload_living_photos(self, client, sample_application):
        app_id = sample_application["id"]
        resp = client.post(
            f"/applications/{app_id}/photos",
            json={"photo_urls": ["https://img.example.com/living1.jpg"]},
        )
        assert resp.status_code == 200
        assert resp.json()["living_photos"] == ["https://img.example.com/living1.jpg"]

        resp2 = client.post(
            f"/applications/{app_id}/photos",
            json={"photo_urls": ["https://img.example.com/living2.jpg", "https://img.example.com/living3.jpg"]},
        )
        assert resp2.status_code == 200
        assert len(resp2.json()["living_photos"]) == 3

    def test_home_visit_schedule(self, client, sample_application):
        app_id = sample_application["id"]
        resp = client.post(
            f"/applications/{app_id}/home-visit",
            json={
                "scheduled_at": "2026-06-10T09:00:00",
                "note": "请提前收拾好阳台",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["home_visit_status"] == "scheduled"
        assert data["home_visit_note"] == "请提前收拾好阳台"


class TestReviewWorkflow:

    def test_approve_application(self, client, sample_application, email_svc):
        app_id = sample_application["id"]
        resp = client.patch(
            f"/applications/{app_id}",
            json={"status": "approved", "reviewer_note": "审核通过"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "approved"
        assert data["reviewer_note"] == "审核通过"
        assert data["reviewed_at"] is not None

    def test_reject_application(self, client, sample_application, email_svc):
        app_id = sample_application["id"]
        resp = client.patch(
            f"/applications/{app_id}",
            json={"status": "rejected", "reviewer_note": "住址不适合养宠"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "rejected"
        assert data["reviewer_note"] == "住址不适合养宠"

    def test_review_nonexistent_application(self, client):
        resp = client.patch(
            "/applications/99999",
            json={"status": "approved"},
        )
        assert resp.status_code == 404

    def test_review_already_reviewed(self, client, sample_application, email_svc):
        app_id = sample_application["id"]
        client.patch(
            f"/applications/{app_id}",
            json={"status": "approved"},
        )
        resp = client.patch(
            f"/applications/{app_id}",
            json={"status": "rejected"},
        )
        assert resp.status_code == 400
        assert "已被审核" in resp.json()["detail"]

    def test_review_cannot_set_pending(self, client, sample_application):
        app_id = sample_application["id"]
        resp = client.patch(
            f"/applications/{app_id}",
            json={"status": "pending"},
        )
        assert resp.status_code == 400
        assert "pending" in resp.json()["detail"]

    def test_home_visit_only_for_pending(self, client, sample_application, email_svc):
        app_id = sample_application["id"]
        client.patch(
            f"/applications/{app_id}",
            json={"status": "approved"},
        )
        resp = client.post(
            f"/applications/{app_id}/home-visit",
            json={"scheduled_at": "2026-06-10T09:00:00"},
        )
        assert resp.status_code == 400
        assert "仅待审核" in resp.json()["detail"]


class TestAnimalStatusAfterApproval:

    def test_animal_adoptable_defaults_true(self, client, sample_animal):
        resp = client.get("/animals")
        animals = resp.json()
        target = next(a for a in animals if a["id"] == sample_animal["id"])
        assert target["adoptable"] is True

    def test_animal_becomes_unadoptable_after_approval(self, client, sample_animal, email_svc):
        app_resp = client.post(
            "/applications",
            json={
                "applicant_name": "测试人",
                "applicant_phone": "13000000000",
                "address": "测试地址",
                "pet_experience": "有经验",
                "animal_id": sample_animal["id"],
            },
        )
        app_id = app_resp.json()["id"]
        client.patch(
            f"/applications/{app_id}",
            json={"status": "approved", "reviewer_note": "通过"},
        )
        animals_resp = client.get("/animals")
        target = next(a for a in animals_resp.json() if a["id"] == sample_animal["id"])
        assert target["adoptable"] is False

    def test_animal_stays_adoptable_after_rejection(self, client, sample_animal, email_svc):
        app_resp = client.post(
            "/applications",
            json={
                "applicant_name": "测试人2",
                "applicant_phone": "13000000001",
                "address": "测试地址2",
                "pet_experience": "无经验",
                "animal_id": sample_animal["id"],
            },
        )
        app_id = app_resp.json()["id"]
        client.patch(
            f"/applications/{app_id}",
            json={"status": "rejected", "reviewer_note": "不合适"},
        )
        animals_resp = client.get("/animals")
        target = next(a for a in animals_resp.json() if a["id"] == sample_animal["id"])
        assert target["adoptable"] is True

    def test_second_application_rejected_for_adopted_animal(self, client, sample_animal, email_svc):
        app1 = client.post(
            "/applications",
            json={
                "applicant_name": "甲",
                "applicant_phone": "13100000001",
                "address": "地址1",
                "pet_experience": "有经验",
                "animal_id": sample_animal["id"],
            },
        )
        client.patch(
            f"/applications/{app1.json()['id']}",
            json={"status": "approved"},
        )
        app2 = client.post(
            "/applications",
            json={
                "applicant_name": "乙",
                "applicant_phone": "13100000002",
                "address": "地址2",
                "pet_experience": "有经验",
                "animal_id": sample_animal["id"],
            },
        )
        assert app2.status_code == 409


class TestRoleAccess:

    def test_applicant_can_only_see_own_applications(self, client, sample_animal, sample_animal_2):
        client.post(
            "/applications",
            json={
                "applicant_name": "用户A",
                "applicant_phone": "15000001111",
                "address": "A的地址",
                "pet_experience": "A的经验",
                "animal_id": sample_animal["id"],
            },
        )
        client.post(
            "/applications",
            json={
                "applicant_name": "用户B",
                "applicant_phone": "15000002222",
                "address": "B的地址",
                "pet_experience": "B的经验",
                "animal_id": sample_animal_2["id"],
            },
        )
        resp_a = client.get(
            "/applications/me",
            params={"applicant_name": "用户A", "applicant_phone": "15000001111"},
        )
        assert len(resp_a.json()) == 1
        assert resp_a.json()[0]["applicant_name"] == "用户A"

        resp_b = client.get(
            "/applications/me",
            params={"applicant_name": "用户B", "applicant_phone": "15000002222"},
        )
        assert len(resp_b.json()) == 1
        assert resp_b.json()[0]["applicant_name"] == "用户B"

    def test_me_endpoint_requires_both_name_and_phone(self, client):
        resp = client.get("/applications/me", params={"applicant_name": "某人"})
        assert resp.status_code == 422

    def test_applicant_cannot_see_sensitive_fields_in_progress(self, client, sample_application):
        resp = client.get(
            "/applications/me",
            params={
                "applicant_name": sample_application["applicant_name"],
                "applicant_phone": sample_application["applicant_phone"],
            },
        )
        data = resp.json()[0]
        assert "address" not in data
        assert "pet_experience" not in data
        assert "applicant_phone" not in data
        assert "status" in data
        assert "animal" in data


class TestEmailNotification:

    def test_approval_sends_email(self, client, sample_application, email_svc):
        app_id = sample_application["id"]
        client.patch(
            f"/applications/{app_id}",
            json={"status": "approved", "reviewer_note": "通过"},
        )
        assert len(email_svc.sent_emails) == 1
        assert "已通过" in email_svc.sent_emails[0].subject
        assert email_svc.sent_emails[0].to_email == "zhangsan@example.com"

    def test_rejection_sends_email(self, client, sample_application, email_svc):
        app_id = sample_application["id"]
        client.patch(
            f"/applications/{app_id}",
            json={"status": "rejected", "reviewer_note": "不合适"},
        )
        assert len(email_svc.sent_emails) == 1
        assert "结果通知" in email_svc.sent_emails[0].subject

    def test_no_email_without_address(self, client, sample_animal, email_svc):
        resp = client.post(
            "/applications",
            json={
                "applicant_name": "无邮箱",
                "applicant_phone": "13300000000",
                "address": "某地",
                "pet_experience": "无",
                "animal_id": sample_animal["id"],
            },
        )
        app_id = resp.json()["id"]
        client.patch(
            f"/applications/{app_id}",
            json={"status": "approved"},
        )
        assert len(email_svc.sent_emails) == 0

    def test_home_visit_schedule_sends_email(self, client, sample_application, email_svc):
        app_id = sample_application["id"]
        client.post(
            f"/applications/{app_id}/home-visit",
            json={"scheduled_at": "2026-06-10T09:00:00"},
        )
        assert len(email_svc.sent_emails) == 1
        assert "家访预约确认" in email_svc.sent_emails[0].subject


class TestConcurrentPatch:

    def test_concurrent_review_only_one_succeeds(self, client, sample_animal, email_svc):
        app_resp = client.post(
            "/applications",
            json={
                "applicant_name": "并发测试",
                "applicant_phone": "18800000000",
                "address": "并发地址",
                "pet_experience": "有经验",
                "animal_id": sample_animal["id"],
            },
        )
        app_id = app_resp.json()["id"]

        results = {"approved": 0, "rejected": 0, "error": 0}
        lock = threading.Lock()

        def review_with_status(status_val, note_val):
            try:
                resp = client.patch(
                    f"/applications/{app_id}",
                    json={"status": status_val, "reviewer_note": note_val},
                )
                with lock:
                    if resp.status_code == 200:
                        if resp.json()["status"] == "approved":
                            results["approved"] += 1
                        else:
                            results["rejected"] += 1
                    else:
                        results["error"] += 1
            except Exception:
                with lock:
                    results["error"] += 1

        t1 = threading.Thread(target=review_with_status, args=("approved", "通过"))
        t2 = threading.Thread(target=review_with_status, args=("rejected", "驳回"))
        t1.start()
        t2.start()
        t1.join(timeout=5)
        t2.join(timeout=5)

        final = client.get(
            "/applications/me",
            params={"applicant_name": "并发测试", "applicant_phone": "18800000000"},
        )
        final_status = final.json()[0]["status"]
        assert final_status in ("approved", "rejected")

        if final_status == "approved":
            assert results["approved"] >= 1
        else:
            assert results["rejected"] >= 1

        total_successful = results["approved"] + results["rejected"]
        assert total_successful == 1

    def test_concurrent_approval_and_second_application(self, client, sample_animal, email_svc):
        app1 = client.post(
            "/applications",
            json={
                "applicant_name": "第一人",
                "applicant_phone": "17700000001",
                "address": "地址1",
                "pet_experience": "有经验",
                "animal_id": sample_animal["id"],
            },
        )
        app1_id = app1.json()["id"]
        client.patch(
            f"/applications/{app1_id}",
            json={"status": "approved", "reviewer_note": "通过"},
        )
        app2 = client.post(
            "/applications",
            json={
                "applicant_name": "第二人",
                "applicant_phone": "17700000002",
                "address": "地址2",
                "pet_experience": "有经验",
                "animal_id": sample_animal["id"],
            },
        )
        assert app2.status_code == 409
