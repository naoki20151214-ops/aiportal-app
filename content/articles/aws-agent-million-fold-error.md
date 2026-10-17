---
id: "NEWS-0093"
title: "AIが売上を100万倍に!? AWSが明かした「正常に動くAI」の落とし穴"
slug: "aws-agent-million-fold-error"
description: "売上410ドルがAIの回答では約4億ドルに。AWSが公開前のテストで見つけた失敗例から、AIエージェントの監視で本当に大切なことを1分で解説。"
category: "AIニュース"
level: 0
type: "news"
status: "review"
publishedAt: "2026-10-17"
updatedAt: "2026-10-17"
author: "AI Portal編集部"
thumbnail: "/images/news/aws-agent-million-fold-error.webp"
tags: ["AWS", "AIエージェント", "Amazon Bedrock", "ハルシネーション", "AIの品質"]
adPolicy: "off"
---

**「410ドル」が、AIの回答では「約4億ドル」に。しかも、システムは正常に動いていました。**

2026年10月16日、AWSは社内の営業支援向けAIエージェントの品質管理事例を公開しました。

## 😱 何が起きた？

公開前のテストで、顧客の3か月分の売上 **410.08ドル** を、AIが **「410.08 Millionドル（約4億1000万ドル）」** と回答。金額を100万倍にしてしまったのです。

怖いのは、エラー画面が出なかったこと。処理速度などの監視は正常で、答えの間違いを見抜けませんでした。

## 🔍 AWSはどう対策した？

AWSは、正解データとの比較や公開後の定期チェックなど、**AIの答えの品質を9段階で検証する枠組み**を紹介しています。

AIが速く返事をしても、その内容まで正しいとは限りません。

**大切なのは「動いているか」より「正しい根拠で答えているか」。** 数字を使うときは、単位と出典も確認したいですね。

---

### もっと知る：AIはなぜ堂々と間違えるの？

[ハルシネーションの仕組みを学ぶ →](/articles/ai-hallucination)

**出典：** [AWS公式AIブログ（2026年10月16日）](https://aws.amazon.com/blogs/machine-learning/building-trust-in-ai-agents-a-production-ready-evaluation-framework-with-amazon-bedrock-agentcore/)

*編集注：上記の誤答は公開前のテストで発見された事例です。顧客に誤情報を伝えた事例ではありません。*
