---
id: "BAS-0042"
title: "ハイパーパラメータとは？｜AIの「学び方」を決める数字"
slug: "hyperparameters"
description: "同じデータ・同じモデルなのに、設定値ひとつでAIの学習結果が変わるのはなぜか。Parameterとの違い、Learning Rate、Batch Size、Validation、Grid Search、Random Search、Bayesian Optimization、PBTまで、ハイパーパラメータ探索の試行錯誤を物語として解説します。"
category: "AI基礎・技術"
level: 1
type: "concept"
status: "review"
publishedAt: "2026-10-05"
updatedAt: "2026-10-05"
author: "AI Portal編集部"
thumbnail: "/images/articles/hyperparameters/hero.svg"
tags: ["ハイパーパラメータ", "機械学習", "学習率", "Batch Size", "モデル選択", "Random Search", "Bayesian Optimization"]
---

同じTraining Dataを使う。

同じModelを使う。

同じプログラムを動かす。

それなのに、片方のAIは順調に賢くなり、もう片方はいつまでたっても学ばない。

場合によっては、学習を始めた直後からLossが激しく上下し、まともなModelにならないことさえあります。

違いは何でしょうか。

Dataではありません。

Modelの種類でもありません。

違ったのは、たとえば、

**Learning Rateを0.001にしたか、0.1にしたか。**

たったそれだけです。

「そんな小さな数字で、結果がそこまで変わるの？」

ここがHyperparameterの面白いところです。

Machine Learningでは、ModelがDataから自動的に学んでくれる値が大量にあります。

ところがそのModelに、

- どれくらい大胆に学ばせるか
- 一度に何件ずつDataを見るか
- どれくらい複雑なModelを許すか
- どのくらいOverfittingを抑えるか
- いつ学習を止めるか

といった「学び方のルール」は、別に決めなければなりません。

そして厄介なのは、

> **その正解が、最初から分からない**

ことです。

この記事ではHyperparameterを用語として暗記するのではなく、

**「AIにどう学ばせればいいのか分からない」という問題に、研究者や開発者がどう向き合ってきたのか**

という流れから理解します。

前提として、[機械学習とは？](/articles/what-is-machine-learning)と[訓練・検証・テストデータの違い](/articles/train-validation-test-split)を読んでおくと、かなりつながりやすくなります。

![同じDataとModelでも、設定値ひとつで学習結果が変わる](/images/articles/hyperparameters/hero.svg)

*Modelが自動で学ぶからといって、人間が何も決めなくてよいわけではありません。学習の外側には、もう一つの「設計問題」があります。*

## 最初に結論：Parameterは「Modelが学ぶ値」、Hyperparameterは「学び方を決める値」

まず、この2つを分けます。

### Parameter

Training中にModel自身がDataから更新する値です。

Neural Networkなら代表例は、

- Weight
- Bias

です。

### Hyperparameter

Trainingのやり方やModelの構造を、学習の外側から制御する値です。

代表例は、

- Learning Rate
- Batch Size
- Regularizationの強さ
- Decision Treeの深さ
- k-NNのk
- Neural NetworkのHidden Size
- Dropout率
- 学習Step数やEpoch数の上限

などです。

GoogleのMachine Learning Glossaryも、Hyperparameterを「Model Trainingを繰り返す間に、人間またはHyperparameter Tuning Serviceが調整する変数」と説明し、Learning Rateを代表例に挙げています。

つまり大ざっぱに言えば、

> **Parameter = AIが学ぶ数字**  
> **Hyperparameter = AIをどう学ばせるか決める数字**

です。

![ParameterとHyperparameterは、学習ループの内側と外側にいる](/images/articles/hyperparameters/fig-01-parameter-vs-hyperparameter.svg)

*Training Dataから直接更新されるのがParameter。Validation結果などを見ながら外側で選ぶのがHyperparameterです。*

## でも、なぜ「学び方」まで決める必要があるのか

ここで疑問が出ます。

> AIが自分で学ぶなら、Learning RateまでAI自身が決めればいいのでは？

もっともな疑問です。

しかし、通常のTrainingには「何をどのように最適化するか」という手順そのものが必要です。

たとえば山の斜面を下って、一番低い地点を探すとします。

ModelのParameterは、山の上を移動している現在位置のようなものです。

Lossを小さくするTrainingでは、勾配を使って「どちらへ進めば下り坂か」を調べます。

ところが、方向が分かっても、

**一歩を何メートルにするか**

は別問題です。

それを決める代表的な値がLearning Rateです。

## Learning Rate：小さな数字が学習全体を支配する

Learning Rateが大きすぎるとどうなるでしょう。

谷底へ向かっているのに、一歩が大きすぎて反対側の斜面へ飛び越える。

また戻ろうとして、今度も飛び越える。

これを繰り返すとLossが不安定になり、うまく収束しません。

逆に小さすぎれば、

一歩。

また一歩。

少しずつしか進まない。

方向は合っているのに、Training時間を使い切っても十分な場所まで到達しないかもしれません。

つまり、

- 大きすぎる → 暴れる
- 小さすぎる → 進まない
- 適切 → 効率よく改善する

という問題が起こります。

![Learning Rateが大きすぎても小さすぎても困る](/images/articles/hyperparameters/fig-02-learning-rate.svg)

*Learning Rateは「大きいほど速い」という単純なつまみではありません。速さと安定性のトレードオフがあります。*

ここで重要なのは、

> **適切なLearning Rateは、DataやModelやOptimizerによって変わる**

ということです。

「0.001ならいつでも正解」という万能値はありません。

だから試す必要があります。

そして、ここからHyperparameter Tuningという別の仕事が始まります。

## Batch Size：何件まとめて考えてから、一歩進むか

次はBatch Sizeです。

Training Dataが100万件あるとして、Parameterを更新するたびに100万件全部を見る必要はありません。

たとえば、

- 32件
- 128件
- 512件

のように一部をまとめ、そのBatchでLossを計算して更新できます。

Batch Sizeを小さくすると、Parameter更新は頻繁になります。

ただし、少数Dataだけを見て判断するので、更新方向にはばらつきが出ます。

大きくすると、一回の更新で多くのDataを見るため計算をまとめやすい一方、Memory消費も増えます。

さらに実際のDeep Learningでは、Hardware、Optimizer、Learning Rate、Batch Sizeの関係も無視できません。

つまりHyperparameterは、独立した「つまみ」ではありません。

> **一つを変えると、別のつまみの適切な値まで変わる**

ことがあります。

ここが急に難しくなります。

## つまみが2個なら、人間でも試せる

Learning Rateだけなら、

0.1  
0.01  
0.001  
0.0001

と試せます。

Batch Sizeも加わったとして、

32  
64  
128  
256

くらいなら、まだ何とかなりそうです。

しかし実際には、

- Learning Rate
- Batch Size
- Weight Decay
- Dropout
- Hidden Size
- Layer数
- Optimizer
- Learning Rate Schedule
- Warmup
- Data Augmentationの強さ

など、候補が増えていきます。

仮に5個のHyperparameterそれぞれに10候補しかなくても、

**組み合わせは100,000通りです。**

そして1回のTrainingに1時間かかれば？

100,000回を気軽に総当たりするわけにはいきません。

大規模Modelなら、1回のTraining失敗そのものが高価です。

ここで問題は、

> 「良い設定を探す」

から、

> **「限られた計算予算で、どこを試せばいいのか」**

へ変わります。

## 最初の素朴な作戦：Grid Search

一番分かりやすい方法はGrid Searchです。

たとえば、

Learning Rate：
- 0.1
- 0.01
- 0.001

Batch Size：
- 32
- 128
- 512

なら、3 × 3の9通りを全部試す。

表のマスを順番に埋めるような探索です。

これは単純で、再現もしやすい。

候補が少なければ十分有効です。

しかし次元が増えると急激に重くなります。

そして、もっと厄介な弱点があります。

## すべてのHyperparameterが、同じくらい重要とは限らない

ここで面白い問題が出てきます。

Hyperparameterが10個あったとしても、性能を大きく左右しているのは、そのうち2〜3個だけかもしれません。

残りは、ある範囲ならあまり結果を変えない。

ところがGrid Searchは律儀です。

重要でない軸にも、重要な軸と同じ数だけ候補を割きます。

たとえば2次元の地図なら、Gridはきれいです。

でも10次元になったとき、

**本当に重要な方向へ何回試せているか**

は別問題です。

この弱点に対して、意外なくらい単純な方法が強いことを示した研究があります。

## 2012年：「全部きれいに試す」より、Randomの方が強いことがある

2012年、James BergstraとYoshua BengioはJMLRに
「Random Search for Hyper-Parameter Optimization」
を発表しました。

題名の通り、

> Gridで規則正しく試すより、Randomに組み合わせを選んだ方が効率よく良い設定へ到達できる場合がある

ことを、理論と実験の両面から示しました。

なぜでしょう。

たとえば性能を強く左右するHyperparameterがLearning Rateだけだったとします。

Grid Searchでは、Learning Rateを3段階しか設定していなければ、他のHyperparameterを何十通り試しても、Learning Rate自体は同じ3値しか見ません。

Random Searchなら、試行のたびにLearning Rateも違う値を引きます。

つまり同じ100回試すなら、

**重要な軸をより多くの値で試せる可能性が高い。**

ここがポイントです。

![Grid Searchはきれいだが、重要な軸を細かく見ているとは限らない](/images/articles/hyperparameters/fig-03-grid-vs-random.svg)

*Random Searchが強い理由は「Randomだから魔法のように当たる」からではありません。重要なHyperparameterを多様な値で試しやすいからです。*

論文では、Data Setによって「どのHyperparameterが重要か」も変わり得ることが示されています。

これは実務的にかなり困る話です。

あるTaskで効いた職人技が、別のTaskでは効くとは限らない。

だからこそ、

> 経験だけでなく、探索そのものを仕組みにしよう

という方向へ進みます。

## しかしRandom Searchにも弱点がある

Random Searchは賢い方法ですが、過去の試行結果を深く利用しているわけではありません。

たとえば20回Trainingして、

- この辺りはかなり良さそう
- この辺りは毎回悪い

という情報が集まったとします。

人間なら当然、

> 次は良かった地域の近くを試そう

と考えます。

だったら探索Algorithmも、同じようにすればいい。

ここで登場する代表的な考え方がBayesian Optimizationです。

## Bayesian Optimization：「次にどこを試すべきか」を学ぶ

Hyperparameter Tuningでは、一つの設定を試すたびに結果が返ってきます。

設定A → Validation Score 0.84  
設定B → 0.86  
設定C → 0.79

Bayesian Optimizationでは、こうした過去の観測から、

> Hyperparameter空間のどこが有望そうか

を確率的にモデル化します。

そして、

- 今まで良かった場所の近くをさらに調べる
- まだよく分からない場所も試す

というBalanceを取りながら、次の候補を選びます。

これはよく、

- Exploitation：有望な場所を掘る
- Exploration：未知の場所を探す

という言葉で表されます。

2012年にはJasper Snoek、Hugo Larochelle、Ryan P. Adamsらが、Machine LearningのHyperparameter TuningへBayesian Optimizationを実践的に適用する研究を発表しています。

彼らの論文は、当時のHyperparameter調整を「expert experience、rules of thumb、brute-force searchに頼るblack artになりがち」と表現しています。

つまり当時から、

> **Modelは科学的にTrainingしているのに、その外側の設定は職人芸になりやすい**

という問題があったわけです。

## Hyperparameter Tuningは「外側のMachine Learning」に見えてくる

ここまで来ると構造が見えてきます。

内側では、

Training Data  
↓  
ModelをTraining  
↓  
Parameterを更新

しています。

しかし外側では、

Hyperparameter候補  
↓  
Training  
↓  
Validation Score  
↓  
次のHyperparameter候補

というLoopがあります。

つまりMachine Learningを作るために、その外側でも探索と最適化を回しているのです。

![Trainingの外側に、もう一つの探索ループがある](/images/articles/hyperparameters/fig-04-tuning-loop.svg)

*Parameter Optimizationの外側でHyperparameter Optimizationが回ります。Validation Setは、この外側Loopの判断材料です。*

ここで前の記事
[訓練・検証・テストデータの違い](/articles/train-validation-test-split)
と完全につながります。

Validation Setは、

**Hyperparameterを選ぶために何度も見るData**

でもあります。

Learning Rate AとBを比べる。

Batch Sizeを変える。

Modelの深さを変える。

そのたびにValidation Scoreを確認する。

だからTest Setを最後まで封印しておく必要があるのです。

## 「Validationで最高」を追い続けると、またOverfittingする

ここで、また罠があります。

Hyperparameterを1000通り試し、Validation Scoreが一番高いものを選んだとします。

それは本当に最高のModelでしょうか。

必ずしもそうとは限りません。

1000回も比較すれば、偶然そのValidation Setと相性が良かった設定が勝つ可能性があります。

さらに、

Validation Scoreを見る  
↓  
Hyperparameterを変える  
↓  
また見る  
↓  
また変える

を繰り返すほど、開発プロセス全体がValidation Setへ適応します。

つまり、

> **Hyperparameter TuningそのものがValidation SetにOverfittingする**

ことがあります。

だから最後に独立したTest Setが必要です。

Test Setは、

> 「この設定を選んだ判断そのものが、本当に現実世界で通用するか」

を見る最後の審判でもあるのです。

## Hyperparameterは「Training前に固定する値」とは限らない

初心者向けの説明では、

> HyperparameterはTraining前に人間が決める値

と書かれることがよくあります。

入口としては分かりやすいのですが、厳密には少し狭すぎます。

Learning RateはTraining中に変化させることがあります。

Learning Rate Scheduleを使って、

最初は大きく  
↓  
後半は小さく

することもあります。

では、それはParameterになったのでしょうか。

なりません。

Model本体が通常のGradient DescentでWeightと同じように学んでいるわけではないからです。

Hyperparameterの本質は、

**Training Algorithmの外側からTraining挙動を制御する変数**

と考える方が正確です。

## 2017年：Trainingしながら設定まで進化させるPBT

さらに面白い発想があります。

2017年、DeepMindはPopulation Based Training（PBT）を発表しました。

発想はかなり大胆です。

複数のModelを同時にTrainingする。

途中で性能を比べる。

成績の悪いModelは、良いModelの状態を取り込みながら、Hyperparameterも変えてTrainingを続ける。

つまり、

> Trainingを全部終えてから次の設定を試す

のではなく、

> **Trainingしながら、ModelとHyperparameterの両方を改善する**

方向へ進みます。

![PBTでは複数のTrainingを競わせ、途中で設定も変えていく](/images/articles/hyperparameters/fig-05-pbt.svg)

*Hyperparameterは必ず「開始前に一度だけ固定する値」ではありません。探索方法によってはTraining途中でも変化します。*

ここまで来ると、

「Hyperparameterは人間が手で入れる設定値」

というイメージはかなり崩れます。

人間が決める場合もある。

Random Searchが決める場合もある。

Bayesian Optimizationが次を提案する場合もある。

Population Based TrainingがTraining中に変える場合もある。

重要なのは誰が入力したかではありません。

**Model本体のParameter Trainingとは別の階層で、学習方法を制御しているかどうか**

です。

## Modelの構造そのものもHyperparameterになる

HyperparameterというとLearning Rateのような数字だけを想像しがちですが、もっと大きな設計判断も含まれます。

たとえばNeural Networkなら、

- Layer数
- Hidden Dimension
- Attention Head数
- Dropout率
- Activation Functionの選択
- Optimizerの選択
- Weight Decay
- Learning Rate Schedule

などです。

Decision Treeなら、

- Maximum Depth
- Minimum Samples
- 分岐条件に関する設定

などがあります。

k-NNなら、

- k

そのものがHyperparameterです。

つまりHyperparameterは、

> ModelをどうTrainingするか

だけでなく、

> **どんな大きさ・複雑さのModelをTrainingするか**

まで決めることがあります。

## Modelが大きければ、Hyperparameter問題は消えるのか

消えません。

むしろ大規模Modelでは、一回の実験が高価になるため、

**設定を外したときの損失が大きくなる**

ことがあります。

小さなModelなら、

「失敗した。もう一回」

で済むかもしれません。

巨大なModelでは、大量のAccelerator時間、電力、研究時間を使ったあとで、

> Learning Rate Scheduleが悪かった

と分かるかもしれません。

そのため実際には、

- 小規模な予備実験
- Scalingの検証
- Learning Curveの監視
- Early Stopping
- 過去実験の再利用
- 自動探索

などを組み合わせて、無駄なTrialを減らします。

Hyperparameter Tuningは、単なる性能競争ではなく、

**計算資源をどう使うかというEngineering問題**

でもあります。

## LLMにもHyperparameterはある

ChatGPTのようなLarge Language Modelでも同じ考え方があります。

Training側には、

- Learning Rate
- Batch Size
- Optimizer設定
- Weight Decay
- Training Step数
- Learning Rate Schedule
- Model Architectureに関する設計値

などがあります。

これらはModelが文章から「知識」として覚えるものではありません。

学習プロセスを設計する側の設定です。

ただし、ここで一つ区別したいものがあります。

## TemperatureやTop-pは、厳密には別の話

生成AIを使っていると、

- Temperature
- Top-p

という設定を見ることがあります。

これらも広い意味ではModelの挙動を制御する「設定値」ですが、通常はTraining時のHyperparameterとは区別して、

**Inference / Generation時のSampling Parameter**

と呼ぶ方が正確です。

Learning RateはModelをどうTrainingするかを変えます。

TemperatureはTraining済みModelから、どうTokenを選んで生成するかを変えます。

似て見えますが、作用する場所が違います。

この区別ができると、

> 「Parameter」「Training Hyperparameter」「Inference Setting」

が混ざらなくなります。

## 結局、良いHyperparameterとは何か

ここまで読むと、

「じゃあ結局、Learning Rateはいくつにすればいいの？」

と思うかもしれません。

残念ながら、

**万能な正解はありません。**

良いHyperparameterとは、

- Task
- Data
- Model
- Optimizer
- Hardware
- 計算予算
- 評価指標

の条件下で、目的に合う結果を出す設定です。

Accuracyだけを最大化したいのか。

Inference Costも抑えたいのか。

Training時間を短くしたいのか。

Memory制約があるのか。

Overfittingを減らしたいのか。

目的が違えば、最適な設定も変わります。

だからHyperparameter Tuningとは、

> **最高の数字を探すゲーム**

ではなく、

> **制約の中で、何を良しとするかを決め、そのための学習方法を探す作業**

です。

## この話で一番大事なこと

Hyperparameterの名前を全部覚える必要はありません。

本当に大事なのは、Machine Learningには二つの学習があると理解することです。

一つ目は、

**ModelがTraining DataからParameterを学ぶこと。**

二つ目は、

**開発者や探索AlgorithmがValidation結果から、より良い学習方法を探すこと。**

Modelだけが学んでいるわけではありません。

Modelを作る側も、

「この設定ではダメだった」

「この範囲は良さそうだ」

「次はここを試そう」

と学習しています。

そして、その試行錯誤を少しずつAlgorithmへ渡してきた歴史が、

Grid Search  
↓  
Random Search  
↓  
Bayesian Optimization  
↓  
Population Based TrainingやAutoML

という流れとして見えてきます。

最初の疑問へ戻りましょう。

同じData。

同じModel。

同じProgram。

なのに結果が違った。

それはAIが気まぐれだったからではありません。

**AIの中で学ばれるParameterの外側に、AIの「学び方」を決めるもう一つの設計層があったからです。**

Hyperparameterとは、その設計層を操作するための値です。

そしてMachine Learningが高度になるほど、

> 「AIに何を学ばせるか」

だけでなく、

> **「AIにどう学ばせるか」**

が大きな技術になります。

## 次に読む

- **AIに必要な確率の基礎** — AIが不確実な世界をどう数字で扱うのか（準備中）
- **ディープラーニングとは？** — Hyperparameterの影響がさらに大きくなるNeural Networkの世界（準備中）
- **Learning Rateとは？** — 最も重要なHyperparameterの一つを、最適化の仕組みから詳しく理解する（準備中）
- **Batch・Epoch・Stepとは？** — Trainingが実際にどの単位で進むのかを理解する（準備中）

## 参考資料

- [Google for Developers - Machine Learning Glossary: Hyperparameter](https://developers.google.com/machine-learning/glossary/)
- [Google for Developers - Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/)
- [James Bergstra, Yoshua Bengio - Random Search for Hyper-Parameter Optimization, JMLR 2012](https://www.jmlr.org/papers/v13/bergstra12a.html)
- [Jasper Snoek, Hugo Larochelle, Ryan P. Adams - Practical Bayesian Optimization of Machine Learning Algorithms, NeurIPS 2012](https://papers.nips.cc/paper/2012/hash/05311655a15b75fab86956663e1819cd-Abstract.html)
- [Google DeepMind - Population Based Training of Neural Networks](https://deepmind.google/blog/population-based-training-of-neural-networks/)
