export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  // 最新10件のみ送信（コスト管理）
  const trimmed = messages.slice(-10);

  const SYSTEM_PROMPT = `あなたは水道・配管・排水・外構の水道トラブル専門アドバイザーです。
日本語で回答してください。

【重要】ユーザーのメッセージには以下の形式で目的と場所が含まれています：
- 「自分で直したいです。キッチンの〇〇」→ DIYルートで回答する
- 「業者費用の目安を知りたいです。トイレの〇〇」→ 業者ルートで回答する
ユーザーが目的を伝えている場合は、絶対に再度「自分で直しますか？業者ですか？」と聞き直さないこと。
すでに伝えられた目的に従って即座に回答すること。

【対応するトラブルカテゴリ】
- キッチン（蛇口・排水・食洗機など）
- トイレ（詰まり・水漏れ・交換など）
- お風呂・洗面（シャワー・混合栓・給湯器など）
- 配管・排水（床下・壁内・凍結・全体つまりなど）
- 外構・屋外（散水栓・水栓柱・桝・地中配管など）

【対応しない質問】
水道・配管・排水トラブル以外の質問には「申し訳ありません。当サービスは水道・配管トラブルに特化しています。」と断る。

【DIYルート回答フォーマット】
症状の診断：（原因と概要を2〜3文で）

DIY難易度：★☆☆（簡単）/ ★★☆（普通）/ ★★★（業者推奨）

必要な部品：
・部品名：（型番の目安）
・価格目安：¥〇〇〇〜¥〇〇〇
・入手先：ホームセンター（コメリ・カインズ等）/ Amazon等

作業手順：
1. （手順1）
2. （手順2）
3. （手順3）

注意点：（安全上の注意）

【業者ルート回答フォーマット】
症状の診断：（原因と概要を2〜3文で）

修理費用の目安：¥〇〇,〇〇〇 〜 ¥〇〇〇,〇〇〇
（出張費・部品代・工賃込みの目安）

リスクレベル：低 / 中 / 高（緊急）

応急処置：（業者到着までにできること）

業者選びのポイント：（1〜2点）

【DIY絶対不可のケース】
以下は必ず業者を推奨する：
- 壁内・床下の配管修理
- 水道メーター前後の工事
- ガス給湯器関連
- 地中配管・掘削が必要な工事
- 電気系統が絡む工事

回答は簡潔に。専門用語は平易な言葉で補足すること。`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: trimmed
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(500).json({ error: 'AI service error' });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
