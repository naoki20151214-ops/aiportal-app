---
id: "BAS-0042"
title: "ハイパーパラメータとは？｜AIの「学び方」を決める数字"
slug: "hyperparameters"
description: "ハイパーパラメータを、AIに犬と猫を見分けさせる例から初心者向けに解説。AIが自分で学ぶParameterとの違い、Learning Rate、Batch Size、Validation、Grid Search、Random Search、Bayesian Optimizationまで段階的に理解できます。"
category: "AI基礎・技術"
level: 1
type: "concept"
status: "ready"
publishedAt: "2026-10-05"
updatedAt: "2026-10-05"
author: "AI Portal編集部"
thumbnail: "/images/articles/hyperparameters/hero.svg"
tags: ["ハイパーパラメータ", "機械学習", "学習率", "Batch Size", "モデル選択", "Random Search", "Bayesian Optimization"]
---

AIに、**犬と猫を見分けさせたい**とします。

犬の写真をたくさん見せる。

猫の写真もたくさん見せる。

そして、

「これは犬」

「これは猫」

と正解も一緒に教える。

するとAIは、最初はよく間違えながらも、少しずつ犬と猫を見分けられるようになります。

ここまでは、なんとなく想像できますよね。

では、ここで一つ質問です。

**AIは、自分で学ぶのだから、人間は写真を渡すだけでいいのでしょうか。**

実は、そうではありません。

AIに勉強させる前に、人間側が決めなければならないことがあります。

たとえば、

- 1回の間違いで、どれくらい大きく考え方を直すか
- 写真を何枚見てから、一度「反省」するか
- どれくらい複雑な仕組みのAIにするか

といったことです。

このような、

**「AIに何を覚えさせるか」ではなく、「AIにどう学ばせるか」を決める設定**

を、**ハイパーパラメータ（Hyperparameter）**と呼びます。

名前は難しいですが、最初はこれだけ分かれば大丈夫です。

> **ハイパーパラメータ = AIの学ばせ方を決める設定**

です。

![犬と猫を学ぶAIにも、人間が決める「学ばせ方」がある](/images/articles/hyperparameters/hero.svg)

*AIは自分で学びます。でも「どう学ばせるか」まで全部自動で決まるわけではありません。*

## まず30秒で結論

AIの学習には、大きく分けて2種類の数字があります。

### AIが自分で覚えていく数字

これは**Parameter（パラメータ）**です。

学習中にAI自身が少しずつ調整します。

### 人間側が「どう学ばせるか」を決める数字

これが**Hyperparameter（ハイパーパラメータ）**です。

代表例は、

- 一度にどれくらい大きく修正するか
- 何件ずつまとめて学ぶか
- AIをどれくらい複雑にするか

などです。

つまり、

> **ParameterはAIが学ぶ。**
>
> **Hyperparameterは、AIの学び方を決める。**

この違いが分かれば、この記事の一番大事な部分はもうつかめています。

## Parameterって何？――AIの中にある「大量のつまみ」

もう少しだけ具体的に見てみましょう。

犬と猫を見分けるAIは、写真を見た瞬間に、

「耳がこうだから犬」

「目がこうだから猫」

と、人間と同じ言葉で考えているわけではありません。

AIの中には、大量の数字があります。

写真を見て予想する。

正解と比べる。

間違っていたら、その数字を少し直す。

また写真を見る。

また直す。

これを何度も繰り返します。

この、**学習の中でAI自身が調整していく数字**がParameterです。

Neural Networkでは、Weight（重み）やBias（バイアス）などが代表例です。

ただし初心者の段階では、名前まで覚えなくても大丈夫です。

「AIの中には、自分で調整していく大量の数字がある」

くらいで十分です。

![AIが自分で学ぶ数字と、人間が外から決める数字](/images/articles/hyperparameters/fig-01-parameter-vs-hyperparameter.svg)

*左がAI自身の学習で変わるParameter。右が学ばせ方を決めるHyperparameterです。*

## では、Hyperparameterは何を決めるのか

ここからが本題です。

AIはParameterを自分で直します。

でも、

> **「一回でどれくらい直すの？」**

というルールは別に必要です。

たとえばAIが猫の写真を犬だと間違えたとします。

間違えたからといって、

「全部間違っていた！」

と内部の数字を一気に大きく変えたら、今度は別の写真でおかしくなるかもしれません。

逆に、

「ほんの少しだけ直そう」

と慎重すぎると、いつまでたっても学習が進みません。

この、

**1回の修正をどれくらい大きくするか**

を決める代表的な設定が、**Learning Rate（学習率）**です。

## Learning Rateは「一歩の大きさ」

Learning Rateは、よく山を下る話で説明されます。

霧の中にいて、谷底へ行きたいとします。

足元を見ると、どちらが下り坂かは分かる。

でも、

**一歩をどれくらい大きくするか**

は自分で決めなければなりません。

一歩が大きすぎると、谷底を飛び越えて反対側へ行ってしまう。

戻ろうとして、また飛び越える。

いつまでも落ち着きません。

逆に一歩が小さすぎると、方向は合っていてもなかなか谷底へ着きません。

AIの学習でも似たことが起こります。

- Learning Rateが大きすぎる → 修正が荒くなり、学習が不安定になることがある
- Learning Rateが小さすぎる → 学習がなかなか進まないことがある
- ちょうどよい → 安定して改善しやすい

という関係です。

![Learning Rateは、AIが一度にどれくらい大きく修正するかを決める](/images/articles/hyperparameters/fig-02-learning-rate.svg)

ここで大事なのは、

**「大きい方が速くて得」ではない**

ということです。

アクセルを強く踏めばいつでも早く着くわけではないのと同じです。

## Batch Sizeは「何枚見てから反省会するか」

もう一つ、よく出てくるHyperparameterが**Batch Size（バッチサイズ）**です。

名前だけ見ると難しそうですが、考え方は単純です。

犬と猫の写真が10万枚あるとします。

AIが、

1枚見る  
↓  
すぐ考え方を直す

という方法もあります。

あるいは、

32枚見る  
↓  
まとめて「どこを間違えたか」を確認する  
↓  
考え方を直す

という方法もあります。

この、

**何件まとめて見てから一度更新するか**

がBatch Sizeです。

Batch Sizeが小さいと、こまめに修正します。

大きいと、多くの例をまとめて見てから修正します。

どちらにも長所と短所があり、

「いつでも32が正解」

「大きい方が必ず良い」

というものではありません。

だから、ここでも人間は悩みます。

## ここで素朴な疑問が出る

Learning Rateも分かった。

Batch Sizeも分かった。

すると普通はこう思います。

> **「じゃあ、一番いい数字を最初から使えばいいやん」**

その通りです。

問題は、

**その「一番いい数字」が、最初から分からないこと**

です。

あるAIではLearning Rateが0.001でうまくいっても、別のAIでは違う値の方がよいかもしれません。

Dataが変われば、良い設定も変わることがあります。

AIの大きさが変われば、また事情が変わります。

つまりHyperparameterには、

> **どんなAIでも必ずこれにすればよい**

という万能の正解がありません。

だから実際のAI開発では、

設定を変える  
↓  
AIを学習させる  
↓  
結果を見る  
↓  
また設定を変える

という試行錯誤が必要になります。

## その「結果」は何を見て判断するのか

ここで、前の記事
[訓練・検証・テストデータの違い](/articles/train-validation-test-split)
につながります。

Hyperparameterを決めるとき、Trainingに使った写真だけを見て、

「この設定が一番いい」

と判断するのは危険です。

Trainingに使った問題は、AIがすでに見ています。

そこで、学習には使っていない**Validation Data**を使います。

難しく考えなくて大丈夫です。

学校でたとえるなら、

- Training Data = 練習問題
- Validation Data = 模擬試験

です。

Learning Rateを変えてみる。

Batch Sizeを変えてみる。

そして模擬試験で、どちらが良かったかを見る。

このように、

**Hyperparameterを選ぶための成績表**

としてValidation Dataを使います。

ここまで分かると、前の記事でValidation Setが必要だった理由も一つ増えます。

## ここまで読めば、いったん十分です

ここで一度まとめます。

AIは、自分で学びます。

でも、何もかも自分で決めるわけではありません。

AI自身が学習中に調整する数字が**Parameter**。

そのAIに、

- どれくらい大きく修正させるか
- 何件まとめて学ばせるか
- どれくらい複雑な仕組みにするか

といった**学び方を外側から決める設定**がHyperparameterです。

そして一番厄介なのは、

**良いHyperparameterが、最初から分からないこと。**

だから試して、Validationで比べます。

ここまで理解できれば、

> 「ハイパーパラメータって何？」

と聞かれたとき、

**「AI自身が覚える内容じゃなくて、AIの学ばせ方を決める設定」**

と答えられます。

初心者としては、それで十分です。

ここから先は、

**「じゃあ、その良い設定をどうやって探すの？」**

をもう少し深く見ていきます。

興味がある人だけ、そのまま進んでください。

---

## ここから先は、もう少し深く知りたい人へ

Hyperparameterが1個しかなければ、話は簡単です。

Learning Rateを、

- 0.1
- 0.01
- 0.001
- 0.0001

と変えて試せばいい。

ところが実際には、候補が増えます。

たとえば、

- Learning Rate
- Batch Size
- Weight Decay
- Dropout
- Hidden Size
- Layer数
- Optimizer
- Learning Rate Schedule

などです。

仮に5個のHyperparameterがあり、それぞれ10候補ずつ試すとします。

組み合わせは、

**10 × 10 × 10 × 10 × 10 = 100,000通り**

です。

一回のTrainingが数秒ならまだしも、数時間、数日かかるなら全部試すのは現実的ではありません。

ここでHyperparameter Tuningは、

「どの数字がいい？」

という問題から、

> **限られた時間と計算資源で、どこを試せばいい？**

という問題に変わります。

## 一番分かりやすい方法：Grid Search

まず考えやすいのが**Grid Search**です。

Learning Rateを3候補。

Batch Sizeも3候補。

なら、

3 × 3 = 9通り

を全部試します。

表を作って、すべてのマスを順番に調べるイメージです。

候補が少なければ、これはとても分かりやすい方法です。

しかしHyperparameterが増えると、組み合わせは急激に増えます。

そして、もう一つ弱点があります。

## すべての設定が、同じくらい重要とは限らない

Hyperparameterが10個あっても、

性能を大きく左右するのは、そのうち2個だけかもしれません。

残りは多少変えても、結果があまり変わらないかもしれない。

ところがGrid Searchは、

重要な設定にも、

あまり重要でない設定にも、

同じように候補を並べます。

ここで面白い発想が出てきます。

> **きれいに全部並べるより、ランダムに広く試した方がいい場合があるのでは？**

## 2012年：Random Searchという意外な答え

2012年、James BergstraとYoshua Bengioは、
**Random Search for Hyper-Parameter Optimization**
という論文をJMLRに発表しました。

Random Searchは、その名の通り、

**Hyperparameterの組み合わせをランダムに選んで試す**

方法です。

一見すると、Grid Searchの方が真面目で賢そうに見えます。

ところが、性能を強く左右するHyperparameterが一部しかない場合、Random Searchには大きな利点があります。

たとえば本当に重要なのがLearning Rateだったとします。

Grid SearchでLearning Rateを3候補に固定してしまえば、100回実験してもLearning Rate自体は同じ3種類しか試さないことがあります。

Random Searchなら、試行ごとにLearning Rateも違う値を選べます。

同じ回数の実験でも、

**重要な設定を、よりいろいろな値で試せる可能性がある**

わけです。

![Grid SearchとRandom Search。きれいに並べることが必ずしも効率的とは限らない](/images/articles/hyperparameters/fig-03-grid-vs-random.svg)

これはHyperparameter Tuningの面白いところです。

「全部きっちり試す方が正しそう」

という直感が、いつでも正しいわけではありません。

## でもRandom Searchも、少しもったいない

Random Searchには良いところがあります。

ただし、前の実験結果をあまり活用しません。

たとえば20回試して、

「この辺りの設定はかなり良さそう」

と分かってきたとします。

人間なら、

> 次は、その近くをもう少し詳しく試そう

と考えますよね。

それをAlgorithmにやらせようという代表的な考え方が、
**Bayesian Optimization（ベイズ最適化）**です。

## Bayesian Optimizationは「次にどこを試すか」を考える

一つの設定を試すたびに、

設定A → まあまあ  
設定B → 良い  
設定C → 悪い

という情報がたまります。

Bayesian Optimizationでは、その結果を使って、

**次はどの設定を試すと有望そうか**

を考えます。

すでに良さそうな場所を深掘りするだけではありません。

まだ試していない場所にも可能性があるので、

- 良さそうな場所をさらに調べる
- 未知の場所も探す

というBalanceを取ります。

2012年にはJasper Snoek、Hugo Larochelle、Ryan P. Adamsらが、Machine LearningのHyperparameter OptimizationにBayesian Optimizationを実践的に使う研究を発表しています。

彼らの問題意識の一つは、

**Modelそのものは高度なのに、設定調整は経験則や総当たりに頼りやすい**

という点でした。

## 実は「AIを学ばせる側」も学んでいる

ここまで来ると、面白い構造が見えてきます。

AIの中では、

Training Dataを見る  
↓  
間違いを確認する  
↓  
Parameterを直す

という学習が行われます。

一方、AIの外側では、

Hyperparameterを決める  
↓  
AIをTrainingする  
↓  
Validation結果を見る  
↓  
次のHyperparameterを決める

という別のLoopがあります。

![AIの学習の外側でも、設定を探すLoopが回っている](/images/articles/hyperparameters/fig-04-tuning-loop.svg)

つまり、

**AIだけが学んでいるわけではありません。**

開発者やTuning Algorithmも、

「この設定は悪かった」

「この辺りは良さそうだ」

と結果から学んでいます。

Hyperparameter Tuningは、言ってみれば、

**AIを学ばせる方法そのものを探す作業**

なのです。

## ここでもValidationを見すぎると問題が起きる

では、Validation Scoreを見ながら1000通り試せば、必ず最高の設定が見つかるのでしょうか。

ここにも落とし穴があります。

大量の設定を試して、その中でValidation Scoreが一番高いものだけ選ぶと、

たまたまそのValidation Dataと相性がよかった設定を選んでしまうことがあります。

さらに、

Validationを見る  
↓  
設定を変える  
↓  
またValidationを見る  
↓  
また変える

を何度も繰り返すと、

開発全体がそのValidation Dataに合わせ込まれていきます。

これが、前の記事で触れた
**ValidationへのOverfitting**
につながります。

だから最後には、開発中に触らなかったTest Dataで確認します。

ここで、

Training / Validation / Test

とHyperparameter Tuningが一本につながります。

## Hyperparameterは「最初に一度だけ決める数字」とも限らない

初心者向けには、

「HyperparameterはTraining前に人間が決める設定」

と説明されることがあります。

入口としては分かりやすいのですが、実際にはもう少し広い概念です。

たとえばLearning Rateは、

最初は大きめ  
↓  
Trainingが進んだら小さくする

という使い方があります。

つまりTraining中に変わることもあります。

それでも、Weightのように通常の学習Loopの中でDataから直接更新されるParameterとは役割が違います。

Hyperparameterは、

**Trainingの進め方を外側から制御する設定**

と考えると分かりやすいでしょう。

## 2017年：Trainingしながら設定も変えるPBT

さらに一歩進めた考え方があります。

2017年、DeepMindは
**Population Based Training（PBT）**
を発表しました。

複数のModelを同時にTrainingします。

途中で成績を比べます。

成績の悪いModelは、良いModelの状態を参考にしながら、Hyperparameterも変えてTrainingを続けます。

つまり、

「全部Trainingしてから、次の設定を試す」

だけではありません。

**Trainingの途中で、学ばせ方まで変える**

のです。

![Population Based Trainingでは複数の学習を競わせながら設定も変える](/images/articles/hyperparameters/fig-05-pbt.svg)

ここまで来ると、

「Hyperparameter = 人間が手入力する数字」

という理解では足りないことが分かります。

人間が決めることもある。

Random Searchが選ぶこともある。

Bayesian Optimizationが次を提案することもある。

PBTのようにTraining中に変える方法もある。

大事なのは、

**AI本体が学ぶParameterとは別の階層で、学習方法を制御している**

という点です。

## ChatGPTのようなLLMにもHyperparameterはある

Large Language ModelのTrainingでも、Hyperparameterは重要です。

たとえば、

- Learning Rate
- Batch Size
- Optimizerに関する設定
- Weight Decay
- Training Step数
- Learning Rate Schedule
- Modelの大きさや構造に関する設計値

などがあります。

Modelが大きくなるほど、一回のTrainingに必要な計算量も大きくなります。

そのため、

「設定を外したから、もう一回最初から」

の代償も大きくなり得ます。

Hyperparameter Tuningは、単なる性能調整ではなく、

**限られた計算資源をどう使うか**

というEngineeringの問題でもあります。

## TemperatureやTop-pもHyperparameterなの？

ChatGPTなどの生成AIを使っていると、

- Temperature
- Top-p

という設定を見ることがあります。

これらもAIの挙動を変える設定ですが、

Learning Rateとは使われる場所が違います。

Learning Rateは、

**ModelをTrainingするとき**

の設定です。

TemperatureやTop-pは、

**Training済みModelから文章を生成するとき**

の設定です。

そのため、より正確には

**Inference時・Generation時のSampling Parameter**

として区別して考える方が分かりやすいです。

## 最後にもう一度、初心者向けに一言で

Hyperparameterという言葉を見ると、難しい数学の話に見えます。

でも中心にある考えは単純です。

AIには、

**自分で学ぶ部分**

と、

**人間や別のAlgorithmが「どう学ばせるか」を決める部分**

があります。

AI自身が学ぶ数字がParameter。

AIの学ばせ方を決める設定がHyperparameter。

Learning RateやBatch Sizeは、その代表例です。

そして良い設定は最初から分からないので、

試す  
↓  
結果を見る  
↓  
また試す

という探索が必要になります。

Hyperparameterを理解すると、

> **AIは「Dataを渡せば勝手に完成する箱」ではない**

ことが見えてきます。

強いAIを作るには、

何を学ばせるかだけでなく、

**どう学ばせるか**

まで設計しなければならないのです。

## 次に読む

- **AIに必要な確率の基礎** — AIが「確からしさ」をどう数字で扱うのか（準備中）
- **ディープラーニングとは？** — 大量のParameterを持つNeural Networkはどう学ぶのか（準備中）
- **Learning Rateとは？** — 「一歩の大きさ」がなぜTrainingを左右するのか（準備中）
- **Batch・Epoch・Stepとは？** — AIのTrainingがどんな単位で進むのか（準備中）

## 参考資料

- [Google for Developers - Machine Learning Glossary: Hyperparameter](https://developers.google.com/machine-learning/glossary/)
- [Google for Developers - Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/)
- [James Bergstra, Yoshua Bengio - Random Search for Hyper-Parameter Optimization, JMLR 2012](https://www.jmlr.org/papers/v13/bergstra12a.html)
- [Jasper Snoek, Hugo Larochelle, Ryan P. Adams - Practical Bayesian Optimization of Machine Learning Algorithms, NeurIPS 2012](https://papers.nips.cc/paper/2012/hash/05311655a15b75fab86956663e1819cd-Abstract.html)
- [Google DeepMind - Population Based Training of Neural Networks](https://deepmind.google/blog/population-based-training-of-neural-networks/)
