#!/usr/bin/env python3
"""Ізольовані тести оплати «Формули Claude»: локальний PHP-сервер + фейковий SendPulse.
Збирає api/ так само, як deploy-formulaclaude.yml (fc-*.php під звичними іменами).
Не звертається до справжніх WayForPay / SendPulse / Telegram.
Запуск: python3 backend/tests/test_formulaclaude_payment.py   (потрібен PHP CLI)"""
import base64, hashlib, hmac, json, os, re, shutil, socket, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request

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
file_put_contents(__DIR__ . '/calls.log', $_SERVER['REQUEST_URI'] . " " . file_get_contents('php://input') . "\n", FILE_APPEND);
header('Content-Type: application/json');
if (strpos($_SERVER['REQUEST_URI'], 'oauth') !== false) { echo '{"access_token":"t"}'; exit; }
echo '{"result":true}';
'''

def build(www, book):
    api = os.path.join(www, "api"); os.makedirs(api)
    for f in ("formulaclaude-lead.php", "lib.php", ".htaccess"):
        shutil.copy(os.path.join(ROOT, "api", f), api)
    for src, dst in (("fc-settings.php", "settings.php"), ("fc-order.php", "order.php"),
                     ("fc-wfp-callback.php", "wfp-callback.php"), ("fc-return.php", "return.php")):
        shutil.copy(os.path.join(ROOT, "api", src), os.path.join(api, dst))
    s = open(os.path.join(api, "settings.php")).read()
    s = s.replace("'sp_book_id'   => '',", f"'sp_book_id'   => '{book}',")
    open(os.path.join(api, "settings.php"), "w").write(s)

def main():
    tmp = tempfile.mkdtemp()
    site = os.path.join(tmp, "kvn"); www = os.path.join(site, "formulaclaude"); priv = os.path.join(site, "private"); mock = os.path.join(tmp, "mock")
    for d in (priv, mock): os.makedirs(d)
    build(www, "777")
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
    calls = lambda: open(os.path.join(mock, "calls.log")).read() if os.path.exists(os.path.join(mock, "calls.log")) else ""
    order = lambda ref: json.load(open(os.path.join(priv, "orders", ref + ".json")))
    fails = 0
    def check(name, cond):
        nonlocal fails
        print(("✅ " if cond else "❌ ") + name); fails += 0 if cond else 1

    def callback(ref, amount, status="Approved", currency="UAH", merchant=MERCHANT):
        d = {"merchantAccount": merchant, "orderReference": ref, "amount": amount, "currency": currency,
             "authCode": "1", "cardPan": "41****11", "transactionStatus": status, "reasonCode": 1100}
        d["merchantSignature"] = sign(merchant, ref, amount, currency, "1", "41****11", status, 1100)
        return http("POST", base + "/wfp-callback.php", d, "application/json")

    try:
        # 1. Не Gmail → відмова
        st, _ = http("POST", base + "/order.php", {"name": "Олена", "email": "o@ukr.net", "pack": "self"})
        check("не-Gmail відхилено", st == 400)
        # 2. Невідомий пакет → відмова
        st, _ = http("POST", base + "/order.php", {"name": "Олена", "email": "o@gmail.com", "pack": "xxx"})
        check("невідомий пакет відхилено", st == 400)
        # 3. Пакет «З куратором» → форма WayForPay з правильною сумою і підписом
        st, body = http("POST", base + "/order.php", {"name": "Олена", "email": "Olena@Gmail.com", "phone": "+380 50 000 00 00", "pack": "group", "utm": '{"utm_source":"fb"}'})
        ref = re.search(r'name="orderReference" value="([^"]+)"', body).group(1)
        f = dict(re.findall(r'name="([^"]+)" value="([^"]*)"', body))
        check("форма WayForPay сформована", st == 200 and "secure.wayforpay.com/pay" in body and ref.startswith("FC"))
        check("сума пакета 5900 UAH", f.get("amount") == "5900" and f.get("currency") == "UAH")
        check("домен formulaclaude.kvn.kiev.ua", f.get("merchantDomainName") == "formulaclaude.kvn.kiev.ua")
        exp = sign(MERCHANT, f["merchantDomainName"], ref, f["orderDate"], "5900", "UAH", f["productName[]"], 1, "5900")
        check("підпис WayForPay правильний", f.get("merchantSignature") == exp)
        check("returnUrl/serviceUrl на піддомені", f["serviceUrl"] == "https://formulaclaude.kvn.kiev.ua/api/wfp-callback.php")
        # 4. Сума не збігається → доступ не видається
        st, _ = callback(ref, 2900)
        check("чужа сума: доступ не видано", st == 200 and "addressbooks" not in calls())
        # 5. Правильний callback → книга 777 (не книга kvn), з пакетом
        st, body = callback(ref, 5900)
        check("оплата прийнята (accept)", st == 200 and '"accept"' in body)
        check("email додано саме в книгу «Формули Claude» (777)", "/addressbooks/777/emails" in calls() and "/addressbooks/1/" not in calls())
        check("пакет передано в SendPulse", "З куратором" in calls() or "\\u0417 \\u043a\\u0443\\u0440\\u0430\\u0442\\u043e\\u0440\\u043e\\u043c" in calls())
        check("замовлення позначено оплаченим", order(ref).get("sp_ok"))
        # 6. Сторінка після оплати
        st, body = http("GET", base + "/return.php?ref=" + ref)
        check("сторінка «Оплата пройшла»", st == 200 and "Оплата пройшла" in body and "olena@gmail.com" in body)
        # 7. Без sp_book_id — НЕ додаємо в книгу kvn, просимо повтор
        shutil.rmtree(www); build(www, "")
        open(os.path.join(mock, "calls.log"), "w").close()
        st, body = http("POST", base + "/order.php", {"name": "Іра", "email": "ira@gmail.com", "pack": "self"})
        ref2 = re.search(r'name="orderReference" value="([^"]+)"', body).group(1)
        st, _ = callback(ref2, 2900)
        check("без книги: повтор пізніше (503), книга kvn не зачеплена", st == 503 and "addressbooks" not in calls())
    finally:
        for p in procs: p.terminate()
    print("\nУсе гаразд" if not fails else f"\nПомилок: {fails}")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
