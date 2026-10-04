---
id: "BAS-0042"
title: "ハイパーパラメータとは？モデルが学ぶパラメータとの違い"
slug: "hyperparameters"
description: "機械学習のハイパーパラメータとは何かを、パラメータとの違い、学習率・バッチサイズ・モデル複雑度などの具体例から解説します。"
category: "AI基礎・技術"
level: 1
type: "concept"
status: "review"
publishedAt: "2026-10-04"
updatedAt: "2026-10-04"
author: "AI Portal編集部"
thumbnail: "/images/articles/hyperparameters/hero.svg"
tags: ["ハイパーパラメータ", "機械学習", "学習率", "モデル", "AI基礎"]
---

機械学習にはParameterとHyperparameterという、よく似た2つの言葉があります。

両方とも「モデルの設定値」のように見えますが、役割は大きく違います。

この記事では、**モデル自身が学ぶ値と、人間側が学習方法を決める値の違い**を整理します。

前提として、[機械学習とは？](/articles/what-is-machine-learning)と[訓練・検証・テストデータの違い](/articles/train-validation-test-split)を読むと理解しやすくなります。

![ハイパーパラメータはモデルの学び方を外側から決める](/images/articles/hyperparameters/hero.svg)

*ハイパーパラメータはモデルの学び方を外側から決める。*

## 最初に結論：Parameterは学習され、Hyperparameterは学習の外側で決める

GoogleのMachine Learning Glossaryでは、Hyperparameterを、モデルの学習を繰り返す際に人間やチューニングサービスが調整する変数として説明しています。

対してParameterは、訓練中にモデルが学習する重みやバイアスなどです。

簡単に言えば、

- Parameter：モデルがデータから学ぶ
- Hyperparameter：学び方を人間や探索アルゴリズムが決める

という違いです。

![Parameterは学習され、Hyperparameterは学習方法を決める](/images/articles/hyperparameters/fig-1.svg)

*Parameterは学習され、Hyperparameterは学習方法を決める。*

## 例：直線を学ぶモデル

単純な線形モデルを考えます。

予測式が、

予測値 = 重み × 入力 + バイアス

だとします。

重みとバイアスは、訓練データに合うようにモデルが調整します。

これらはParameterです。

一方、

- 学習率
- 何回学習するか
- 正則化の強さ

などは、モデルが同じ意味で自動的に学ぶ値ではありません。

これらがHyperparameterです。

![学習率が大きすぎても小さすぎても学習はうまく進まない](/images/articles/hyperparameters/fig-2.svg)

*学習率が大きすぎても小さすぎても学習はうまく進まない。*

## Learning Rate

代表的なHyperparameterがLearning Rate（学習率）です。

モデルは予測誤差を小さくする方向へParameterを更新します。

学習率は、その1回の更新でどれくらい動かすかを決めます。

### 大きすぎる

最適な値を飛び越え、学習が不安定になることがあります。

### 小さすぎる

学習が非常に遅くなり、十分に良い値へ到達できないことがあります。

GoogleのGlossaryでもLearning RateはHyperparameterの代表例として挙げられています。

![一度の更新に使うデータ数で計算と挙動が変わる](/images/articles/hyperparameters/fig-3.svg)

*一度の更新に使うデータ数で計算と挙動が変わる。*

## Batch Size

Batch Sizeは、一度の更新計算に何件の訓練例を使うかを決めます。

小さいBatchは更新回数が増え、ばらつきも大きくなります。

大きいBatchは計算をまとめやすい一方、多くのメモリを必要とします。

最適な値は、モデル、データ、ハードウェアによって異なります。

![学習率・Batch Size・正則化・深さなどが代表例](/images/articles/hyperparameters/fig-5.svg)

*学習率・Batch Size・正則化・深さなどが代表例。*

## モデルの複雑さもHyperparameterになる

アルゴリズムによっては、

- Decision Treeの深さ
- k-NNのk
- Neural Networkの層数やHidden Size
- 正則化係数
- Dropout率

などもHyperparameterになります。

つまりHyperparameterは単なる「細かい設定」ではありません。

モデルの能力、計算量、過学習しやすさを大きく変えることがあります。

## なぜTraining Setだけで選んではいけないのか

HyperparameterをTraining Setの成績だけで選ぶと、学習データに最適化しすぎる危険があります。

そこでValidation Setを使います。

典型的には、

1. Training Setでモデルを学習
2. Validation Setで性能を見る
3. Hyperparameterを変更
4. もう一度学習
5. 最も良い設定を選ぶ
6. 最後にTest Setで評価

という流れです。

これが、Validation Setが必要な大きな理由の一つです。

![候補を試し、Validationで比較して設定を選ぶ](/images/articles/hyperparameters/fig-4.svg)

*候補を試し、Validationで比較して設定を選ぶ。*

## Hyperparameter Tuningとは何か

Hyperparameter Tuningは、良い設定値を探す作業です。

単純な方法では、人間が候補を変えて試します。

より体系的には、

- Grid Search
- Random Search
- Bayesian Optimization
- Population Based Training
- AutoML

などの方法があります。

ただし、探索手法が高度でも「何を評価指標にするか」が間違っていれば意味がありません。

## Parameter数とHyperparameter数は別

大規模言語モデルでは「数十億Parameter」という表現をよく見ます。

これは通常、学習によって調整された大量の重みなどを指します。

Hyperparameterが数十億個あるという意味ではありません。

モデルサイズとして公表されるParameter数と、学習設定として選ぶHyperparameterを混同しないようにしましょう。

## Hyperparameterは学習されないのか

厳密には、「人間が手でしか決められない」と考える必要はありません。

AutoMLやHyperparameter Optimizationでは、外部の探索アルゴリズムが自動的に候補を試します。

それでも、

**モデル本体の通常の訓練で更新されるParameterとは別レベルの変数**

という区別は維持されます。

## 生成AIでも重要

大規模モデルの訓練でも、

- Learning Rate
- Batch Size
- Optimizer設定
- 学習ステップ
- Weight Decay
- モデル構造
- コンテキスト長

など、多くの設計値があります。

さらに推論時にもTemperatureやTop-pなどの設定があります。

これらは「モデルの知識」ではなく、学習や生成の挙動を制御する設定です。

## よくある誤解

### 「Hyperparameterは重要ではない」

誤りです。

同じデータ・同じアルゴリズムでも設定によって性能が大きく変わることがあります。

### 「Validationで最高なら絶対に最良」

Validation Setを何度も見ながら大量に調整すると、Validation Set自体へ過学習することがあります。

最終確認に独立したTest Setが必要です。

### 「大きいモデルほど設定は簡単」

逆に大規模学習では計算コストが高いため、Hyperparameterの失敗が非常に高価になることがあります。

## まとめ

Hyperparameterとは、**モデルの学習方法や構造を外側から制御する設定値**です。

Parameterは訓練データから学習されますが、Hyperparameterは人間やチューニングシステムが選びます。

代表例はLearning Rate、Batch Size、正則化強度、モデル深さなどです。

機械学習を理解するときは、

「モデルが何を学ぶか」
と
「どう学ばせるか」

を分けて考えることが重要です。

## 次に読む

- **AIに必要な確率の基礎** — モデルの予測や不確実性をどう数値で表すか（準備中）
- **ディープラーニングとは？** — 大規模ニューラルネットワークでHyperparameterがどう効くか（準備中）

## 参考資料

- [Google - Machine Learning Glossary: Hyperparameter](https://developers.google.com/machine-learning/glossary/)
- [Google - Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/)
- [Deep Learning Book - Machine Learning Basics](https://www.deeplearningbook.org/contents/ml.html)
