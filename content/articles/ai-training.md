---
id: "BAS-0024"
title: "AIの学習とは？｜どうやって間違いから賢くなるのか"
slug: "ai-training"
description: "AIの学習・Trainingとは何かを、予想→間違いを測る→内部の数字を直す→繰り返す、という流れから初心者向けに解説。学習済みModelができるまでをやさしく理解します。"
category: "AI基礎・技術"
level: 1
type: "concept"
status: "review"
publishedAt: "2026-10-06"
updatedAt: "2026-10-06"
author: "AI Portal編集部"
thumbnail: "/images/articles/ai-training/hero.svg"
tags: ["AI学習", "Training", "機械学習", "ニューラルネットワーク", "AI基礎"]
---

前の記事「[ニューラルネットワークとは？](/articles/what-is-neural-network)」では、

> **間違いが減るように、内部の数字を少しずつ調整する**

と説明しました。

でも、ここで疑問が残ります。

> どうやって「間違った」と分かるのか？  
> どうやって次は少し正しくなるのか？

この繰り返しが、AIの**Training（学習）**です。

![予想して、間違いを測り、少し直し、また予想する](/images/articles/ai-training/hero.svg)

## まず30秒で結論

AIの学習を一言で言うと、

> **Dataを使って予想し、間違いが減るようにModelの内部の数字を調整すること**

です。

流れはシンプルです。

**Dataを見る  
↓  
予想する  
↓  
ズレを測る  
↓  
内部を少し直す  
↓  
また予想する**

これを何度も繰り返します。

その結果、最初はうまく答えられなかったModelが、少しずつパターンを捉えられるようになります。

## 最初は何も知らない

猫と犬を見分けるAIを考えます。

Trainingを始めたばかりのModelは、

> 「この形なら猫」

という知識を最初から持っているわけではありません。

ニューラルネットワークの中には大量のWeightなどがありますが、その値はまだ役に立つ状態ではありません。

だから最初の予想は、かなり外れることがあります。

ここからDataを使って調整していきます。

## Dataを見せる

次に、ModelへDataを入れます。

たとえば猫と犬の画像です。

初心者向けには、

- 猫の画像
- 犬の画像
- それぞれの正解

がある場面を考えると分かりやすいです。

![画像と正解を使ってModelを学習させる](/images/articles/ai-training/fig-01-data-and-target.svg)

ただし、すべてのAI学習で人間が正解ラベルを付けるわけではありません。

ChatGPTのようなLarge Language Modelでは、文章の一部から次のTokenを当てるような方法で、大量のTextそのものから学習信号を作ることもあります。

大切なのは、

> **Modelが予想し、その予想を改善するための基準がある**

ことです。

## まず予想する

Dataを入れたら、Modelはまず答えを出します。

たとえば本当は猫なのに、

> 猫：30%  
> 犬：70%

と予想したとします。

当然、うまくいっていません。

でもこの失敗が重要です。

Trainingでは、最初から正解する必要はありません。

**予想と正解の差が分かれば、次にどちらへ直すかを考えられる**からです。

## 間違いを測る

では、どれくらい間違えたのでしょうか。

そのズレを数字にしたものが、**Loss（損失）**です。

![予想と正解のズレをLossとして数字にする](/images/articles/ai-training/fig-02-loss.svg)

予想が正解に近ければLossは小さくなる。

大きく外れていればLossは大きくなる。

実際のLossにはいろいろな種類がありますが、ここでは、

> **Loss = Modelの予想がどれくらいズレているかを表す数字**

と考えれば十分です。

## 少しだけ直す

Lossが分かったら、次はModelの内部を調整します。

ニューラルネットワークなら、Weightなどの**Parameter**を少し変えます。

ここで重要なのは、

> 一気に完璧な答えへ直す

わけではないことです。

少しだけ変えて、また予想します。

![Lossを見ながらParameterを少しずつ調整する](/images/articles/ai-training/fig-03-update-parameters.svg)

「どのParameterを、どちらへ、どれくらい動かすか」には、GradientやOptimizerという仕組みが使われます。

ただし、その中身は別の記事で十分です。

今は、

> **間違いが減る方向へ、内部の数字を少し動かす**

と分かれば大丈夫です。

## 何度も繰り返す

1回直しただけでは、まだ十分ではありません。

そこで、

**Dataを見る  
→ 予想する  
→ Lossを測る  
→ Parameterを直す**

を何度も繰り返します。

![同じ学習ループを何度も繰り返す](/images/articles/ai-training/fig-04-training-loop.svg)

さまざまなDataを経験することで、

> この形の組み合わせは猫らしい  
> こちらは犬らしい

というパターンを内部の数字に反映していきます。

これが「AIがDataから学ぶ」という意味です。

## 学習済みModelになる

Trainingが終わると、調整されたParameterを持つ**学習済みModel**ができます。

このModelへ新しい画像を入れると、

> これは猫らしい

と予想できるようになります。

ここで大切なのは、

**Trainingと、実際に答えを出す処理は別**

ということです。

Trainingは、内部の数字を調整する段階。

学習後に新しい入力へ答えを出す処理は、**Inference（推論）**と呼ばれます。

## 最後に一本でつなぐ

AIの学習をまとめます。

**最初はうまく答えられない  
↓  
Dataを入れる  
↓  
Modelが予想する  
↓  
ズレをLossで測る  
↓  
Parameterを少し直す  
↓  
何度も繰り返す  
↓  
学習済みModelになる**

これが基本の流れです。

つまりTrainingは、

> **答えを丸暗記する作業ではなく、間違いを手がかりに内部の数字を調整していく作業**

と考えると分かりやすいです。

ここまで理解できれば、AIの学習の入口としては十分です。

次は、この繰り返しを数えるために使う、**Batch・Epoch・Step**を見ていきます。

## 参考資料

- [Google for Developers - Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course)
- [Google for Developers - Gradient Descent](https://developers.google.com/machine-learning/crash-course/linear-regression/gradient-descent)
- [Deep Learning Book - Machine Learning Basics](https://www.deeplearningbook.org/contents/ml.html)
