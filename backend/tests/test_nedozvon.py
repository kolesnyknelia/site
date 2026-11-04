#!/usr/bin/env python3
"""Тест бота «Недозвон»: локальний PHP-сервер + фейкові LP-CRM, Нова пошта, TurboSMS, Telegram.
Справжні сервіси не викликаються. Запуск: python3 backend/tests/test_nedozvon.py   (потрібен PHP CLI)"""
import hashlib, hmac, json, os, shutil, socket, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TOKEN, SECRET, OPS = "123:ABC", "s3cret", "-100777"

def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p

# Один фейковий сервер на всі API: пише виклики в calls.jsonl і відповідає за сценарієм
MOCK = r'''<?php
$uri = $_SERVER['REQUEST_URI']; $raw = file_get_contents('php://input');
$in = json_decode($raw, true); if (!is_array($in)) { parse_str($raw, $in); }
file_put_contents(__DIR__ . '/calls.jsonl', json_encode(['uri' => $uri, 'in' => $in], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);
header('Content-Type: application/json');
$state = json_decode(@file_get_contents(__DIR__ . '/state.json'), true) ?: ['status' => '5'];
if (strpos($uri, '/api/getStatuses.html') !== false) { echo json_encode(['status' => 'ok', 'data' => ['3' => 'Новий', '5' => 'Недозвон 🏚', '11' => 'Принят', '13' => 'Відмова']]); exit; }
if (strpos($uri, '/api/getOrdersIdByStatus.html') !== false) { echo json_encode(['status' => 'ok', 'data' => $in['status'] === $state['status'] ? ['17299'] : []]); exit; }
if (strpos($uri, '/api/getOrdersByID.html') !== false) {
  echo json_encode(['status' => 'ok', 'data' => [['id' => '87939', 'order_id' => '17299', 'status' => $state['status'], 'bayer_name' => 'Касяненко Паша', 'phone' => '+380988091877',
    'comment' => 'стара примітка', 'products' => [['product_id' => '122', 'name' => 'Ніжні срібні сережки-кільця', 'price' => '299.00', 'count' => '1']]]]], JSON_UNESCAPED_UNICODE); exit; }
if (strpos($uri, '/api/updateOrder.html') !== false) { $state['status'] = $in['status'] ?? $state['status']; file_put_contents(__DIR__ . '/state.json', json_encode($state)); echo '{"status":"ok"}'; exit; }
if (strpos($uri, '/message/send.json') !== false) { echo '{"response_code":800,"response_status":"SUCCESS_MESSAGE_ACCEPTED"}'; exit; }
if (strpos($uri, '/np') === 0) {
  $m = $in['modelName'] . '.' . $in['calledMethod']; $p = $in['methodProperties'];
  $d = [];
  if ($m === 'Address.getCities') $d = mb_stripos($p['FindByString'], 'жит') !== false || mb_stripos($p['FindByString'], 'ки') !== false
      ? [['Ref' => 'city-' . md5($p['FindByString']), 'Description' => strpos($p['FindByString'], 'Ки') !== false ? 'Київ' : 'Житомир', 'AreaDescription' => 'Житомирська', 'SettlementTypeDescription' => 'місто']] : [];
  if ($m === 'Address.getWarehouses') $d = [['Ref' => 'wh-' . ($p['WarehouseId'] ?? 'x'), 'Description' => 'Відділення №' . ($p['WarehouseId'] ?? '1') . ': вул. Київська, 1']];
  if ($m === 'Counterparty.getCounterparties') $d = [['Ref' => 'sender-ref']];
  if ($m === 'Counterparty.getCounterpartyContactPersons') $d = [['Ref' => 'contact-ref', 'Phones' => '380501112233']];
  if ($m === 'Counterparty.getCounterpartyAddresses') $d = [['Ref' => 'wh-1', 'CityRef' => 'city-snd', 'CityDescription' => 'Київ', 'Description' => 'Відділення №1']];
  if ($m === 'InternetDocument.getDocumentList') $d = [
      ['IntDocNumber' => '20450000000000', 'DateTime' => '25.10.2026 10:00:00', 'Description' => 'Старе', 'Weight' => '1', 'PayerType' => 'Sender', 'CitySender' => 'old', 'SenderAddress' => 'old'],
      ['IntDocNumber' => '20451576856425', 'DateTime' => '01.11.2026 12:00:00', 'Description' => 'Прикраси', 'Weight' => '0.3', 'PayerType' => 'Recipient',
       'AfterpaymentOnGoodsCost' => '827', 'CitySender' => 'city-tpl', 'SenderAddress' => 'wh-tpl']];
  if ($m === 'Counterparty.save') $d = [['Ref' => 'rec-ref', 'ContactPerson' => ['data' => [['Ref' => 'rec-contact']]]]];
  if ($m === 'InternetDocument.save') $d = [['Ref' => 'doc', 'IntDocNumber' => '20450000000001', 'CostOnSite' => 70]];
  echo json_encode(['success' => true, 'data' => $d, 'errors' => []], JSON_UNESCAPED_UNICODE); exit;
}
if (strpos($uri, '/tg/') === 0) {
  if (strpos($uri, 'getMe') !== false) { echo '{"ok":true,"result":{"username":"shop_test_bot"}}'; exit; }
  echo '{"ok":true,"result":{"message_id":1}}'; exit;
}
if (strpos($uri, '/vb/') === 0) { echo '{"status":0}'; exit; }
echo '{}';
'''

def req(url, data=None, headers=None):
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(url, data=body, method="POST" if body else "GET", headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(r, timeout=30) as resp: return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e: return e.code, e.read().decode()

def main():
    tmp = tempfile.mkdtemp()
    www, priv, mock = os.path.join(tmp, "kvn", "www"), os.path.join(tmp, "kvn", "private"), os.path.join(tmp, "mock")
    for d in (www, priv, mock): os.makedirs(d)
    shutil.copytree(os.path.join(ROOT, "nedozvon"), os.path.join(www, "nedozvon"))
    sp = os.path.join(www, "nedozvon", "settings.php")   # у тесті вимикаємо тестовий режим (номери з settings.php)
    import re; txt = open(sp).read()
    txt = re.sub(r"'test_phones'\s*=>\s*\[[^\]]*\]", "'test_phones' => []", txt)
    txt = txt.replace("'lpcrm_update_method' => ''", "'lpcrm_update_method' => 'updateOrder'")   # перевіряємо й гілку з оновленням CRM
    open(sp, "w").write(txt)
    open(os.path.join(mock, "index.php"), "w").write(MOCK)
    pm, ps = free_port(), free_port()
    m = f"http://127.0.0.1:{pm}"
    cfg = {"SECRET": SECRET, "LPCRM_DOMAIN": "x.lp-crm.biz", "LPCRM_KEY": "k", "LPCRM_BASE": m, "TG_TOKEN": TOKEN, "TG_OPS_CHAT": OPS,
           "TG_API": m + "/tg", "TURBOSMS_TOKEN": "t", "TURBOSMS_API": m, "SMS_SENDER": "Noosal", "VIBER_SENDER": "Noosal",
           "NP_KEY": "np", "NP_API": m + "/np", "VIBER_TOKEN": "vbtok", "VIBER_API": m + "/vb", "VIBER_URI": "noosalshop", "BASE_URL": f"http://127.0.0.1:{ps}/nedozvon"}
    open(os.path.join(priv, "nedozvon.php"), "w").write("<?php return " + "[" + ",".join(f"'{k}'=>'{v}'" for k, v in cfg.items()) + "];")
    procs = [subprocess.Popen(["php", "-S", f"127.0.0.1:{pm}", os.path.join(mock, "index.php")], cwd=mock, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
             subprocess.Popen(["php", "-S", f"127.0.0.1:{ps}"], cwd=www, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
    time.sleep(0.8)
    site = f"http://127.0.0.1:{ps}/nedozvon"
    def calls():
        f = os.path.join(mock, "calls.jsonl")
        return [json.loads(l) for l in open(f)] if os.path.exists(f) else []
    def reset_calls():
        f = os.path.join(mock, "calls.jsonl")
        if os.path.exists(f): os.remove(f)
    def tg_texts():
        return [c["in"].get("text") or c["in"].get("caption") or "" for c in calls() if c["uri"].startswith("/tg/") and str(c["in"].get("chat_id")) == "555"]
    def ops_texts():
        return [c["in"].get("text", "") for c in calls() if c["uri"].startswith("/tg/") and str(c["in"].get("chat_id")) == OPS]
    secret_hdr = {"X-Telegram-Bot-Api-Secret-Token": hashlib.sha256(TOKEN.encode()).hexdigest()[:32]}
    upd_id = [0]
    def tg_msg(text):
        upd_id[0] += 1
        return req(site + "/tg.php", {"update_id": upd_id[0], "message": {"message_id": upd_id[0], "chat": {"id": 555, "type": "private"}, "from": {"id": 555, "first_name": "Паша"}, "text": text}}, secret_hdr)
    def tg_btn(data):
        upd_id[0] += 1
        return req(site + "/tg.php", {"update_id": upd_id[0], "callback_query": {"id": "q", "data": data, "from": {"id": 555, "first_name": "Паша"}, "message": {"message_id": 9, "chat": {"id": 555}}}}, secret_hdr)

    fails = 0
    def check(name, cond):
        nonlocal fails
        print(("OK   " if cond else "FAIL ") + name)
        if not cond: fails += 1
    try:
        # --- cron: доступ лише з ключем
        check("cron без ключа → 403", req(site + "/cron.php")[0] == 403)
        check("lib.php напряму → 404", req(site + "/lib.php")[0] == 404)

        # --- cron: перший запуск лише «бачить» замовлення (затримка 2 хв), SMS ще немає
        os.environ["TZ"] = "Europe/Kyiv"
        code, out = req(site + f"/cron.php?key={SECRET}")
        from datetime import datetime; from zoneinfo import ZoneInfo; hour = datetime.now(ZoneInfo("Europe/Kyiv")).hour
        check("cron 200", code == 200)
        check("статус «Недозвон 🏚» знайдено за назвою «Недозвон»", "(#5): 1" in out)
        check("SMS не надіслано до кінця затримки", not any("/message/send.json" in c["uri"] for c in calls()))
        # штучно «старимо» замовлення
        f = os.path.join(priv, "nedozvon", "orders", "17299.json")
        rec = json.load(open(f)); rec["seen_at"] -= 600; json.dump(rec, open(f, "w"))
        reset_calls()
        code, out = req(site + f"/cron.php?key={SECRET}")
        sms = [c for c in calls() if "/message/send.json" in c["uri"]]
        if 9 <= hour < 21:
            check("SMS+Viber надіслано 1 раз", len(sms) == 1)
            if sms:
                b = sms[0]["in"]
                check("номер 380988091877", b["recipients"] == ["380988091877"])
                check("у SMS є номер замовлення 87939 і посилання", "87939" in b["sms"]["text"] and "/go.php?o=o17299_" in b["sms"]["text"])
                check("у Viber товар і кнопка", "сережки" in b["viber"]["text"] and b["viber"]["action"].endswith(b["sms"]["text"].split("go.php?o=")[1]))
            reset_calls(); req(site + f"/cron.php?key={SECRET}")
            check("повторно не надсилає", not any("/message/send.json" in c["uri"] for c in calls()))
        else:
            check("неробочий час — не надсилає", not sms and "неробочий" in out)

        # --- сторінка з SMS
        tok = "o17299_" + hmac.new(SECRET.encode(), b"17299", hashlib.sha256).hexdigest()[:10]
        code, html = req(site + "/go.php?o=" + tok)
        check("go.php: кнопка Telegram з токеном", code == 200 and f"https://t.me/shop_test_bot?start={tok}" in html)
        check("go.php: підроблений токен не приймається", "недійсне" in req(site + "/go.php?o=o17299_0000000000")[1])

        # --- Telegram: чужий запит без секрету
        check("tg.php без секрету → 403", req(site + "/tg.php", {"update_id": 1})[0] == 403)

        # --- сценарій у Telegram
        reset_calls()
        tg_msg("/start o17299_0000000000")
        check("підроблений start → без замовлення", any("посиланням з SMS" in t for t in tg_texts()))
        reset_calls()
        tg_msg("/start " + tok)
        t = "\n".join(tg_texts())
        check("бот показав замовлення з товаром і сумою", "№87939" in t and "сережки" in t and "299 грн" in t and "Вітаємо, Паша" in t)
        reset_calls(); tg_btn("ok")
        check("питає ПІБ і пропонує з CRM", any("прізвище та ім'я" in x for x in tg_texts()))
        reset_calls(); tg_msg("Іван")
        check("одне слово — перепитує", any("двома словами" in x for x in tg_texts()))
        reset_calls(); tg_msg("шевченко ірина")
        check("ПІБ прийнято → питає телефон з CRM", any("+380 98 809 18 77" in x for x in tg_texts()))
        reset_calls(); tg_btn("phone_new"); tg_msg("12345")
        check("неправильний номер — перепитує", any("Не схоже" in x for x in tg_texts()))
        reset_calls(); tg_msg("097 123 45 67")
        check("номер прийнято → питає місто", any("місто" in x for x in tg_texts()))
        reset_calls(); tg_msg("Жит")
        check("показує міста кнопками", any(c["in"].get("reply_markup", {}).get("inline_keyboard", [[{}]])[0][0].get("callback_data") == "c:0" for c in calls() if c["uri"].endswith("sendMessage")))
        reset_calls(); tg_btn("c:0"); tg_msg("№ 12")
        wh = [c for c in calls() if c["uri"] == "/np" and c["in"]["calledMethod"] == "getWarehouses"]
        check("пошук відділення за номером 12", wh and wh[-1]["in"]["methodProperties"].get("WarehouseId") == "12")
        reset_calls(); tg_btn("w:0")
        t = "\n".join(tg_texts())
        check("підсумок з усіма даними", "Шевченко Ірина" in t and "+380 97 123 45 67" in t and "Житомир" in t and "Відділення №12" in t)

        reset_calls(); tg_btn("go")
        cs = calls()
        doc = [c for c in cs if c["uri"] == "/np" and c["in"]["modelName"] == "InternetDocument" and c["in"]["calledMethod"] == "save"]
        check("ТТН створено в НП", len(doc) == 1)
        if doc:
            p = doc[0]["in"]["methodProperties"]
            check("ТТН: отримувач, відділення, телефон, сума, накладений платіж",
                  p["RecipientsPhone"] == "380971234567" and p["RecipientAddress"] == "wh-12" and p["Cost"] == "299"
                  and "BackwardDeliveryData" not in p and p["AfterpaymentOnGoodsCost"] == "299")
            check("ТТН як остання у кабінеті: опис, вага, адреса відправки", p["Description"] == "Прикраси" and p["Weight"] == "0.3"
                  and p["SenderAddress"] == "wh-tpl" and p["CitySender"] == "city-tpl" and p["PayerType"] == "Recipient")
        rc = [c for c in cs if c["uri"] == "/np" and c["in"]["calledMethod"] == "save" and c["in"]["modelName"] == "Counterparty"]
        check("отримувач: прізвище Шевченко, ім'я Ірина", rc and rc[0]["in"]["methodProperties"]["LastName"] == "Шевченко" and rc[0]["in"]["methodProperties"]["FirstName"] == "Ірина")
        up = [c for c in cs if "/api/updateOrder.html" in c["uri"]]
        check("LP-CRM: статус «Принят» (11), ТТН, ПІБ, адреса, «Прийняв бот»", up and up[0]["in"]["status"] == "11" and up[0]["in"]["ttn"] == "20450000000001"
              and up[0]["in"]["bayer_name"] == "Шевченко Ірина" and "Житомир" in up[0]["in"]["delivery_adress"]
              and "Прийняв бот" in up[0]["in"]["comment"] and "стара примітка" in up[0]["in"]["comment"])
        check("клієнт отримав підтвердження без номера ТТН", any("підтверджено" in x for x in tg_texts()) and not any("20450000000001" in x for x in tg_texts()))
        check("оператори отримали звіт", any("Бот прийняв замовлення №87939" in x and "статус «Принят» ✅" in x for x in ops_texts()))

        reset_calls(); tg_btn("go")
        check("повторне «оформити» не створює другу ТТН", not any(c["uri"] == "/np" and c["in"]["modelName"] == "InternetDocument" and c["in"]["calledMethod"] == "save" for c in calls()))

        # --- вільне питання → операторам, відповідь оператора → клієнту
        reset_calls(); tg_msg("А коли приїде?")
        ops = ops_texts()
        check("питання переслано операторам з міткою", ops and "А коли приїде?" in ops[-1] and "#k" in ops[-1])
        tag = ops[-1].split("#k")[1][:8] if ops else ""
        reset_calls()
        upd_id[0] += 1
        req(site + "/tg.php", {"update_id": upd_id[0], "message": {"message_id": 77, "chat": {"id": int(OPS), "type": "supergroup"}, "text": "Завтра 🙂",
                                                                   "reply_to_message": {"message_id": 5, "text": "...\n#k" + tag}}}, secret_hdr)
        check("відповідь оператора дійшла клієнту", "Завтра 🙂" in tg_texts())

        # --- оператор уже обробив замовлення → бот не створює ТТН
        shutil.rmtree(os.path.join(priv, "nedozvon", "orders")); json.dump({"status": "11"}, open(os.path.join(mock, "state.json"), "w"))
        for k in ("ok",): pass
        tg_msg("/start " + tok); tg_btn("ok"); tg_btn("name_ok"); tg_btn("phone_ok"); tg_msg("Ки"); tg_btn("c:0"); tg_msg("3"); tg_btn("w:0")
        reset_calls(); tg_btn("go")
        check("статус уже «Принят» → ТТН не створюється", not any(c["uri"] == "/np" and c["in"]["modelName"] == "InternetDocument" and c["in"]["calledMethod"] == "save" for c in calls()))
        check("оператор попереджений", any("ТТН бот НЕ створював" in x for x in ops_texts()))

        # --- Viber: вітання з кнопками у відповіді на conversation_started, далі кнопка → наступний крок
        json.dump({"status": "5"}, open(os.path.join(mock, "state.json"), "w"))
        shutil.rmtree(os.path.join(priv, "nedozvon", "orders"))
        def vb(ev):
            body = json.dumps(ev).encode()
            sig = hmac.new(b"vbtok", body, hashlib.sha256).hexdigest()
            r = urllib.request.Request(site + "/viber.php", data=body, method="POST", headers={"Content-Type": "application/json", "X-Viber-Content-Signature": sig})
            with urllib.request.urlopen(r, timeout=30) as resp: return resp.read().decode()
        check("viber.php без підпису → 403", req(site + "/viber.php", {"event": "message"})[0] == 403)
        w = json.loads(vb({"event": "conversation_started", "user": {"id": "U+1/a=", "name": "Паша"}, "context": tok}))
        check("Viber: вітання з замовленням і кнопками", "№87939" in w["text"] and w["keyboard"]["Buttons"][0]["ActionBody"] == "ok")
        reset_calls(); vb({"event": "message", "sender": {"id": "U+1/a=", "name": "Паша"}, "message": {"type": "text", "text": "ok"}})
        sent = [c for c in calls() if c["uri"] == "/vb/send_message"]
        check("Viber: кнопка «Підтверджую» → питає ПІБ", sent and sent[-1]["in"]["receiver"] == "U+1/a=" and "прізвище" in sent[-1]["in"]["text"])

        # --- check.php
        code, out = req(site + f"/check.php?key={SECRET}&order=17299")
        check("check.php показує статуси й замовлення", code == 200 and "Недозвон" in out and "Касяненко" in out and "✅ @shop_test_bot" in out)
        check("check.php показує шаблон ТТН", "опис «Прикраси», вага 0.3 кг" in out and "Контроль оплати" in out)
        check("check.php без ключа → 403", req(site + "/check.php")[0] == 403)
    finally:
        for p in procs: p.terminate()
        shutil.rmtree(tmp, ignore_errors=True)
    print("\nПомилок:", fails)
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
