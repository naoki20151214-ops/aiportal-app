---
id: "BAS-0033"
title: "エキスパートシステムとは？専門家の知識をルール化したAI"
slug: "expert-systems"
description: "エキスパートシステムとは何かを、知識ベース・推論エンジン・Knowledge Engineering・DENDRAL・MYCIN・XCONまで体系的に解説。機械学習との違いと生成AI時代への教訓も整理します。"
category: "AI基礎・技術"
level: 1
type: "concept"
status: "review"
publishedAt: "2026-10-04"
updatedAt: "2026-10-04"
author: "AI Portal編集部"
thumbnail: "/images/articles/expert-systems/hero.webp"
tags: ["エキスパートシステム", "知識ベース", "推論エンジン", "Knowledge Engineering", "MYCIN", "DENDRAL", "シンボリックAI"]
---

エキスパートシステムは、**特定分野の専門家が持つ知識や判断ルールをコンピューターへ移し、診断・判定・助言・構成などを行うAI**です。

現在のAIというと、大規模言語モデルやニューラルネットワークが主役に見えます。しかしAIの歴史では、1970〜1980年代にエキスパートシステムが非常に大きな存在感を持っていました。

なぜなら、当時の研究者たちは一つの重要な事実に気づいたからです。

> **賢い推論方法だけでは足りない。高い性能には、その分野について「何を知っているか」が重要である。**

この考え方は、現在のRAG、Knowledge Graph、業務ルール、AIエージェントにもそのままつながります。

前提として、[シンボリックAIとは？](/articles/symbolic-ai)を読んでおくと、エキスパートシステムがAI全体のどこに位置するか理解しやすくなります。

![エキスパートシステムと知識ベースのイメージ](/images/articles/expert-systems/hero.webp)

*エキスパートシステムは、専門家の知識をKnowledge Baseへ蓄え、RuleとInference Engineで判断へ変えるAIです。*

## 最初に結論：専門家の「知っていること」と「判断のしかた」を分けて持つAI

エキスパートシステムの中心思想は、専門家の能力を二つに分けて考えることです。

1. **何を知っているか**
2. **その知識をどう使って判断するか**

典型的には、

- Knowledge Base：専門知識・事実・ルール
- Inference Engine：知識を使って推論する仕組み
- Working Memory：現在の問題について分かっている事実
- User Interface：質問・回答をやり取りする部分
- Explanation Facility：なぜその判断になったか説明する部分

などから構成されます。

たとえば設備故障診断なら、

**Knowledge Base**
- モーターが起動しない原因候補
- 電源異常の条件
- 過負荷の症状
- センサー異常の特徴

**Inference Engine**
- 現在の症状とルールを照合
- 条件に合う原因候補を絞る
- 次に確認すべき項目を提示

という役割分担になります。

![エキスパートシステムの基本構造](/images/articles/expert-systems/fig-01-architecture.webp)

*知識そのものと、その知識を使う推論処理を分けることが、エキスパートシステムの基本設計です。*

## 具体例：設備故障をどう診断するか

工場設備を例に考えてみましょう。

症状：

- モーターが起動しない
- 電源電圧は正常
- 過負荷リレーが作動
- 異音があった

熟練保全員なら、

> 電源そのものではなく、負荷側や機械的拘束を先に疑う

かもしれません。

この判断をルール化すると、

**IF**
- モーター起動 = 失敗
- 電源 = 正常
- 過負荷リレー = 作動

**THEN**
- 過負荷原因を優先確認

さらに、

**IF**
- 過負荷
- 回転軸が手動でも重い

**THEN**
- ベアリング・機械拘束・負荷側を確認

といったルールを追加できます。

こうして熟練者の切り分け手順をKnowledge Baseへ蓄積すると、経験の浅い担当者でも一定の順序で確認できます。

エキスパートシステムの価値は、単に「答えを出すこと」だけではありません。

**熟練者の判断手順を組織の知識として再利用できること**にあります。

## Knowledge Baseとは何か

Knowledge Baseは、対象分野についてシステムが持つ知識の集合です。

ただし、単なる文章データベースとは違います。

推論に使えるよう、

- 事実
- ルール
- 概念間の関係
- 例外
- 優先順位
- 条件
- 原因と症状

などを構造化して持ちます。

たとえば設備保全なら、

- 「圧力が下がらない」
- 「ポンプは運転中」
- 「ゲートバルブは開」
- 「Oリング交換後」
- 「リークテスト未実施」

といった事実を扱います。

そして、

> IF ポンプ運転中 AND バルブ開 AND 圧力改善なし  
> THEN リーク系統を疑う

というKnowledgeを利用します。

![Knowledge BaseとRuleの関係](/images/articles/expert-systems/fig-02-knowledge-base.webp)

*Knowledge Baseは「専門家が知っていること」を、コンピューターが使える構造へ変換したものです。*

## Knowledge Engineeringとは何か

専門家の頭の中にある知識を、そのままコンピューターへコピーすることはできません。

そこで必要になるのが**Knowledge Engineering（知識工学）**です。

Knowledge Engineerは専門家へ質問し、

- 何を見て判断するのか
- どの条件を重視するのか
- 例外は何か
- 判断に迷うケースは何か
- どの順番で確認するのか

を整理します。

たとえば熟練者が、

> 「この音ならベアリングっぽい」

と言ったとします。

そのままではルールになりません。

そこで、

- 音の種類は？
- 回転数との関係は？
- 温度は上がっているか？
- 振動値は？
- 発生タイミングは？

と分解し、再現可能なKnowledgeへ変換します。

この作業こそ、エキスパートシステム開発の難しい部分でした。

## Knowledge Acquisition Bottleneck

エキスパートシステムで有名な問題が**Knowledge Acquisition Bottleneck**です。

直訳すると「知識獲得のボトルネック」。

つまり、

> 専門家が持っている知識を、十分な量・品質でシステムへ移すのが非常に大変

という問題です。

専門家の知識には、

### 明示知

言葉にしやすい知識。

例：
- 圧力規定値
- 作業手順
- 判定基準
- 許容温度

### 暗黙知

言葉にしにくい経験的知識。

例：
- 「いつもと音が違う」
- 「この振動は嫌な感じがする」
- 「このアラームの出方なら別系統を疑う」

があります。

暗黙知を完全にルールへ変換するのは非常に難しい。

しかも専門家同士で判断が違うこともあります。

この問題は、現代のAIでも消えていません。

企業固有の業務知識をRAGへ入れる場合でも、**そもそも正しいKnowledgeを整理できているか**が重要です。

## Inference Engine：Knowledgeを「判断」に変える

Knowledge Baseへ知識を入れただけでは、答えは出ません。

その知識を現在の問題へ適用する仕組みが**Inference Engine（推論エンジン）**です。

Inference Engineは、

1. 現在分かっている事実を確認
2. 条件に合うRuleを探す
3. Ruleを適用
4. 新しい事実・結論を得る
5. 必要なら次のRuleへ進む

という処理を行います。

![Inference Engineによる推論のイメージ](/images/articles/expert-systems/fig-03-inference-engine.webp)

*事実とRuleを照合しながら、原因候補や次に確認すべき項目を絞り込んでいきます。*

## Forward Chaining：事実から結論へ

Forward Chaining（前向き推論）は、

**今分かっている事実から、使えるRuleを順番に適用する**

方法です。

設備監視なら、

温度 = 高い  
↓  
過熱Rule成立  
↓  
冷却異常候補  
↓  
冷却水流量を確認  
↓  
流量不足  
↓  
チラー・配管系を確認

というように進みます。

監視や異常検知のように、事実が次々入ってくる問題と相性があります。

## Backward Chaining：仮説から必要条件へ

Backward Chaining（後ろ向き推論）は逆です。

まず、

> 「原因は冷却系なのか？」

という仮説を置きます。

その仮説が成立するために必要な条件を逆向きに確認します。

- 冷却水流量は不足している？
- 温度上昇はある？
- チラーは正常？
- バルブは開いている？

という流れです。

診断やQ&A型システムでは非常に使いやすい考え方です。

## 不確実性はどう扱うのか

現実の専門判断は、必ずしもYes / Noで決まりません。

医師でも、

> この病気である可能性が高い

のように不確実性を持って判断します。

エキスパートシステムでも、

- 確信度
- 信頼度
- 確率
- Certainty Factor

などを使って、不確実性を扱う研究が行われました。

MYCINでは、単純な真偽だけでなく、ルールの確からしさを扱う仕組みが利用されました。

ここは重要です。

**Rule-basedだから必ず完全に確定的、というわけではありません。**

## Explanation Facility：なぜその答えになったのか

エキスパートシステムの大きな特徴が、判断理由を説明しやすいことです。

たとえば、

> なぜリークを疑うのか？

という質問に、

- ポンプは運転中
- バルブは開状態
- 圧力改善なし
- Oリング交換直後

という事実と、

> これらの条件が成立した場合はシール・リーク系統を優先確認する

というRuleを示せます。

現代でいう**Explainability（説明可能性）**に近い価値です。

ただし、

> 説明できる = 正しい

ではありません。

Knowledge Baseの知識が間違っていれば、間違ったRuleを非常に論理的に説明することもできます。

## DENDRAL：専門知識の力を示した代表例

エキスパートシステム史で重要なのが**DENDRAL**です。

StanfordでEdward Feigenbaum、Joshua Lederbergらが進めたDENDRALは、化学分野で分子構造の候補を推定する研究として発展しました。

DENDRALが示した大きな教訓は、

> **AIの性能は、汎用的な推論能力だけでなく、専門領域のKnowledgeに大きく依存する**

ということです。

StanfordのFeigenbaum Collectionでも、DENDRALは初期の重要なエキスパートシステムとして位置づけられています。

この考え方は、後のExpert System研究へ大きな影響を与えました。

## MYCIN：医療分野のRule-based AI

もう一つ有名なのが**MYCIN**です。

MYCINは1970年代にStanfordで研究されたRule-based Expert Systemで、感染症に関する診断や治療助言を扱いました。

システムは医師へ質問し、

- 患者の症状
- 検査結果
- 感染部位
- 病原体候補

などを確認しながらRuleを適用します。

StanfordのRule-Based Expert Systems資料では、MYCINが多数のRuleと医学知識を使って相談形式で推論し、その理由を説明する例が紹介されています。

MYCINから学べるのは、

**専門分野を狭く限定すれば、比較的単純なRule形式でも高度な相談システムを作れる**

という点です。

## XCON：研究室から企業実務へ

エキスパートシステムは研究だけではありません。

Digital Equipment Corporation（DEC）で使われた**XCON（R1）**は、コンピューターシステムの構成支援へRule-based Expert Systemを利用した代表例です。

顧客の注文に応じて、

- 必要な部品
- 組み合わせ
- 構成条件

をチェックし、適切なシステム構成を支援しました。

XCONの重要な教訓は成功だけではありません。

運用を続けるには、

- Knowledgeの修正
- Rule追加
- 製品変更への追従
- Knowledge Engineerの継続作業

が必要でした。

つまり、

> **Expert Systemは作って終わりではない。Knowledgeを維持する仕組みが必要**

ということです。

これは現代の企業AIにもそのまま当てはまります。

## どんな分野で使われたのか

エキスパートシステムは、とくに「狭い専門領域」で力を発揮しました。

![エキスパートシステムの代表的な応用領域](/images/articles/expert-systems/fig-04-applications.webp)

*医療、プラント、地質、設備故障など、専門知識を構造化しやすい領域で活用が進みました。*

代表的な用途は、

- 医療診断
- 化学分析
- 地質・鉱物探査
- コンピューター構成
- 設備故障診断
- 金融判断
- プラント運転支援

などです。

共通しているのは、

**専門家が一定の判断ルールを持っている**

ことです。

## エキスパートシステムの強み

### 1. 専門知識を組織資産にできる

ベテラン一人の頭の中だけにあるKnowledgeを、システムへ残せます。

人材育成や技能継承にもつながります。

### 2. 判断を標準化できる

担当者によって判断が大きく変わる問題に、一定の基準を持たせられます。

### 3. 理由を説明しやすい

どのRuleを使ったか追跡できます。

### 4. 24時間同じ基準で判断できる

疲労や経験差の影響を受けにくくなります。

### 5. 大量の学習データが必須ではない

専門家がRuleを定義できれば、巨大Datasetがなくても動かせます。

## エキスパートシステムの弱み

![Knowledge Engineeringの難しさ](/images/articles/expert-systems/fig-05-knowledge-engineering.webp)

*最大の弱点は「専門知識をどう取り出し、正しく保ち続けるか」です。*

### 1. Knowledge Acquisition Bottleneck

専門家のKnowledgeを取り出すのが大変です。

### 2. Ruleが増えると複雑になる

100個なら管理できても、数千Ruleになると、

- Rule同士の矛盾
- 優先順位
- 例外
- 変更影響

が複雑になります。

### 3. 想定外に弱い

Knowledge Baseに存在しないケースでは判断できません。

### 4. Knowledgeが古くなる

制度、製品、装置、医療知識が変われば更新が必要です。

### 5. 曖昧な入力に弱い

画像・音声・自然言語のように、境界が曖昧な情報はRuleだけで処理しにくい場合があります。

こうした弱点が、機械学習が大きく伸びる背景の一つになりました。

## 機械学習との違い

最も重要な違いは、

**Knowledgeを誰が作るか**

です。

### エキスパートシステム

人間がKnowledgeを明示する。

- IF A THEN B
- この条件ならこの原因
- この場合はこの処置

### 機械学習

DataからModelがPatternを学習する。

- 正常画像
- 不良画像
- 実際の結果

などを使い、Parameterを調整します。

### 例：画像検査

Expert System：
- 傷の長さ > 5mm
- 特定位置に傷
- 輝度差 > 閾値
→ 不良

Machine Learning：
- 多数の正常・不良画像
→ Modelが特徴を学習
→ 不良確率を出力

Ruleを書ける問題ならExpert Systemが強い。

Ruleを書き切れない複雑なPatternならMachine Learningが強い。

## 「Expert Systemは機械学習に負けた」のか

単純にそう考えるのは正確ではありません。

確かに1980年代以降、AI研究の中心は統計的機械学習やニューラルネットワークへ移りました。

しかしExpert Systemが残した考え方は現在も使われています。

- Knowledge Base
- Rule Engine
- Inference
- Explanation
- Domain Knowledge
- Human Expert
- Knowledge Maintenance

これらは現代の企業AIでも重要です。

## 生成AI時代にExpert Systemから学べること

現在のLLMは、昔のExpert Systemとはまったく違う方式です。

それでも、Expert Systemの歴史から学べることは非常に多い。

### 1. AIの性能はDomain Knowledgeに依存する

モデル自体が高性能でも、

- 自社製品
- 社内規則
- 最新価格
- 装置仕様
- 業務手順

を知らなければ正しい仕事はできません。

だからRAG、Database、Knowledge Graphなどを組み合わせます。

### 2. KnowledgeはModelと分けた方がよい場合がある

頻繁に変わる情報をModel内部へ固定すると更新が大変です。

外部Knowledgeとして管理すれば、

- 更新
- 監査
- 修正
- 履歴管理

がしやすくなります。

### 3. Explanationは後付けではなく設計する

「AIがそう言った」だけでは業務で使えません。

- どの文書を参照したか
- どのRuleを使ったか
- どのDataから判断したか

を追跡できる設計が必要です。

### 4. Maintenanceが重要

Expert SystemではKnowledge Baseの保守が課題でした。

現代AIでも同じです。

- 古いRAG文書
- 誤った社内資料
- 古いPrompt
- 更新されないRule
- 廃止されたAPI

を放置すると、AI品質は劣化します。

## AIエージェントとの意外な共通点

AIエージェントも、LLMだけで動いているとは限りません。

たとえば企業の購買Agentなら、

1. LLMが依頼内容を理解
2. Databaseから商品情報取得
3. Rule Engineで予算上限確認
4. 権限Ruleで承認可否確認
5. APIで発注
6. Logへ記録

という構成にできます。

ここでは、

- LLM
- Database
- Rule
- Permission
- Tool

を組み合わせています。

つまり、現代AIはExpert Systemを捨てたというより、

**昔の明示的Knowledgeと、現代の学習モデルを組み合わせる方向へ進んでいる**

と見ることもできます。

## よくある誤解

### 「エキスパートシステムは古いから学ぶ価値がない」

違います。

企業AI、RAG、Agent、Knowledge Graphを理解するとき、Expert SystemのKnowledge設計思想は非常に参考になります。

### 「専門家のRuleを入れれば専門家を完全再現できる」

できません。

専門家には暗黙知があり、すべてをRuleへ変換できるわけではありません。

### 「説明できるから安全」

Explanationがあることと、Knowledgeが正しいことは別です。

### 「機械学習があればRuleは不要」

実務では逆です。

安全条件、権限、契約条件などは、Machine Learningへ任せず明示Ruleとして管理した方がよいことがあります。

## エキスパートシステムを一言で説明するなら

エキスパートシステムとは、

> **専門家のKnowledgeをコンピューターへ明示的に蓄え、Inference EngineでRuleを適用して、専門家のような判断・助言を行うAI**

です。

現代AIと比べると古い方式に見えます。

しかし、

- Knowledgeをどう管理するか
- AIへ何を任せるか
- 判断理由をどう残すか
- Knowledgeをどう更新するか

という問題は、今もまったく古くなっていません。

## まとめ

エキスパートシステムは、シンボリックAIの代表的な実用形態です。

基本構造は、

**専門家のKnowledge  
→ Knowledge Base  
→ Rule  
→ Inference Engine  
→ 判断・助言**

です。

DENDRAL、MYCIN、XCONなどを通じて、

> AIの性能は「推論方法」だけでなく「専門知識」に大きく依存する

ことを示しました。

一方で、

- Knowledge Acquisition Bottleneck
- Ruleの肥大化
- Maintenance
- 想定外への弱さ

という課題も明らかになりました。

そしてこの歴史は、現在のRAGやAIエージェントへ重要な教訓を残しています。

**強力なModelを持つだけでは足りない。  
正しいKnowledgeを、更新可能で、説明可能な形で管理する必要がある。**

これは生成AI時代でも非常に重要な設計原則です。

## 次に読む

- **機械学習とは？** — 人間がRuleを書くAIから、DataからPatternを学ぶAIへ何が変わったのか（準備中）
- **Knowledge Graphとは？** — 事実と関係をネットワークとして管理する方法（Core Curriculum後続）
- **RAGとは？** — Modelの外部にあるKnowledgeを検索して回答へ使う方法（Core Curriculum後続）

## 参考資料

- [Stanford HAI - What is an Expert System?](https://hai.stanford.edu/ai-definitions/what-is-an-expert-system)
- [Edward A. Feigenbaum Collection - Stanford University](https://cs.stanford.edu/people/eaf/wordpress/)
- [Edward A. Feigenbaum Collection - DENDRAL publications](https://cs.stanford.edu/people/eaf/wordpress/publications/)
- [Stanford - Rule-Based Expert Systems / MYCIN](https://i.stanford.edu/pub/cstr/reports/cs/tr/82/926/CS-TR-82-926.pdf)
- [AI Magazine - R1 and Beyond: AI Technology Transfer at DEC](https://onlinelibrary.wiley.com/doi/10.1609/aimag.v5i4.460)
