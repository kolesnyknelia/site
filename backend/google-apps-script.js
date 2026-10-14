/**
 * Прийом заявок з сайту → Google Таблиця + повідомлення в Telegram.
 * Інструкція — backend/README.md
 */
var TELEGRAM_BOT_TOKEN = "";   // токен від @BotFather
var TELEGRAM_CHAT_ID   = "";   // ваш chat id (дізнатись: @userinfobot)

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Дата", "Ім'я", "Телефон", "Telegram/Instagram", "Тариф", "Ціна", "Сторінка", "UTM"]);
  }
  sheet.appendRow([new Date(), data.name, "'" + data.phone, data.contact, data.plan, data.price, data.page, data.utm]);

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    var text = "🔥 Нова заявка!\n\n👤 " + data.name + "\n📞 " + data.phone +
      (data.contact ? "\n💬 " + data.contact : "") + "\n💼 Тариф: " + data.plan + " — " + data.price + " грн" +
      (data.utm && data.utm !== "{}" ? "\n📊 " + data.utm : "");
    UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", {
      method: "post", contentType: "application/json",
      payload: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text })
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
