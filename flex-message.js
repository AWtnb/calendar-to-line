/**
 * Flex Messageの組み立て
 * カレンダーごとに1つのバブルを作り、カルーセルで並べる
 */

const MAX_BUBBLES = 12; // カルーセルの上限
const FALLBACK_COLOR = "#06C755";

/**
 * 時刻表示用の文字列を返す
 */
const formatTimeRange = (ev, tz) => {
  if (ev.isAllDay) return "終日";
  const start = Utilities.formatDate(ev.start, tz, "HH:mm");
  const end = Utilities.formatDate(ev.end, tz, "HH:mm");
  return `${start}-${end}`;
};

/**
 * 予定1件分の行を作る（左に時刻、右にタイトルと場所）
 */
const buildEventRow = (ev, tz) => {
  const detail = [
    { type: "text", text: ev.title, weight: "bold", size: "sm", wrap: true },
  ];
  if (ev.location) {
    detail.push({
      type: "text",
      text: ev.location,
      size: "xs",
      color: "#888888",
      wrap: true,
    });
  }

  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    contents: [
      {
        type: "text",
        text: formatTimeRange(ev, tz),
        size: "sm",
        color: "#888888",
        wrap: false,
        flex: 4,
      },
      {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        flex: 6,
        contents: detail,
      },
    ],
  };
};

/**
 * カレンダー1つ分のバブルを作る
 */
const buildBubble = (group, dateStr, tz) => ({
  type: "bubble",
  size: "kilo",
  header: {
    type: "box",
    layout: "vertical",
    backgroundColor: group.color || FALLBACK_COLOR,
    paddingAll: "lg",
    contents: [
      {
        type: "text",
        text: dateStr + " の予定",
        size: "xs",
        color: "#ffffffcc",
      },
      {
        type: "text",
        text: group.calendarName,
        size: "lg",
        weight: "bold",
        color: "#ffffff",
        wrap: true,
      },
    ],
  },
  body: {
    type: "box",
    layout: "vertical",
    spacing: "lg",
    contents: group.events.map((ev) => buildEventRow(ev, tz)),
  },
});

/**
 * 送信用のFlex Messageオブジェクトを作る
 */
const buildFlexMessage = (groups, today) => {
  const tz = Session.getScriptTimeZone();
  const dateStr = Utilities.formatDate(today, tz, "M/d (E)");
  const eventCount = groups.reduce((sum, g) => sum + g.events.length, 0);

  if (MAX_BUBBLES < groups.length) {
    console.warn(
      "カレンダー数が上限を超えたため、先頭 " +
        MAX_BUBBLES +
        " 件のみ送信します",
    );
  }

  return {
    type: "flex",
    altText: dateStr + " の予定（" + eventCount + "件）",
    contents: {
      type: "carousel",
      contents: groups
        .slice(0, MAX_BUBBLES)
        .map((g) => buildBubble(g, dateStr, tz)),
    },
  };
};
