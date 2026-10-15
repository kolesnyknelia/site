#!/usr/bin/env python3
"""Ізольовані тести оплати: локальний PHP-сервер + фейковий SendPulse.
Не звертаються до справжніх WayForPay / SendPulse / Telegram.
Запуск: python3 backend/tests/test_payment.py   (потрібен PHP CLI)"""
import base64, hashlib, hmac, json, os, shutil, socket, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MERCHANT, SECRET = "test_merchant", "test_secret_key"

def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p

def sign(*parts):
    return hmac.new(SECRET.encode(), ";".join(str(p) for p in parts).encode(), hashlib.md5).hexdigest()

def http(method, url, data=None, ctype="application/x-www-form-urlencoded"):
    body = None
    if data is not None:
        body = json.dumps(data).encode() if ctype == "application/json" else urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=body, method=method, headers={"Content-Type": ctype})
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k): return None
    try:
        with urllib.request.build_opener(NoRedirect).open(req, timeout=20) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

MOCK_SP = r'''<?php
$mode = trim(@file_get_contents(__DIR__ . '/mode.txt')) ?: 'ok';
file_put_contents(__DIR__ . '/calls.log', $_SERVER['REQUEST_URI'] . "\n", FILE_APPEND);
header('Content-Type: application/json');
if ($mode === 'down') { http_response_code(500); echo '{"message":"down"}'; exit; }
if (strpos($_SERVER['REQUEST_URI'], 'oauth') !== false) { echo '{"access_token":"t"}'; exit; }
if ($mode === 'noresult') { echo '{"result":false,"message":"book not found"}'; exit; }
echo '{"result":true}';
'''

def main():
    tmp = tempfile.mkdtemp()
    site, www, priv, mock = (os.path.join(tmp, "kvn"), os.path.join(tmp, "kvn", "www"),
                             os.path.join(tmp, "kvn", "private"), os.path.join(tmp, "mock"))
    for d in (www, priv, mock): os.makedirs(d)
    shutil.copytree(os.path.join(ROOT, "api"), os.path.join(www, "api"))
    shutil.copytree(os.path.join(ROOT, "js"), os.path.join(www, "js"))
    open(os.path.join(mock, "index.php"), "w").write(MOCK_SP)
    pm, ps = free_port(), free_port()
    b64 = lambda v: base64.b64encode(v.encode()).decode()
    cfg = {"WFP_MERCHANT": MERCHANT, "WFP_SECRET": SECRET, "SP_CLIENT_ID": "id", "SP_CLIENT_SECRET": "sec",
           "SP_BOOK_ID": "1", "SP_API_BASE": f"http://127.0.0.1:{pm}"}
    open(os.path.join(priv, "config.php"), "w").write("<?php return [\n" + "".join(f"'{k}' => base64_decode('{b64(v)}'),\n" for k, v in cfg.items()) + "];")
    procs = [subprocess.Popen(["php", "-S", f"127.0.0.1:{pm}", os.path.join(mock, "index.php")], cwd=mock, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
             subprocess.Popen(["php", "-S", f"127.0.0.1:{ps}"], cwd=www, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
    time.sleep(0.8)
    base = f"http://127.0.0.1:{ps}/api"
    mode = lambda m: open(os.path.join(mock, "mode.txt"), "w").write(m)
    sp_calls = lambda: len(open(os.path.join(mock, "calls.log")).read().splitlines()) if os.path.exists(os.path.join(mock, "calls.log")) else 0
    order = lambda ref: json.load(open(os.path.join(priv, "orders", ref + ".json")))
    tg = lambda: open(os.path.join(priv, "tg.log")).read() if os.path.exists(os.path.join(priv, "tg.log")) else ""
    fails = 0

    def check(name, cond):
        nonlocal fails
        print(("✅ " if cond else "❌ ") + name)
        if not cond: fails += 1

    def new_order(email="test@gmail.com"):
        before = set(os.listdir(os.path.join(priv, "orders"))) if os.path.exists(os.path.join(priv, "orders")) else set()
        http("POST", base + "/order.php", {"name": "Тест", "email": email, "utm": "{}"})
        after = set(os.listdir(os.path.join(priv, "orders")))
        return (after - before).pop().replace(".json", "")

    def callback(ref, status="Approved", amount=29, currency="USD", merchant=MERCHANT, sig=None):
        d = {"merchantAccount": merchant, "orderReference": ref, "amount": amount, "currency": currency,
             "authCode": "1", "cardPan": "41****11", "transactionStatus": status, "reasonCode": 1100, "reason": "Ok"}
        d["merchantSignature"] = sig or sign(merchant, ref, amount, currency, "1", "41****11", status, 1100)
        return http("POST", base + "/wfp-callback.php", d, "application/json")

    try:
        # 1. Не-Gmail відхиляється
        c, _ = http("POST", base + "/order.php", {"name": "Тест", "email": "a@ukr.net"})
        check("order.php: пошта не Gmail → 400", c == 400)

        # 2. Щасливий шлях
        mode("ok"); ref = new_order()
        c, b = callback(ref)
        check("Approved + SendPulse ok → accept", c == 200 and '"accept"' in b)
        check("замовлення: paid і sp_ok", bool(order(ref).get("paid")) and bool(order(ref).get("sp_ok")))
        n = sp_calls(); c, b = callback(ref)
        check("дублікат callback → accept, SendPulse не викликається вдруге", c == 200 and sp_calls() == n)
        c, b = http("GET", base + "/return.php?ref=" + ref)
        check("return.php → «Оплата пройшла!»", "Оплата пройшла!" in b)

        # 3. Збій SendPulse → 503 → повтор → відновлення
        mode("down"); ref = new_order()
        c, b = callback(ref)
        check("SendPulse недоступний → HTTP 503 без accept", c == 503 and "accept" not in b)
        check("замовлення: paid є, sp_ok немає", bool(order(ref).get("paid")) and not order(ref).get("sp_ok"))
        check("Telegram: ⏳ доступ ще НЕ відкрито", "доступ ще НЕ відкрито" in tg().replace("Доступ", "доступ"))
        c, b = http("GET", base + "/return.php?ref=" + ref)
        check("return.php → «Готуємо доступ» + не платити повторно", "Готуємо доступ" in b and "не оплачуйте повторно" in b)
        c, b = callback(ref)
        check("повтор під час збою → знову 503", c == 503)
        mode("ok"); c, b = callback(ref)
        check("SendPulse відновився → accept", c == 200 and '"accept"' in b)
        check("Telegram: ✅ доступ відкрито після затримки", "Доступ відкрито після затримки" in tg())
        check("замовлення: sp_ok після відновлення", bool(order(ref).get("sp_ok")))

        # 4. HTTP 200 без result=true
        mode("noresult"); ref = new_order()
        c, b = callback(ref)
        check("SendPulse 200 але result=false → 503 з причиною", c == 503 and "book not found" in order(ref).get("sendpulse", ""))
        mode("ok")

        # 5. Захист
        ref = new_order()
        c, _ = callback(ref, sig="bad")
        check("неправильний підпис → 400", c == 400)
        n = sp_calls(); c, b = callback(ref, amount=1)
        check("неправильна сума → accept, але доступ НЕ видано", c == 200 and sp_calls() == n and not order(ref).get("sp_ok"))
        n = sp_calls(); c, b = callback(ref, currency="UAH")
        check("неправильна валюта → доступ НЕ видано", sp_calls() == n and not order(ref).get("sp_ok"))
        n = sp_calls(); c, b = callback("KVNNOPE123", merchant=MERCHANT)
        check("невідоме замовлення → accept, доступ НЕ видано", c == 200 and sp_calls() == n)
        n = sp_calls(); c, b = callback(ref, merchant="other_shop", sig=sign("other_shop", ref, 29, "USD", "1", "41****11", "Approved", 1100))
        check("інший магазин → доступ НЕ видано", sp_calls() == n and not order(ref).get("sp_ok"))

        # 6. Відхилений платіж
        ref = new_order()
        c, b = callback(ref, status="Declined")
        check("Declined → accept, без доступу, ❌ у Telegram", c == 200 and not order(ref).get("paid") and "Оплата не пройшла" in tg())
    finally:
        for p in procs: p.terminate()
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n{'УСІ ТЕСТИ ПРОЙДЕНО' if not fails else f'ПОМИЛОК: {fails}'}")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
