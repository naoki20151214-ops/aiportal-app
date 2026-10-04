---
id: "BAS-0002"
title: "機械学習とは？ルールを書くプログラムとの違いから理解する"
slug: "what-is-machine-learning"
description: "機械学習とは何かを、普通のプログラムとの違い、データ・モデル・学習・推論、教師あり・教師なし・強化学習、汎化・過学習、生成AIとの関係まで体系的に解説します。"
category: "AI基礎・技術"
level: 0
type: "concept"
status: "ready"
publishedAt: "2026-10-04"
updatedAt: "2026-10-04"
author: "AI Portal編集部"
thumbnail: "/images/articles/what-is-machine-learning/hero.jpg"
tags: ["機械学習", "Machine Learning", "AI", "モデル", "学習", "推論", "入門"]
---

機械学習（Machine Learning）は、現在のAIを理解するうえで最も重要な基礎概念の一つです。

ChatGPT、画像認識、迷惑メール判定、需要予測、推薦システム、不正利用検知、音声認識など、多くのAIで機械学習の考え方が使われています。

ただし「機械学習＝AI」ではありません。

AIという大きな分野の中に、知識やルールを人間が明示するシンボリックAIもあれば、データからパターンを学ぶ機械学習もあります。

この記事では、**機械学習は普通のプログラムと何が違うのか**を出発点にして、

- データ
- 特徴
- モデル
- パラメータ
- 学習
- 損失
- 検証
- 推論
- 教師あり・教師なし・強化学習
- 汎化と過学習
- 生成AIとの関係

まで、一つの流れとして理解できるように整理します。

前提として、[AIとは何か？](/articles/what-is-ai)を読んでおくと、AI全体の中での位置づけが分かりやすくなります。

![普通のプログラムと機械学習の違い](/images/articles/what-is-machine-learning/hero.jpg)

*普通のプログラムは人間がルールを書き、機械学習はデータから判断に役立つパターンを学びます。*

## 最初に結論：人間が判断ルールを全部書く代わりに、データからパターンを学ぶ

NISTはMachine Learningについて、データから適応・学習し、性能を改善することを目的としたコンピューターシステムの開発・利用という趣旨で説明しています。

普通のプログラムでは、人間が「こういう入力なら、こう処理する」という手順を直接書きます。

機械学習では、

1. データを用意する
2. モデルへ入力する
3. 予測結果と正解の差を計算する
4. モデル内部のパラメータを調整する
5. 未知の入力でも予測できるようにする

という流れを使います。

ポイントは、

> **ルールそのものを全部人間が書くのではなく、データからルールに相当するパターンを獲得させる**

ことです。

ただし、ここで誤解してはいけません。

機械学習は「データを入れれば勝手に正しいAIができる仕組み」ではありません。

- 何を予測するか
- どのデータを使うか
- 何を正解とするか
- どの評価指標を見るか
- どのモデルを使うか
- どこまで間違いを許容するか

は、人間が設計する必要があります。

## AI・機械学習・ディープラーニング・生成AIの関係

まず全体の位置関係を整理しましょう。

![AI・機械学習・ディープラーニング・生成AIの関係](/images/articles/what-is-machine-learning/fig-01-hierarchy.jpg)

*機械学習はAIの一部で、ディープラーニングは機械学習の一部です。生成AIの多くも、この系譜の上にあります。*

大まかには、

- **AI**：知的な働きを機械で実現する広い分野
- **機械学習**：データからパターンを学ぶAIの主要手法
- **ディープラーニング**：多層ニューラルネットワークを使う機械学習
- **生成AI**：文章・画像・音声・動画などを生成するAI

という関係です。

つまり、ChatGPTはAIであり、機械学習の発展上にあり、さらにディープラーニング・大規模言語モデルの技術を使っています。

一方で、AIのすべてが機械学習ではありません。

シンボリックAIのように、人間が知識やルールを明示する方式も存在します。

## 普通のプログラムとの違い

違いが最も分かりやすいのは、判断ルールを誰が書くかです。

### 普通のプログラム

たとえば送料計算なら、

- 2kg以下 → 500円
- 5kg以下 → 800円
- 10kg以下 → 1200円

といったルールを人間が直接書けます。

このように条件が明確なら、普通のプログラムの方が正確で分かりやすい場合があります。

### 機械学習

一方で、「写真に猫が写っているか」をif文だけで書こうとすると難しくなります。

猫には、

- 毛色が違う
- 顔の向きが違う
- 大きさが違う
- 光の当たり方が違う
- 背景が違う
- 一部しか写っていない
- 子猫・成猫・種類も違う

など、無数の変化があります。

人間が、

> 耳がこの角度なら猫  
> 毛色がこの範囲なら猫

とルールを全部書くのは現実的ではありません。

そこで多数の猫画像と猫でない画像を使って、**猫を見分けるために役立つパターンをモデルへ学ばせる**方法を取ります。

## 機械学習システムを「入力→モデル→出力」で見る

機械学習を難しく感じたら、まず3つに分けると理解しやすくなります。

![機械学習システムの基本構造](/images/articles/what-is-machine-learning/fig-02-system.jpg)

### 入力

モデルへ渡すデータです。

例：

- 画像
- 文章
- 音声
- 顧客情報
- センサーデータ
- 売上履歴

### モデル

入力を処理して予測を出す仕組みです。

モデル内部には、訓練によって調整されたParameterが含まれます。

### 出力

モデルが返す結果です。

例：

- 猫 / 犬
- 不良 / 正常
- 価格予測
- 解約確率
- 次に出る単語
- 推薦商品

この3つを意識すると、複雑なAIでも「何を入れて、何が処理し、何を返すか」という基本構造が見えます。

## Dataとは何か

機械学習ではDataが中心です。

ただし「データが多ければよい」という単純な話ではありません。

### 入力データ

モデルへ渡す情報です。

住宅価格予測なら、

- 面積
- 築年数
- 駅からの距離
- 地域
- 間取り

などです。

### Label

教師あり学習では、正解を示すLabelを持つことがあります。

画像分類なら、

- この画像 → 猫
- この画像 → 犬

という正解です。

住宅価格なら実際の販売価格がLabelになります。

### Feature

予測に使う入力の特徴をFeatureと呼びます。

たとえば住宅なら、

- 面積
- 築年数
- 駅距離

がFeatureです。

昔の機械学習では、人間がどのFeatureを使うか設計するFeature Engineeringが非常に重要でした。

ディープラーニングでは、Featureの一部をモデル自身が学ぶことができます。

## Modelとは何か

GoogleのMachine Learning Glossaryでは、Modelを入力データを処理して出力を返す数学的構造として説明しています。

モデルは、

> 入力と出力の関係を近似する仕組み

と考えると分かりやすいでしょう。

住宅価格なら、

入力：

- 面積
- 築年数
- 駅距離

出力：

- 推定価格

です。

画像分類なら、

入力：

- 画像

出力：

- 猫 93%
- 犬 5%
- その他 2%

のようになります。

## Parameterとは何か

機械学習モデルの内部には、訓練によって調整される値があります。

これをParameterと呼びます。

単純な直線モデルなら、

予測値 = 重み × 入力 + バイアス

という形で、

- Weight（重み）
- Bias（バイアス）

がParameterになります。

ニューラルネットワークではParameter数が非常に多くなります。

重要なのは、

> **Parameterは人間が一つずつ決めるのではなく、Dataを使ったTrainingによって調整される**

という点です。

## Learningとは何をしているのか

「AIが学習する」という言葉は人間の勉強のように聞こえます。

しかし機械学習で起きていることは、もっと具体的です。

単純化すると、

1. 入力をモデルへ入れる
2. 予測を出す
3. 正解と比べる
4. 間違いの大きさを数値化する
5. 間違いが小さくなる方向へParameterを調整する
6. 多数のDataで繰り返す

という処理です。

## Lossとは何か

予測の間違いを数値化する仕組みをLoss Function（損失関数）と呼びます。

たとえば住宅価格を、

実際：3000万円  
予測：2500万円

と外したとします。

この差を何らかの方法で数値化します。

モデルは、そのLossが小さくなるようにParameterを更新します。

機械学習のTrainingは、

> **何を正解とし、どんな間違いを大きく罰するか**

を定義する作業でもあります。

だからLoss Functionの設計は重要です。

## Trainingの基本サイクル

機械学習の学習工程をまとめると、

**Data  
→ Model  
→ Prediction  
→ Loss  
→ Parameter Update  
→ もう一度Prediction**

というループになります。

この処理を大量のDataで繰り返し、予測性能を改善します。

ディープラーニングでは、Gradient DescentやBackpropagationなどを使ってParameterを更新します。

これらは後続記事で詳しく扱います。

## TrainingとInferenceは違う

初心者が混同しやすいのがTrainingとInferenceです。

### Training

Dataを使ってModelのParameterを調整する工程。

### Inference

Training済みModelへ新しい入力を与え、予測を出す工程。

迷惑メール判定なら、

**Training**
大量の正常メール・迷惑メールから判定Modelを作る

**Inference**
新しく届いたメールを判定する

です。

LLMでも同じ考え方があります。

巨大な計算資源を使ってModelをTrainingし、その後ユーザーからPromptを受けて回答を生成する処理はInferenceです。

## なぜTraining・Validation・Testを分けるのか

Training Dataだけで性能を測ると危険です。

モデルがTraining Dataを覚えているだけかもしれないからです。

そこで、

- Training Set：学習に使う
- Validation Set：設定調整に使う
- Test Set：最後の評価に使う

と分けます。

この考え方は機械学習の非常に重要な基礎です。

詳しくは後続の「訓練・検証・テストデータの違い」で扱います。

## 教師あり学習

Supervised Learning（教師あり学習）では、

**入力 + 正解Label**

を使います。

例：

- 写真 → 猫
- 写真 → 犬
- 顧客情報 → 解約
- 住宅情報 → 実際の販売価格

モデルは入力と正解の関係を学びます。

代表的な問題はClassificationとRegressionです。

### Classification

カテゴリを予測します。

例：

- 正常 / 不良
- スパム / 正常メール
- 猫 / 犬 / 鳥

### Regression

連続的な数値を予測します。

例：

- 住宅価格
- 売上
- 温度
- 需要量

## 教師なし学習

Unsupervised Learning（教師なし学習）では、正解Labelを与えず、Dataの中にある構造やまとまりを探します。

代表例がClusteringです。

たとえば顧客を、

- 価格重視
- 高頻度購入
- 高単価
- 休眠顧客

などの似たPatternごとに分ける用途があります。

教師なし学習では、

> このDataにはどんな構造があるのか

を探します。

## 強化学習

Reinforcement Learning（強化学習）では、Agentが環境の中で行動し、その結果として得られるRewardを参考に行動方針を改善します。

たとえばゲームなら、

- 良い行動 → Reward
- 悪い行動 → 低いReward

を使って、より良い行動を学びます。

ロボット制御、ゲーム、意思決定などで研究されています。

教師あり学習のように「この入力の正解はこれ」と直接教えるのではなく、

**行動の結果を評価する**

のが特徴です。

## 自己教師あり学習という重要な考え方

現代AIではSelf-Supervised Learning（自己教師あり学習）も非常に重要です。

これはDataそのものから学習課題を作る方法です。

たとえば文章なら、

> 文の続きを予測する

という課題を作れます。

人間が一つずつLabelを付けなくても、大量のTextを学習材料にできます。

大規模言語モデルが巨大Dataから学べる背景には、こうした考え方があります。

## 良いModelとは何か

Training Dataを完璧に覚えたModelが、必ずしも良いModelではありません。

本当に重要なのは、

> **見たことのないDataでも適切に予測できること**

です。

これをGeneralization（汎化）と呼びます。

## Overfittingとは何か

Training Dataへ合わせすぎると、未知Dataで性能が落ちることがあります。

これがOverfitting（過学習）です。

たとえば、

Training Accuracy：99.9%  
Test Accuracy：70%

なら、Training Dataへ過度に適合している可能性があります。

モデルが本質的なPatternではなく、

- Noise
- 偶然の特徴
- Training Data固有の癖

まで覚えてしまうからです。

## Underfittingとは何か

逆にModelが単純すぎて、Training Dataすら十分に表現できない状態をUnderfittingと呼びます。

良い機械学習では、

- 複雑すぎない
- 単純すぎない
- 未知DataへGeneralizeできる

バランスが重要です。

## 機械学習が広がった理由

機械学習の考え方自体は新しくありません。

しかし1990〜2010年代以降、急速に実用性が高まりました。

![機械学習が広がった背景](/images/articles/what-is-machine-learning/fig-05-history.webp)

大きな理由は、

### Dataが増えた

Web、スマートフォン、センサー、企業システムなどから大量Dataを使えるようになりました。

### 計算能力が向上した

CPUやGPUの性能が上がり、複雑なModelを現実的な時間でTrainingできるようになりました。

### Algorithmが改善した

学習方法、Optimization、Model Architectureなどが進歩しました。

### Softwareが使いやすくなった

Machine Learning FrameworkやCloud環境が普及し、研究だけでなく企業でも使いやすくなりました。

## Dataが多ければ必ず良いのか

いいえ。

Data Qualityは量と同じくらい重要です。

問題になる例として、

- Labelが間違っている
- Dataが偏っている
- 同じDataが重複している
- 現実の利用状況と分布が違う
- 将来情報が誤って混入している
- 特定の集団だけ少ない

などがあります。

Dataが悪ければ、高性能なModelでも良い結果は出ません。

## Data Leakageとは何か

本来予測時に使えない情報がTrainingへ混ざる問題をData Leakageと呼びます。

たとえば、

> 病気を予測するModel

なのに、

> 診断後にしか分からない情報

を入力してしまえば、高精度に見えるかもしれません。

しかし実運用では使えません。

評価の数字だけを見ると見逃しやすい、重要な問題です。

## Biasとは何か

Dataに偏りがあれば、Modelにも偏りが入る可能性があります。

たとえば特定地域・年齢・性別だけに偏ったDataで学習すると、別の集団で性能が低下することがあります。

だからMachine Learningでは、

> ModelだけでなくDataを評価する

ことが重要です。

## 機械学習は確率的な判断をすることが多い

多くのModelは、単純なYes / Noではなく、ProbabilityやScoreを返します。

たとえば画像分類なら、

- 猫：0.93
- 犬：0.05
- その他：0.02

のような出力です。

そのため、

- Probability
- Distribution
- Uncertainty
- Threshold

の理解が重要になります。

「猫93%」だから必ず猫、という意味ではありません。

## AccuracyだけでModelを評価してよいのか

問題によります。

たとえば1000件中990件が正常で、10件だけ不正だとします。

全部「正常」と答えてもAccuracyは99%です。

しかし不正を一件も見つけていません。

そこで、

- Precision
- Recall
- F1
- ROC-AUC

など、目的に応じた評価指標を使います。

Machine Learningでは、

> **何を成功と定義するか**

が非常に重要です。

## 機械学習が得意なこと・苦手なこと

![AI・機械学習の得意なことと注意点](/images/articles/what-is-machine-learning/fig-04-strengths.jpg)

### 得意

- 大量DataからPatternを見つける
- 画像・音声の認識
- 需要・価格などの予測
- 異常検知
- 推薦
- 自然言語処理

### 苦手・注意が必要

- Trainingと大きく違う状況
- Dataに存在しない例
- 正しさの完全保証
- 因果関係の断定
- 説明責任が必要な高リスク判断

「機械学習なら万能」ではありません。

## 機械学習と生成AI

生成AIも機械学習の発展上にあります。

大規模言語モデルでは、大量のTextなどからPatternを学び、与えられたContextに続くTokenを予測します。

画像生成AIでは、大量の画像・Textの関係を学びます。

つまり生成AIは、

> 「過去の情報を検索してそのまま出すだけ」

ではありません。

Trainingによって獲得したParameterを使い、新しい出力を生成します。

## 機械学習とディープラーニング

Deep LearningはMachine Learningの一分野です。

最大の特徴は、多層Neural Networkを使い、FeatureそのものもDataから学びやすくしたことです。

従来のMachine Learningでは、

人間がFeatureを設計  
↓  
Modelへ入力

という流れが多くありました。

Deep Learningでは、

Raw Data  
↓  
ModelがFeatureを学習  
↓  
Prediction

という形が可能になります。

これが画像・音声・自然言語で大きな成果につながりました。

## 機械学習はAIの全体地図のどこにある？

![AI全体の中での機械学習の位置](/images/articles/what-is-machine-learning/fig-03-ai-map.jpg)

機械学習はAIの中核ですが、AI全体ではありません。

AIには、

- シンボリックAI
- 機械学習
- 生成AI
- AIエージェント
- フィジカルAI
- ロボティクス

など、複数の領域があります。

この全体地図を持っておくと、「新しいAI用語が出たときにどこへ位置づければよいか」が分かりやすくなります。

## よくある誤解

### 「Machine Learningならルールは不要」

違います。

実際のAIシステムでは、

- Access Control
- Safety Rule
- 入力検証
- 業務条件
- 法的条件

など、多数のRuleと組み合わせます。

### 「Dataを増やせば自動的に賢くなる」

違います。

Quality、Bias、Label、Distributionが重要です。

### 「TrainingすればModelが正しさを理解する」

Modelは、与えられたDataとObjectiveに基づいてOptimizationされます。

人間と同じ意味で「正しい」と理解しているとは限りません。

### 「Accuracyが高ければ実用化できる」

違います。

- どんな間違いをするか
- 誰に弱いか
- 推論速度
- Cost
- Explainability
- Security

なども必要です。

### 「機械学習は一度作れば終わり」

違います。

現実のData Distributionは変化します。

商品、顧客、設備、社会状況が変われば、Model性能も変わります。

そのため、

- Monitoring
- 再評価
- 再Training
- Data更新

が必要になります。

## 機械学習を一言で説明するなら

機械学習とは、

> **すべての判断Ruleを人間が直接書くのではなく、Dataから予測に役立つPatternをModelへ学習させる方法**

です。

ただし、

> 人間が何もしなくてよい

という意味ではありません。

むしろ、

- 問題設定
- Data設計
- Model選択
- Evaluation
- 運用

が重要になります。

## まとめ

機械学習は、現代AIの中心的な技術です。

基本の流れは、

**Data  
→ Model  
→ Prediction  
→ Loss  
→ Parameter Update  
→ Validation  
→ Inference**

です。

そしてMachine Learningを理解するときに最も重要なのは、

> **Training Dataで当たることではなく、未知DataへGeneralizeできること**

です。

教師あり学習、教師なし学習、強化学習、自己教師あり学習など、学び方には複数の種類があります。

その上にDeep Learningが発展し、現在のLarge Language ModelやGenerative AIへつながっています。

「AIが学習する」という曖昧な表現を、

- 何をDataとして使うのか
- 何を予測するのか
- 何をLossとして減らすのか
- どのParameterを更新するのか
- 未知Dataでどれくらい通用するのか

まで分解して考えられるようになれば、機械学習の基本はかなり見えてきます。

## 次に読む

- **統計的機械学習とは？** — 限られたDataから未知Dataへ一般化する考え方（準備中）
- **訓練・検証・テストデータの違い** — Modelを正しく評価するためのData分割（準備中）
- **ハイパーパラメータとは？** — Modelが学ぶParameterと、人が調整する設定の違い（準備中）
- **AIに必要な確率の基礎** — 不確実性をどう数値で扱うか（準備中）
- **ディープラーニングとは？** — 多層Neural Networkが何を変えたのか（準備中）

## 参考資料

- [NIST CSRC Glossary - Machine Learning](https://csrc.nist.gov/glossary/term/machine_learning)
- [Google for Developers - Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/)
- [Google for Developers - Machine Learning Glossary](https://developers.google.com/machine-learning/glossary/fundamentals)
- [Deep Learning Book - Machine Learning Basics](https://www.deeplearningbook.org/contents/ml.html)
- [Deep Learning Book - Deep Feedforward Networks](https://www.deeplearningbook.org/contents/mlp.html)
