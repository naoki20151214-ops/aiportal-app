---
id: "BAS-0040"
title: "訓練・検証・テストデータの違い｜なぜ3つに分けるのか"
slug: "train-validation-test-split"
description: "機械学習でTraining・Validation・Testを分ける理由を、モデルが練習問題を覚えて本番で失敗する問題から物語として解説。過学習、モデル選択、Data Leakage、時系列分割まで体系的に整理します。"
category: "AI基礎・技術"
level: 1
type: "concept"
status: "ready"
publishedAt: "2026-10-04"
updatedAt: "2026-10-04"
author: "AI Portal編集部"
thumbnail: "/images/articles/train-validation-test-split/hero.svg"
tags: ["訓練データ", "検証データ", "テストデータ", "機械学習", "過学習", "Data Leakage", "モデル評価"]
---

あるAI開発者が、画像判定モデルを作ったとします。

Training中のAccuracyは99.8%。

「かなり良いModelができた」

そう思って実際の現場へ持っていくと、思ったほど当たりません。

なぜでしょうか。

答えは単純です。

**そのModelは“問題を解けるようになった”のではなく、“練習問題を覚えただけ”かもしれないからです。**

人間でも、同じ問題集を何十回も解けば点数は上がります。

しかし初めて見る問題でも解けるかどうかは、別の話です。

Machine Learningでもまったく同じ問題が起きます。

だから研究者や開発者は、

> 学習に使うDataと、実力を測るDataを分けなければいけない

と考えるようになりました。

ところが、ここで次の問題が起きます。

Test結果を見て、

> ここが弱いからModelを変えよう

と何度も調整していると、そのTest Setまで開発に使ったことになります。

すると、もうTestは「本番試験」ではありません。

そこで必要になったのが、

**Training / Validation / Test**

という3つの役割分担です。

この記事では、この3分割を暗記するのではなく、

**なぜ2つでは足りず、なぜ3つに分ける必要が生まれたのか**

という問題解決の流れから理解します。

前提として、[機械学習とは？](/articles/what-is-machine-learning)と[統計的機械学習とは？](/articles/statistical-machine-learning)を読んでおくと理解しやすくなります。

![練習問題では満点なのに、本番では解けないAI](/images/articles/train-validation-test-split/hero.svg)

*Machine Learningで本当に知りたいのは、「覚えたDataで当たるか」ではなく、「初めて見るDataでも通用するか」です。*

## 最初に結論：3つに分けるのは「学習」と「開発判断」と「最終評価」を混ぜないため

役割はシンプルです。

### Training Set

ModelのParameterを学ぶためのData。

### Validation Set

ModelやHyperparameterを選ぶためのData。

### Test Set

すべての開発が終わったあと、最後に実力を確認するData。

学校にたとえるなら、

- Training Set：教科書・練習問題
- Validation Set：模擬試験
- Test Set：本番試験

です。

ここで最も重要なのは、

> **Test Setは「最後まで見ない」から価値がある**

という点です。

## 最初の失敗：Training Dataで点数を測ってしまう

Machine Learningの初学者が最初にやりやすいのが、

1. Dataを集める
2. そのDataでTrainingする
3. 同じDataでAccuracyを測る

という方法です。

しかしこれは、

> 練習した問題を、そのまま試験に出している

状態です。

ModelがDataを覚えているだけでも、高いScoreが出ます。

### 例：1000件のTraining Data

Modelが1000件の特徴をほぼ丸暗記できたとします。

Training Accuracy：100%

でも新しい1000件では、

Test Accuracy：72%

かもしれません。

Training Scoreだけ見ていたら、この問題には気づけません。

ここで初めて、

> 学習に使っていないDataを残しておこう

という発想が必要になります。

## そこで生まれるHoldoutという考え方

Dataの一部をTrainingに使わず、評価用に残しておく。

これが基本的な**Holdout**の考え方です。

たとえば10000件あれば、

- 8000件：Training
- 2000件：Test

に分けます。

Modelは8000件だけで学習。

そして最後に2000件で評価します。

これなら、

> 初めて見るDataにどれくらい通用するか

をより公平に測れます。

しかし、ここでまた新しい問題が生まれます。

## 2つに分けただけでは、Testが開発に汚染される

TrainingとTestの2つだけに分けたとします。

Model Aを作る。

Test Accuracy：82%。

「もう少し改善したい」

Learning Rateを変える。

Test Accuracy：84%。

Model構造を変える。

Test Accuracy：86%。

Featureを追加する。

Test Accuracy：88%。

一見、Modelがどんどん良くなっています。

でも何が起きているでしょうか。

開発者は、

> Test結果を見て、次の設計を決めている

のです。

つまりTest Setの情報が、少しずつ開発へ流れ込んでいます。

Test DataそのものをTrainingしていなくても、

**Test Scoreを見て意思決定した時点で、そのTest Setは開発に利用されています。**

これが非常に重要なポイントです。

## 「見ただけ」でも情報は漏れる

たとえば大学入試の本番問題を先生だけが先に見たとします。

生徒には問題そのものを見せない。

しかし先生が、

> 今年は確率が多そうだ  
> ベクトルを重点的にやろう

と指導を変えたらどうでしょう。

生徒は本番問題を直接見ていません。

でも、本番問題の情報は学習へ入っています。

Machine Learningでも同じです。

Test結果を見てModelを変更すれば、Test Setは完全に未知ではなくなります。

だから、

> Modelを調整するための評価Data

と、

> 最後に公平に測るData

を分ける必要が出てきました。

## そこでValidation Setが必要になる

ここで登場するのがValidation Setです。

役割は、

> **開発中の判断に使うためのData**

です。

開発者はValidation結果を見ながら、

- Model AとBのどちらが良いか
- Learning Rateはいくつか
- Regularizationを強くするか
- Tree Depthはいくつか
- Trainingをいつ止めるか
- Featureを追加するか

を決めます。

つまりValidation Setは、

**「見てよい評価Data」**

です。

一方でTest Setは、

**「最後まで見ない評価Data」**

です。

![Training・Validation・Testの役割](/images/articles/train-validation-test-split/fig-01-three-roles.svg)

*Trainingは学習、Validationは開発判断、Testは最後の公平な確認。それぞれ役割が違います。*

## Training Set：Modelが実際に学ぶ場所

Training Setは、ModelのParameter更新に直接使います。

教師あり学習なら、

- Input
- Label

の組を与えます。

たとえば住宅価格Predictionなら、

Input：
- 面積
- 築年数
- 駅距離

Label：
- 実際の販売価格

ModelはPredictionとLabelの差をLossとして計算し、そのLossが小さくなるようParameterを更新します。

Neural Networkなら、同じTraining Setを複数Epoch繰り返し使うこともあります。

つまりTraining Setは、

> Modelが一番よく見るData

です。

だからTraining Performanceが良いこと自体は当然です。

重要なのは、それだけで満足しないことです。

## Validation Set：開発者が学ぶ場所

Validation SetはModelではなく、ある意味**開発者が学ぶData**です。

なぜなら、

Validation Score  
↓  
設定変更  
↓  
再Training  
↓  
Validation Score  
↓  
また変更

という流れで、開発者が設計を改善するからです。

この点は非常に重要です。

Training SetからはModelが学ぶ。

Validation Setからは開発者が学ぶ。

だからValidationを何十回、何百回も見ていれば、開発全体がValidation Setへ適応していきます。

つまり、

> Validation SetにもOverfittingすることがある

のです。

## Validation Overfittingという問題

たとえば50種類のModelを試し、Validationで一番高いものだけ選んだとします。

偶然Validation Setと相性がよいModelが選ばれることがあります。

さらに、

- Feature変更
- Data前処理変更
- Hyperparameter変更
- Model構造変更

をValidation結果を見ながら何度も繰り返すと、Modelだけでなく**開発プロセス全体**がValidationへ適合します。

だから最後にTest Setが必要です。

## Test Set：最後の封印

Test Setの役割は、最後の独立評価です。

Modelの設計が決まるまで触りません。

理想的には、

1. 問題設定
2. Data分割
3. Training
4. Validationで調整
5. Model確定
6. **ここで初めてTest**
7. 最終性能を報告

という流れです。

Test結果が悪かったからといって、そこでまたModelを調整したらどうなるでしょうか。

その瞬間、そのTest Setはもう「最終評価」ではなくなります。

再び開発Dataの一部になります。

だからTest Setは、**最後の封印**として扱う必要があります。

![Test Setを何度も見ると「本番試験」ではなくなる](/images/articles/train-validation-test-split/fig-02-test-contamination.svg)

*Test結果を見て何度も設計変更すると、Test Setの情報が開発へ流れ込み、公平な最終評価ではなくなります。*

## 典型的な開発フロー

実務では次のように進めます。

### Step 1：最初にDataを分ける

Train / Validation / Testを作る。

### Step 2：Training Setで学習

Parameterを更新する。

### Step 3：Validation Setで比較

Model・Hyperparameter・Feature・前処理を調整。

### Step 4：開発を繰り返す

TrainingとValidationを何度も回す。

### Step 5：設計を固定

「もうこれ以上変えない」と決める。

### Step 6：Test Setを開く

最終性能を一度確認。

この順番は、

**Model開発と性能評価を分離するための仕組み**

です。

## 70:15:15は絶対ルールではない

Train / Validation / Testの比率として、

- 70 / 15 / 15
- 80 / 10 / 10

などを見かけます。

しかし固定ルールではありません。

重要なのは割合ではなく、

> **それぞれの役割を果たすために十分なDataがあるか**

です。

### Dataが1000件しかない場合

Test 100件では評価が不安定かもしれません。

### Dataが1億件ある場合

Test 1%でも100万件あります。

十分すぎるかもしれません。

だから割合だけ暗記するのではなく、

- Total Data量
- Taskの難しさ
- Class Balance
- 欲しい評価精度

を考えます。

## Dataが少ないときはCross Validation

Dataが少ないと、

> Validation用にDataを取っておくのがもったいない

という問題が起きます。

そこで使われるのがCross Validationです。

たとえば5-fold Cross Validationなら、

Dataを5つに分けて、

- 4つでTraining
- 1つでValidation

を5回繰り返します。

毎回Validation役を交代させます。

これによって、

> 一回のData分割の偶然

へ依存しにくい評価ができます。

ただし計算回数は増えます。

## 時系列Dataではランダム分割が危険

ここまではDataをランダムに分ける話でした。

しかし時系列Dataでは、それが危険なことがあります。

例：

2023年：Training  
2024年：Validation  
2025年：Test

なら自然です。

しかしランダム分割で、

- 2025年DataがTraining
- 2023年DataがTest

に入ったらどうでしょう。

Modelは未来の情報を見て、過去をPredictionすることになります。

実際の運用ではそんなことはできません。

だから売上予測・故障予測・金融・需要予測などでは、

**時間の順序を守って分割する**

必要があります。

![時系列Dataは「過去→未来」の順番を守って分ける](/images/articles/train-validation-test-split/fig-03-time-series.svg)

*未来DataをTrainingへ混ぜると、実運用では使えない情報を先に見た評価になってしまいます。*

## Data Leakage：答えがこっそり混ざる事故

Data分割で最も危険な問題の一つがData Leakageです。

Leakageとは、

> 本来Prediction時には使えない情報がTrainingやEvaluationへ入ること

です。

### 医療Predictionの例

病気を診断前に予測したいModel。

Featureに、

- 年齢
- 症状
- 血液検査

を使うのは自然です。

しかし、

- 診断後に処方された薬

までFeatureへ入れたらどうでしょう。

その薬は、医師が病気を診断したあとに処方したものかもしれません。

つまり、

> 答えを知った後の情報

をModelが使っています。

Scoreは非常に高くなるかもしれません。

でも現場ではPrediction時点にその情報はありません。

![Data Leakage：答えを知った後の情報が混ざる](/images/articles/train-validation-test-split/fig-04-data-leakage.svg)

*Leakageがあると「賢いModel」に見えても、実運用では同じ情報を使えず性能が崩れます。*

## Preprocessing Leakageにも注意

LeakageはFeatureだけではありません。

Data前処理でも起きます。

たとえば全Dataの平均値を計算してStandardizationしたあとでTrain / Testに分けると、

Test Setの情報が平均値計算へ入っています。

正しい流れは、

1. Train Dataだけで平均・標準偏差を計算
2. その値でTrainを変換
3. 同じ値でValidation / Testを変換

です。

つまり、

> Data Splitは前処理より先に考える

必要があります。

## Duplicate Leakage：同じ問題が別名で入っている

もう一つ厄介なのが重複Dataです。

Trainingにある画像とほぼ同じ画像がTestにも入っていたら、

Modelが本当にGeneralizeしたのか分かりません。

文章でも、

- 同じ記事の転載
- 少しだけ編集した文章
- 同じQuestionの言い換え

がTrainとTestに混ざることがあります。

生成AIのBenchmarkでも重要な問題です。

## LLMではData Contaminationが大問題になる

Large Language Modelは非常に大量のWeb DataをTrainingします。

するとBenchmark問題や解答がTraining Dataへ混ざっている可能性があります。

Modelが高Scoreを取ったとき、

> 本当にReasoningして解いたのか  
> Trainingで見た問題を覚えていたのか

区別が難しくなります。

この問題はData Contaminationと呼ばれます。

Train / Test分離は、巨大Model時代でもまったく古くなっていません。

むしろDataが巨大になるほど難しくなっています。

![Test Setは現実世界の代理人](/images/articles/train-validation-test-split/fig-05-real-world.svg)

*Test Setは余ったDataではありません。Productionで出会う昼・夜・雨・特殊条件まで、現実をどれだけ代表できるかが重要です。*

## Test Setは「現実世界の代理人」

Test Setはただの余りDataではありません。

役割は、

> **未来の実運用をできるだけ再現すること**

です。

自動運転なら、

- 昼
- 夜
- 雨
- 雪
- 都市
- 郊外

が現場にあるなら、Testでもそれを反映する必要があります。

昼の晴天画像ばかりでTestして、

> Accuracy 99%

と言っても、夜の雨で失敗するなら意味がありません。

評価Dataは、

**Modelを採点するだけでなく、現実世界を代表する設計**

です。

## Distribution Shiftも考える

Test Setを正しく作っても、時間が経てば現実は変わります。

- User行動が変わる
- 商品が変わる
- Cameraが変わる
- Sensorが交換される
- 社会状況が変わる

するとTraining時のDistributionと実運用のDistributionが変わります。

だからProductionでは、

- Monitoring
- 定期再評価
- 新しいTest Data
- 再Training

が必要です。

一度Testで合格したから永遠に安全、ではありません。

## Test Accuracyだけ見ればよいのか

Test Setが正しくても、Metricの選び方を間違えると判断を誤ります。

不良率1%のLineで、

全部「正常」と答えるModel。

Accuracyは99%。

しかし不良を一件も発見していません。

だから、

- Precision
- Recall
- F1
- False Positive
- False Negative

など、Taskに合ったMetricが必要です。

**公平なData + 適切なMetric**

の両方が必要です。

## 人間の開発でも「本番を見すぎる」と起こる

この考え方はAIだけではありません。

Software開発でも、

- Benchmarkへ最適化しすぎる
- Competition Leaderboardを見すぎる
- 同じUser Testだけ繰り返す

と、その評価環境へ適応します。

評価Dataを分けるという考え方は、

> **自分たちの改善が本当にGeneralizeしているかを疑う仕組み**

でもあります。

## 3つの役割を一言で覚えるなら

Training：
**Modelが学ぶ**

Validation：
**開発者が学ぶ**

Test：
**誰も学ばない状態で、最後に測る**

この3行が最も本質に近いです。

## よくある誤解

### 「Test Setは何度見てもいい」

だめです。

Test結果を見て設計変更すれば、そのTestは開発Dataになります。

### 「Validationは完全に未知Data」

開発者が何度も見ているので、完全には未知ではありません。

### 「Split比率は70:15:15が正解」

固定ではありません。

役割を果たせるSample Sizeが重要です。

### 「Random Splitすればいつでも安全」

時系列・同一User・同一装置・同一患者など、Data構造によってはGroupやTimeを考慮する必要があります。

### 「Test Scoreが高ければProductionでも大丈夫」

Testが実運用Distributionを代表しているか確認する必要があります。

## まとめ：なぜ3つに分けるのか

Machine Learning開発で一番怖いのは、

> 自分たちがModelを改善しているつもりで、評価問題に慣れているだけ

という状態です。

最初はTraining Dataで評価して失敗した。

そこでTestを分けた。

しかしTestを見ながら改善すると、そのTestにも適応してしまった。

そこでValidationを作り、

- TrainingでModelを学ばせる
- Validationで開発判断する
- Testは最後まで温存する

という3役が必要になりました。

Training / Validation / Testは、単なるData整理ではありません。

**「自分たちは本当に未知の世界で通用するModelを作れているのか？」**

を自分たち自身に問い続けるための仕組みです。

## 次に読む

- **ハイパーパラメータとは？** — Validation Setを見ながら何を調整しているのか（準備中）
- **AIに必要な確率の基礎** — 評価値や不確実性をどう読むか（準備中）
- **ディープラーニングとは？** — 巨大ModelでもTraining / Validation / Testの原則はなぜ変わらないのか（準備中）
- **過学習とは？** — 「練習問題を覚えたAI」がなぜ生まれるのか（Core Curriculum後続）

## 参考資料

- [Google - Datasets: Dividing the original dataset](https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets)
- [Google - Datasets, Generalization, and Overfitting](https://developers.google.com/machine-learning/crash-course/overfitting)
- [Google - Machine Learning Glossary](https://developers.google.com/machine-learning/glossary/)
- [Deep Learning Book - Machine Learning Basics](https://www.deeplearningbook.org/contents/ml.html)
