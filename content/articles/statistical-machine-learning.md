---
id: "BAS-0034"
title: "統計的機械学習とは？データから一般化する考え方を理解する"
slug: "statistical-machine-learning"
description: "統計的機械学習とは何かを、母集団と標本、確率分布、推定、一般化、Bias/Variance、仮説空間、Regularization、評価設計まで体系的に解説します。"
category: "AI基礎・技術"
level: 1
type: "concept"
status: "review"
publishedAt: "2026-10-04"
updatedAt: "2026-10-04"
author: "AI Portal編集部"
thumbnail: "/images/articles/statistical-machine-learning/hero.svg"
tags: ["統計的機械学習", "機械学習", "統計", "確率", "一般化", "Bias Variance", "AI基礎"]
---

機械学習を学び始めると、「統計的機械学習」という言葉に出会います。

単に「統計を使う機械学習」という意味ではありません。

中心にあるのは、

> **限られた観測データから規則性を推定し、まだ見ていないデータへ一般化する**

という考え方です。

これは、機械学習を「手元のデータへ当てはめる作業」から「現実世界で使える予測へつなげる作業」へ変える視点です。

前提として、[機械学習とは？](/articles/what-is-machine-learning)を読んでおくと理解しやすくなります。

![統計的機械学習とは？Dataから未知の未来を予測する考え方](/images/articles/statistical-machine-learning/hero.svg)

*統計的機械学習は、手元のDataへ当てはめるだけでなく、未知DataへGeneralizeすることを目指します。*

## 最初に結論：統計的機械学習は「未知データに通用する規則性」を探す

統計的機械学習では、Training Dataへどれだけ正確に当てはまるかだけを見ません。

本当に知りたいのは、

**まだ見ていないDataでも同じ傾向が通用するか**

です。

たとえば1000人分の顧客Dataから解約予測Modelを作ったとします。

Training Dataの1000人には100%当たる。

しかし、新しい顧客1000人には60%しか当たらない。

このModelは、Training Dataをよく説明していても、実務ではあまり使えません。

統計的機械学習では、

- Dataは現実世界の一部しか観測していない
- 観測にはNoiseがある
- Dataの集め方にはBiasが入り得る
- 同じ現象でも毎回完全に同じ結果にはならない

ことを前提にします。

そして、

> 観測Dataの中に見えたPatternのうち、どこまでが偶然ではなく、未知Dataにも再現するのか

を考えます。

## Dataは「世界そのもの」ではない

機械学習ではDataが重要ですが、Dataは現実世界そのものではありません。

Dataは、現実世界から切り取った**標本（Sample）**です。

たとえば「日本の成人全体の購買傾向」を知りたいのに、

- 東京の20代
- オンライン利用者
- 特定サービスの会員

だけからDataを集めたとします。

このDataから全国の成人全体を推測すると、ずれる可能性があります。

ここで重要になるのが、

- Population：母集団
- Sample：標本
- Distribution：分布
- Sampling：標本抽出

です。

### Population：本当に知りたい対象全体

たとえば、

- 将来利用するすべての顧客
- 実際の工場で流れてくる製品
- 現実の道路環境
- 全ユーザーが入力する文章

などです。

### Sample：手元で観測できた一部

Training Dataは、Population全体の一部です。

だから、

> **SampleがPopulationを十分に代表しているか**

が非常に重要です。

## Distributionとは何か

Distribution（分布）は、Dataがどの値・状態・カテゴリにどれくらい存在するかを表します。

たとえば住宅価格Dataなら、

- 安い物件が多い
- 高価格帯は少ない
- 都市部が多い
- 郊外が少ない

といった偏りがあります。

画像Dataなら、

- 昼の写真が多い
- 夜の写真が少ない
- 正面画像が多い
- 横向きが少ない

かもしれません。

機械学習Modelは、Training時に見たDistributionの影響を強く受けます。

だから、

> Training時のDistributionと実運用時のDistributionが大きく違う

と性能が落ちることがあります。

## IIDという理想化

統計的機械学習ではしばしば、Dataが**独立同分布（IID: Independent and Identically Distributed）**から得られるという考え方を使います。

簡単に言えば、

- 各Dataが互いに強く依存しすぎない
- 同じPopulation・同じDistributionから来ている

と考える理想化です。

現実には完全なIIDにならないことも多いですが、この考え方がTraining / Validation / Testを分ける理論的な土台の一つになります。

![DataからModelを作り、Predictionへつなぐ流れ](/images/articles/statistical-machine-learning/fig-01-data-model-prediction.svg)

*Dataから規則性を学び、Modelとして表現し、未知の入力へPredictionするのが基本です。*

## Modelは何をしているのか

統計的機械学習では、ModelはDataの背後にある規則性を近似します。

住宅価格を例にすると、

- 面積が広いほど高い傾向
- 駅に近いほど高い傾向
- 築年数が長いほど下がる傾向

などがあります。

しかし同じ条件でも価格は完全には一致しません。

理由は、

- 眺望
- 周辺環境
- 売買時期
- 市場心理
- リフォーム状況
- 観測できていない要因

などがあるからです。

Modelは、こうしたばらつきを含むDataから、**予測に役立つ関係を推定**します。

![確率・統計・Model・Optimizationの関係](/images/articles/statistical-machine-learning/fig-03-probability-statistics-optimization.svg)

*統計的機械学習は、Dataのばらつきを確率・統計で扱い、ModelをOptimizationして未知Dataへ使います。*

## なぜ「統計的」なのか

現実世界には不確実性があります。

だから機械学習では、

> 条件Aなら必ずB

ではなく、

> 条件AではBになる可能性が高い

という形で考えることが多くなります。

確率論は、この**不確実性を数値で扱うための言語**です。

Deep Learning Bookでも、Probabilityは不確実性を表現し、機械学習Systemを分析する基本的枠組みとして扱われています。

## Random VariableとProbability Distribution

統計的機械学習では、結果を確率変数として表すことがあります。

たとえば顧客が解約するかどうかなら、

Y = 1：解約  
Y = 0：継続

のように表せます。

そして、

P(Y = 1 | 顧客情報)

のように、

> この顧客情報が与えられたとき、解約する確率

をModelで推定します。

この「入力が与えられた条件での結果の分布」を考えることが、ClassificationやLanguage Modelにもつながります。

## Estimation：Dataから未知の値を推定する

統計では、観測Dataから未知のParameterを推定します。

たとえば、

- 平均
- 分散
- 発生確率
- 回帰係数

などです。

機械学習でも同様に、Dataを使ってModel Parameterを推定します。

ただしModelが複雑になるほど、

- Parameter数
- Data量
- Optimization
- Regularization

が重要になります。

![ModelがDataへFitしながら未知DataへGeneralizeするイメージ](/images/articles/statistical-machine-learning/fig-04-model-fit-generalization.svg)

*Training Dataへ合わせることと、未知DataへGeneralizeすることは同じではありません。*

## Training Errorだけを見てはいけない

Modelを複雑にすれば、Training Dataに対する誤差を小さくできます。

極端に言えば、Training Dataを丸暗記することもできます。

しかしそれでは未知Dataに弱くなります。

これがOverfitting（過学習）です。

### 例

Training Accuracy：99.9%  
Test Accuracy：70%

なら、

> Training Dataへ適合しすぎて、未知Dataでは崩れている

可能性があります。

統計的機械学習では、

> Training Errorが小さいこと

と

> Generalization Errorが小さいこと

を区別します。

## Generalizationが中心テーマ

Generalization（汎化）とは、

**Trainingに直接使っていない未知Dataへ適切に対応する能力**

です。

良いModelとは、

> 覚えた問題を解けるModel

ではありません。

> 初めて見る問題にも通用する規則性を学べたModel

です。

この意味で、機械学習の本当の目的は「Training Dataを説明すること」ではなく、**未知Dataへの性能を高めること**です。

## Generalization Errorとは何か

Generalization Errorは、未知Dataに対する誤差です。

実際には未来のすべてのDataを事前に知ることはできません。

そこでTest Setを使って近似的に評価します。

このため、

- Training Set
- Validation Set
- Test Set

を分ける必要があります。

詳しくは「訓練・検証・テストデータの違い」で扱います。

## BiasとVariance

Modelの失敗を理解する代表的な考え方に、BiasとVarianceがあります。

### Biasが大きい

Modelが単純すぎて、Dataの重要な関係を捉えられません。

例：

本当は曲線的な関係なのに、直線だけで近似する。

結果：

- Trainingでも性能が低い
- Testでも性能が低い
- Underfittingしやすい

### Varianceが大きい

Training Dataの細かな違いへ過敏に反応します。

例：

Training DataのNoiseまで覚える。

結果：

- Trainingでは高性能
- Testでは性能低下
- Overfittingしやすい

## Bias-Variance Tradeoff

Modelを複雑にすると、

- Biasは下がりやすい
- Varianceは上がりやすい

傾向があります。

逆に単純にすると、

- Varianceは下がりやすい
- Biasは上がりやすい

ことがあります。

だから、

> Modelを複雑にすればするほど良い

わけではありません。

未知Dataで最も良い性能になるバランスを探します。

![統計的機械学習で使われる代表的なModel](/images/articles/statistical-machine-learning/fig-05-methods.svg)

*Linear Regression、Logistic Regression、Decision Tree、SVM、k-NNなど、問題に応じて異なるHypothesis Spaceを使います。*

## Hypothesis Spaceとは何か

Hypothesis Space（仮説空間）は、Modelが候補として取り得るFunctionやRuleの集合です。

たとえば直線回帰なら、

y = ax + b

という形の、

- 傾きa
- 切片b

が異なる無数の直線が候補になります。

Trainingとは、

> この候補群の中からDataに合うものを探す

作業だと考えられます。

Neural Networkでは、このHypothesis Spaceが非常に巨大です。

だからOptimizationとRegularizationが重要になります。

## Model Complexityとは何か

Model Complexityは、どれくらい複雑な関係を表現できるかという考え方です。

例：

- 単純な直線
- 複雑なDecision Tree
- Deep Neural Network

では表現力が異なります。

複雑なModelは柔軟ですが、Dataが少ないとOverfittingしやすくなる場合があります。

## Regularizationとは何か

Regularization（正則化）は、ModelがTraining Dataへ適合しすぎるのを抑える方法です。

考え方としては、

> Training Errorだけでなく、Modelの複雑さにもPenaltyを与える

ような設計があります。

代表例として、

- L1 Regularization
- L2 Regularization
- Dropout
- Early Stopping

などがあります。

目的は、

> Training Dataを完璧に覚えること

ではなく、

> 未知DataへGeneralizeすること

です。

## ParameterとHyperparameter

統計的機械学習では、ParameterとHyperparameterを区別します。

### Parameter

TrainingによってDataから学習される値。

例：

- 線形回帰の重み
- Neural NetworkのWeight
- Bias

### Hyperparameter

Modelの外側で設定する値。

例：

- Learning Rate
- Tree Depth
- Regularizationの強さ
- Batch Size

HyperparameterはValidation Setなどを使って選びます。

## Training / Validation / Testを分ける理由

Dataを3つに分ける理由は、

**Model開発と最終評価を分離するため**

です。

### Training Set

Parameterを学習。

### Validation Set

HyperparameterやModel選択に使う。

### Test Set

最終性能を確認。

Test結果を何度も見てModelを調整すると、Test Setにも間接的にOverfitします。

だからTestは最後まで温存します。

## Cross Validationとは何か

Dataが少ない場合、1回のTrain / Validation分割だけでは評価が不安定になることがあります。

そこでCross Validation（交差検証）を使います。

Dataを複数のFoldへ分け、

- 一部をValidation
- 残りをTraining

として役割を交代しながら複数回評価します。

平均性能を見ることで、特定のData分割へ依存しすぎない評価ができます。

## Data Leakageはなぜ危険か

Data Leakageとは、

> 本来Prediction時には使えない情報がTrainingやEvaluationへ混ざること

です。

たとえば「病気を事前予測するModel」なのに、

- 診断後の処方薬
- 確定診断後の記録

をFeatureとして入れると、高精度に見えます。

しかし実運用では、その情報はPrediction時点で存在しません。

Leakageは、

> Modelが賢いのではなく、答えを先に見ている

状態です。

## Sampling Biasとは何か

Sampleの取り方に偏りがあると、Modelも偏ります。

例：

全国利用者向けなのに、都市部UserだけでTraining。

すると地方Userでは性能が落ちるかもしれません。

統計的機械学習では、

> Model Architecture以前に、Data Samplingが正しいか

を見ることが重要です。

## Distribution Shiftとは何か

Training時と実運用時でData Distributionが変わることをDistribution Shiftと呼びます。

例：

- 景気変動
- 新商品登場
- Sensor交換
- Camera変更
- 季節
- User行動変化

など。

過去Dataで高性能でも、環境が変われば性能は落ちる可能性があります。

だからMachine Learningは、

> 作って終わり

ではありません。

Monitoringと再評価が必要です。

## 統計的機械学習とシンボリックAI

両者の違いは、Knowledgeの作り方にあります。

### Symbolic AI

人間がRuleを明示。

例：

IF 単語Xを含む THEN Spam

### Statistical Machine Learning

大量Dataから、

> どのFeatureがSpamと関係するか

を学習。

後者は曖昧で複雑なPatternに強い一方、判断Ruleを人間が直接読みにくいことがあります。

## ディープラーニングとの関係

Deep Learningは統計的機械学習から切り離された別世界ではありません。

Neural Networkが巨大になっても、

- Probability
- Loss
- Training
- Validation
- Generalization
- Overfitting
- Regularization
- Distribution

はすべて重要です。

Modelが大きくなったから統計が不要になるわけではありません。

むしろModelが巨大になるほど、

> 本当にGeneralizeしているのか

を正しく評価することが重要になります。

## LLMでも同じ問題がある

Large Language Modelでも、

- Training Data
- Evaluation Data
- Benchmark
- Data Contamination
- Distribution Shift
- Generalization

が重要です。

Benchmark問題がTraining Dataへ混ざっていれば、高Scoreでも「本当に未知問題を解けた」とは言えません。

統計的な評価視点は、生成AIにもそのまま必要です。

![統計的機械学習の基本イメージ：Data・Model・Prediction](/images/articles/statistical-machine-learning/fig-02-basic-concept.svg)

*実務では「どのDataを使い、どのModelで学び、未知DataへどうPredictionするか」を一貫して設計します。*

## 実務で重要な6つの問い

機械学習Projectでは、Modelを選ぶ前に次を確認します。

1. **このDataは何を代表しているか**
2. **実運用Dataと同じDistributionか**
3. **Labelは正しいか**
4. **重複・Leakageはないか**
5. **Evaluation Dataを使い回しすぎていないか**
6. **平均Scoreだけでなく重要なFailureを見ているか**

統計的機械学習の考え方は、

> 「Accuracy 95%」

という数字を、そのまま信じないための基礎です。

## Accuracy 95%でも危険な例

たとえば不良率が1%の製造Lineを考えます。

10000個中、

- 正常：9900
- 不良：100

だとします。

すべて「正常」とPredictionするModelでもAccuracyは99%です。

しかし不良を一件も検出していません。

だから、

- Precision
- Recall
- F1
- False Positive
- False Negative

など、目的に合ったMetricを見る必要があります。

統計的機械学習は、

> 一つのScoreだけで性能を判断しない

ための考え方でもあります。

## ConfidenceとUncertainty

ModelがProbabilityを返しても、その数字がそのまま信頼度とは限りません。

たとえば、

> 90%の確率で猫

と100回Predictionしたうち、本当に約90回正しいならCalibrationが良いと言えます。

高Scoreを出すModelでも、Confidenceが過剰なことがあります。

高Risk領域では、

- Uncertainty
- Calibration
- Confidence Interval

の考え方が重要になります。

## 統計的機械学習を一言で説明するなら

統計的機械学習とは、

> **有限の観測Dataから、未知Dataにも通用する規則性を推定し、その不確実性とGeneralization性能を評価するMachine Learningの考え方**

です。

重要なのは、

> Training Dataへ当てはまるか

ではなく、

> 現実世界へどれくらいGeneralizeするか

です。

## まとめ

統計的機械学習では、Dataを単なる「材料」として見ません。

Dataは、

- Populationから得たSample
- Noiseを含む
- Biasが入り得る
- Distributionを持つ

ものとして扱います。

そしてModelは、

**SampleからPatternを推定  
→ 未知DataへGeneralize  
→ Generalization Errorを評価**

します。

そのために、

- Probability
- Distribution
- Estimation
- Bias / Variance
- Hypothesis Space
- Regularization
- Train / Validation / Test
- Cross Validation
- Data Leakage
- Distribution Shift

といった考え方が必要になります。

「手元のDataで当たった」ことと、

「現実世界で使える」ことは同じではありません。

この違いを理解することが、機械学習Modelを正しく作り、正しく評価する第一歩です。

## 次に読む

- **訓練・検証・テストデータの違い** — Model開発と最終評価をどう分離するか（準備中）
- **ハイパーパラメータとは？** — Parameterと設定値の違い（準備中）
- **AIに必要な確率の基礎** — 不確実性を数値として扱うための土台（準備中）
- **過学習とは？** — Training Dataへ適合しすぎると何が起こるのか（Core Curriculum後続）
- **汎化とは？** — 未知Dataへ通用する能力をどう考えるか（Core Curriculum後続）

## 参考資料

- [Deep Learning Book - Machine Learning Basics](https://www.deeplearningbook.org/contents/ml.html)
- [Deep Learning Book - Probability and Information Theory](https://www.deeplearningbook.org/contents/prob.html)
- [Google for Developers - Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/)
- [Google for Developers - Datasets, Generalization, and Overfitting](https://developers.google.com/machine-learning/crash-course/overfitting)
- [Google for Developers - Machine Learning Glossary](https://developers.google.com/machine-learning/glossary/)
