from fastapi.testclient import TestClient

from app.config import settings
from app.services.auth_service import hash_password, verify_password

API = "/api/v1"
DEMO = {"email": settings.demo_email, "password": settings.demo_password}


def test_password_hashing_is_salted_and_verifiable() -> None:
    a, b = hash_password("correct horse"), hash_password("correct horse")
    assert a != b and a.startswith("scrypt$")
    assert verify_password("correct horse", a)
    assert not verify_password("wrong horse", a)
    assert not verify_password("anything", "not-a-hash")


def test_protected_routes_require_a_session(anon_client: TestClient) -> None:
    for path in ("/meetings", "/action-items", "/users/me", "/search?q=pdf", "/app-info"):
        assert anon_client.get(f"{API}{path}").status_code == 401, path
    # Public endpoints stay open.
    assert anon_client.get(f"{API}/health").status_code == 200
    assert anon_client.get(f"{API}/auth/demo").json() == DEMO


def test_login_sets_httponly_cookie_and_logout_revokes(anon_client: TestClient) -> None:
    res = anon_client.post(f"{API}/auth/login", json={**DEMO, "email": DEMO["email"].upper()})
    assert res.status_code == 200 and res.json()["name"] == "Alex Rivera"
    cookie = res.headers["set-cookie"]
    assert "ff_session=" in cookie and "HttpOnly" in cookie and "SameSite=lax" in cookie
    token = anon_client.cookies.get("ff_session")
    assert anon_client.get(f"{API}/meetings").status_code == 200

    assert anon_client.post(f"{API}/auth/logout").status_code == 204
    assert anon_client.get(f"{API}/meetings").status_code == 401
    # The old token is dead server-side, not just deleted from the browser.
    anon_client.cookies.set("ff_session", token)
    assert anon_client.get(f"{API}/auth/me").status_code == 401


def test_wrong_credentials_get_the_same_error(anon_client: TestClient) -> None:
    wrong_password = anon_client.post(f"{API}/auth/login", json={**DEMO, "password": "nope-nope"})
    unknown_email = anon_client.post(
        f"{API}/auth/login", json={"email": "ghost@x.io", "password": "whatever1"}
    )
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert (
        wrong_password.json() == unknown_email.json() == {"detail": "Incorrect email or password"}
    )


def test_signup_validates_and_logs_in(anon_client: TestClient) -> None:
    body = {"name": "Grace Hopper", "email": "Grace@Navy.mil", "password": "cobol-rules"}
    assert (
        anon_client.post(f"{API}/auth/signup", json={**body, "password": "short"}).status_code
        == 422
    )
    assert anon_client.post(f"{API}/auth/signup", json={**body, "email": "nope"}).status_code == 422

    res = anon_client.post(f"{API}/auth/signup", json=body)
    assert res.status_code == 201 and res.json()["email"] == "grace@navy.mil"
    assert anon_client.get(f"{API}/auth/me").json()["name"] == "Grace Hopper"
    assert anon_client.post(f"{API}/auth/signup", json=body).status_code == 409

    # Shared workspace: the new user sees the seeded meetings and hosts what they create.
    assert anon_client.get(f"{API}/meetings").json()["total"] == 7
    created = anon_client.post(f"{API}/meetings", json={"title": "Grace's sync"}).json()
    assert created["host"]["name"] == "Grace Hopper"
    hosts = [p for p in created["participants"] if p["role"] == "host"]
    assert [p["email"] for p in hosts] == ["grace@navy.mil"]


def test_login_is_rate_limited(anon_client: TestClient) -> None:
    bad = {**DEMO, "password": "wrong-password"}
    codes = [anon_client.post(f"{API}/auth/login", json=bad).status_code for _ in range(21)]
    assert codes[:20] == [401] * 20 and codes[20] == 429


def test_invalid_session_cookie_is_cleared(anon_client: TestClient) -> None:
    anon_client.cookies.set("ff_session", "forged-or-expired")
    res = anon_client.get(f"{API}/meetings")
    assert res.status_code == 401
    # The 401 deletes the dead cookie so the frontend's cookie-presence guard can't loop.
    assert 'ff_session=""' in res.headers["set-cookie"] and "Max-Age=0" in res.headers["set-cookie"]
