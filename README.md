# README


複数Googleカレンダーの本日の予定を自分のLINEに送信するGoogle Apps Script


## 事前設定

1. スプレッドシートを作成し、A列にカレンダーIDを列挙（ヘッダ不要）
1. スクリプトプロパティに以下を登録
    - LINE_ACCESS_TOKEN : LINE Messaging APIのチャネルアクセストークン
        - [LINE Developersコンソール](https://developers.line.biz/console) から `Messaging API設定` タブを開き、 `チャネルアクセストークン（長期）` で発行。
    - LINE_USER_ID : 送信先のLINEユーザーID（Uから始まる33文字）
        - [LINE Developersコンソール](https://developers.line.biz/console)からチャンネルのトップ下部に表示される `あなたのユーザーID` の値。Uから始まる33文字。
    - SHEET_ID : カレンダーIDを列挙したスプレッドシートのID