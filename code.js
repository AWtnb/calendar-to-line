/**
 * 複数Googleカレンダーの本日の予定を、自分のLINEにFlex Messageで送信する
 *
 * 事前設定: スクリプトプロパティに以下を登録
 *   - LINE_ACCESS_TOKEN : LINE Messaging APIのチャネルアクセストークン
 *   - LINE_USER_ID      : 送信先のLINEユーザーID（Uから始まる33文字）
 *   - SHEET_ID          : カレンダーIDを列挙したスプレッドシートのID
 */

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

/**
 * メイン処理（トリガーから呼び出す）
 * トリガーとエディタの実行対象にするため function 宣言とする
 * 本日の予定がない場合は送信しない
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
  const groups = getTodayEventGroups(calendarIds, today);
  if (groups.length === 0) return;

  sendLinePush(accessToken, userId, [buildFlexMessage(groups, today)]);
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
 * 終日予定を先頭に、その後は開始時刻順にするための比較関数
 */
const compareEvents = (a, b) => {
  if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
  return a.start - b.start;
};

/**
 * カレンダーごとに本日の予定をまとめて返す
 * 予定のないカレンダーは含めない
 */
const getTodayEventGroups = (calendarIds, today) => {
  const groups = [];

  for (const id of calendarIds) {
    const calendar = CalendarApp.getCalendarById(id);
    if (!calendar) {
      console.warn("カレンダーにアクセスできません: " + id);
      continue;
    }

    const events = calendar.getEventsForDay(today).map((ev) => ({
      title: ev.getTitle() || "(タイトルなし)",
      isAllDay: ev.isAllDayEvent(),
      start: ev.getStartTime(),
      end: ev.getEndTime(),
      location: ev.getLocation(),
    }));
    if (events.length === 0) continue;

    events.sort(compareEvents);
    groups.push({
      calendarName: calendar.getName(),
      color: calendar.getColor(),
      events: events,
    });
  }

  return groups;
};

/**
 * LINEへプッシュ送信する（1リクエスト最大5メッセージ）
 */
const sendLinePush = (accessToken, userId, messages) => {
  const res = UrlFetchApp.fetch(LINE_PUSH_URL, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + accessToken },
    payload: JSON.stringify({ to: userId, messages: messages }),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code === 200) return;
  throw new Error("LINE送信失敗: HTTP " + code + " " + res.getContentText());
};
