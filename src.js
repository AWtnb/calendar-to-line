/**
 * 複数Googleカレンダーの本日の予定を、自分のLINEに送信する
 *
 * 事前設定: スクリプトプロパティに以下を登録
 *   - LINE_ACCESS_TOKEN : LINE Messaging APIのチャネルアクセストークン
 *   - LINE_USER_ID      : 送信先のLINEユーザーID（Uから始まる33文字）
 *   - SHEET_ID          : カレンダーIDを列挙したスプレッドシートのID
 */

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_MAX_TEXT_LENGTH = 5000; // LINEのテキストメッセージ上限

/**
 * メイン処理（トリガーから呼び出す）
 * トリガーとエディタの実行対象にするため function 宣言とする
 */
function main() {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty("LINE_ACCESS_TOKEN");
  const userId = props.getProperty("LINE_USER_ID");
  const sheetId = props.getProperty("SHEET_ID");

  if (!accessToken || !userId || !sheetId) {
    throw new Error(
      "スクリプトプロパティ LINE_ACCESS_TOKEN / LINE_USER_ID / SHEET_ID を設定してください。",
    );
  }

  const calendarIds = getCalendarIds(sheetId);
  const today = new Date();
  const events = getTodayEvents(calendarIds, today);
  const message = buildMessage(events, today);

  sendLinePush(accessToken, userId, splitMessage(message));
}

/**
 * スプレッドシートのA列からカレンダーIDを取得する（ヘッダなし）
 */
const getCalendarIds = (sheetId) => {
  const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return [];

  const values = sheet.getRange(1, 1, lastRow, 1).getValues();
  const ids = values
    .map((row) => String(row[0]).trim())
    .filter((id) => id !== "");

  return Array.from(new Set(ids)); // 重複排除
};

/**
 * 全カレンダーの本日の予定を取得し、開始時刻順に並べて返す
 */
const getTodayEvents = (calendarIds, today) => {
  const events = [];

  for (const id of calendarIds) {
    const calendar = CalendarApp.getCalendarById(id);
    if (!calendar) {
      console.warn("カレンダーにアクセスできません: " + id);
      continue;
    }

    const calendarName = calendar.getName();
    for (const ev of calendar.getEventsForDay(today)) {
      events.push({
        calendarName: calendarName,
        title: ev.getTitle() || "(タイトルなし)",
        isAllDay: ev.isAllDayEvent(),
        start: ev.getStartTime(),
        end: ev.getEndTime(),
        location: ev.getLocation(),
      });
    }
  }

  // 終日予定を先頭に、その後は開始時刻順
  events.sort((a, b) => {
    if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
    return a.start - b.start;
  });

  return events;
};

/**
 * LINE送信用メッセージを組み立てる
 */
const buildMessage = (events, today) => {
  const tz = Session.getScriptTimeZone();
  const dateStr = Utilities.formatDate(today, tz, "M/d(E)");
  const header = "📅 " + dateStr + " の予定";

  if (events.length === 0) {
    return header + "\n\n本日の予定はありません。";
  }

  const lines = events.map((ev) => {
    const time = ev.isAllDay
      ? "終日"
      : Utilities.formatDate(ev.start, tz, "HH:mm") +
        "-" +
        Utilities.formatDate(ev.end, tz, "HH:mm");

    let line = "■ " + time + " " + ev.title + "\n   [" + ev.calendarName + "]";
    if (ev.location) line += "\n   📍" + ev.location;
    return line;
  });

  return header + "\n\n" + lines.join("\n\n");
};

/**
 * 5000文字を超える場合に備えて、行単位で分割する
 */
const splitMessage = (text) => {
  if (text.length <= LINE_MAX_TEXT_LENGTH) return [text];

  const chunks = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (!current) {
      current = line;
      continue;
    }
    if (LINE_MAX_TEXT_LENGTH < (current + "\n" + line).length) {
      chunks.push(current);
      current = line;
      continue;
    }
    current += "\n" + line;
  }
  if (current) chunks.push(current);
  return chunks;
};

/**
 * LINEへプッシュ送信する（1リクエスト最大5メッセージ）
 */
const sendLinePush = (accessToken, userId, texts) => {
  for (let i = 0; i < texts.length; i += 5) {
    const messages = texts
      .slice(i, i + 5)
      .map((t) => ({ type: "text", text: t }));

    const res = UrlFetchApp.fetch(LINE_PUSH_URL, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + accessToken },
      payload: JSON.stringify({ to: userId, messages: messages }),
      muteHttpExceptions: true,
    });

    const code = res.getResponseCode();
    if (code === 200) continue;
    throw new Error("LINE送信失敗: HTTP " + code + " " + res.getContentText());
  }
};
