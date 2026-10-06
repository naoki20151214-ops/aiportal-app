---
id: "BAS-0025"
title: "AIの推論・Inferenceとは？｜学習済みModelはどう答えを出すのか"
slug: "ai-inference"
description: "AIの推論・Inferenceとは何かを、学習済みModelへ新しい画像を入れて予測を出す流れから初心者向けに解説。Trainingとの違いまで一本の流れで理解します。"
category: "AI基礎・技術"
level: 1
type: "concept"
status: "review"
publishedAt: "2026-10-06"
updatedAt: "2026-10-06"
author: "AI Portal編集部"
thumbnail: "/images/articles/ai-inference/hero.svg"
tags: ["Inference", "推論", "AI学習", "学習済みModel", "AI基礎"]
---

前の記事「[AIの学習とは？](/articles/ai-training)」では、Dataを使ってModelのParameterを少しずつ調整する**Training（学習）**を見ました。

Trainingが終わると、学習済みModelができます。

では、そのModelはいつ役に立つのでしょうか。

たとえば、猫と犬を見分けるTrainingに使っていない**新しい写真**を1枚見せたとします。

> この写真は、猫？ それとも犬？

学習済みModelを使って、この新しい入力から予測を出す処理が**Inference（推論）**です。

![Trainingで作った学習済みModelへ新しい入力を入れ、予測を出す](/images/articles/ai-inference/hero.svg)

## 新しい写真を見せる

猫と犬を見分けるModelをTrainingしたとします。

Training中には、たくさんの画像を見せました。

でも実際にAIを使うときに知りたいのは、

> **Trainingで見た画像を覚えているか**

ではありません。

これまで見ていない新しい写真を入れたときに、

> 「これは猫らしい」

と判断できるかどうかです。

そこで、学習済みModelへ新しい画像を入力します。

この時点では、もうTraining用Dataを何周もさせる必要はありません。

**今来た入力に対して、答えを出す。**

ここからInferenceが始まります。

## 入力を数字にする

Modelは写真を、人間のように「かわいい猫だ」と眺めているわけではありません。

AIの中では、画像は数字として扱われます。

たとえば画像なら、Pixelの値などを並べた数字のまとまりへ変換します。

以前の記事「[Tensorとは？](/articles/tensor-ai)」で見たように、AIではこうした大量の数字をTensorとして扱うことがあります。

![新しい画像をModelが計算できる数字のまとまりへ変換する](/images/articles/ai-inference/fig-01-input.svg)

つまり最初の流れは、

**新しい写真  
↓  
数字へ変換  
↓  
Modelへ入力**

です。

ここまでは、Modelが計算できる形へ入力を準備している段階です。

## 学習済みModelで計算

次に、その数字を学習済みModelへ通します。

ここでTrainingの結果が使われます。

Trainingでは、予想の間違いが減るようにWeightなどのParameterを何度も調整しました。

Inferenceでは、その**調整済みParameterを使って計算**します。

![Trainingで調整されたParameterを使って新しい入力を計算する](/images/articles/ai-inference/fig-02-trained-model.svg)

たとえばニューラルネットワークなら、入力された数字がLayerを順番に通りながら変換されていきます。

重要なのは、

> **Inferenceのたびに、最初からTrainingし直しているわけではない**

ということです。

すでに学んだModelを使って、新しい入力を処理しています。

## 予測が出てくる

計算の結果、Modelから出力が得られます。

たとえば、

> 猫：92%  
> 犬：8%

のような値が出たとします。

すると、このModelは、

> **この写真は猫らしい**

と予測したことになります。

![新しい入力から猫92%・犬8%という予測を出す](/images/articles/ai-inference/fig-03-output.svg)

画像分類なら「どの種類らしいか」。

数値予測なら「どのくらいになりそうか」。

生成AIなら、入力に続く内容を予測しながら出力を作ります。

扱うAIによって出力の形は違いますが、

> **学習済みModelへ新しい入力を入れ、計算結果を取り出す**

という基本は共通しています。

## Trainingとは何が違う？

ここが一番大切です。

TrainingとInferenceは、同じModelに関係しますが、目的が違います。

**Training**は、

> Dataを使って、ModelのParameterを改善する段階

です。

**Inference**は、

> 学習済みParameterを使って、新しい入力から予測や回答を出す段階

です。

![TrainingはParameterを調整し、Inferenceは学習済みParameterを使う](/images/articles/ai-inference/fig-04-training-vs-inference.svg)

初心者向けには、

**Training = 学ぶ  
Inference = 学んだものを使う**

と考えると分かりやすいです。

通常のInferenceでは、予測を1回出すたびにWeightを学習し直すわけではありません。

だから、

> AIに質問したら、その質問だけでModel全体のTrainingがその場で進む

と考えるのは正確ではありません。

## ChatGPTでも推論する

ChatGPTのような生成AIでも、利用者が入力して回答が返ってくる場面ではInferenceが行われています。

ただし、猫と犬を1回分類して終わる場合とは少し違います。

文章を生成するAIでは、

**入力を受け取る  
↓  
次に続きそうなTokenを予測する  
↓  
その結果を使って次を予測する  
↓  
繰り返して文章を作る**

という処理が行われます。

そのため、回答が長くなるほど計算も続きます。

ただし、Tokenや言語Modelの詳しい仕組みは後の記事で十分です。

今は、

> **ChatGPTが回答を出している時間も、学習済みModelを使うInferenceの時間**

と理解すれば大丈夫です。

## 最後に一本でつなぐ

Inferenceの流れをまとめます。

**Trainingを終える  
↓  
学習済みModelができる  
↓  
新しい入力が来る  
↓  
Modelが扱える数字へ変換する  
↓  
学習済みParameterで計算する  
↓  
予測や回答を出す**

これがInferenceです。

Trainingとの違いも一本につなげると、

**Trainingで学ぶ  
↓  
Parameterが調整される  
↓  
Inferenceで使う  
↓  
新しい入力へ答える**

となります。

つまりInferenceは、

> **AIが学んだことを、実際の入力に使う段階**

です。

ここまで理解できれば、AIの推論の入口としては十分です。

次は、文章を扱うAIが「次に何が来そうか」をどう考えるのか、**言語Model**へ進みます。

## 参考資料

- [Google for Developers - Machine Learning Glossary: Inference](https://developers.google.com/machine-learning/glossary#inference)
- [PyTorch - Saving and Loading Models](https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html)
- [TensorFlow - Basic classification](https://www.tensorflow.org/tutorials/keras/classification)
