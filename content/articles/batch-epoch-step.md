---
id: "BAS-0045"
title: "Batch・Epoch・Stepとは？｜AIはDataを何件ずつ、何回使うのか"
slug: "batch-epoch-step"
description: "Batch・Epoch・Stepとは何かを、1000枚のDataを100枚ずつ学習する具体例から初心者向けに解説。Batch Size、Step、Epochの関係を一本の流れで理解します。"
category: "AI基礎・技術"
level: 1
type: "concept"
status: "published"
publishedAt: "2026-10-06"
updatedAt: "2026-10-06"
author: "AI Portal編集部"
thumbnail: "/images/articles/batch-epoch-step/hero.svg"
tags: ["Batch", "Epoch", "Step", "Batch Size", "AI学習"]
---

前の記事「[AIの学習とは？](/articles/ai-training)」では、

**Dataを見る  
→ 予想する  
→ Lossを測る  
→ Parameterを少し直す**

という流れを何度も繰り返す、と説明しました。

では、Dataが1000件あったらどうするのでしょうか。

1000件を全部まとめて1回で入れるのか。  
1件ずつ1000回に分けるのか。  
そして「5回学習した」というとき、何を5回と数えているのか。

ここを整理するために使う言葉が、**Batch・Step・Epoch**です。

![1000件のDataをBatchに分け、Stepを重ねてEpochを進める](/images/articles/batch-epoch-step/hero.svg)

## 1000枚をどう使う？

猫と犬を見分けるAIをTrainingするとします。

手元には、学習用の画像が**1000枚**あります。

ここで最初に考えるのは、

> **1000枚を、どんな単位でModelへ見せるか**

です。

全部を一度に処理できれば単純ですが、実際のAIではDataもModelも大きく、計算にはMemoryも必要です。

だからTrainingでは、Dataをいくつかのまとまりに分けて処理する方法がよく使われます。

今回は分かりやすく、

> **1000枚を100枚ずつ使う**

ことにします。

## 100枚ずつに分ける

1000枚を100枚ずつに分けると、

**100枚 × 10組**

になります。

この「一度にまとめて処理するDataのまとまり」が**Batch（バッチ）**です。

そして、

> **1 Batchに何件入れるか**

を**Batch Size**と呼びます。

今回なら、

**Batch Size = 100**

です。

![1000枚のDataを100枚ずつ10個のBatchへ分ける](/images/articles/batch-epoch-step/fig-01-batch.svg)

BatchとBatch Sizeは似ていますが、意味は少し違います。

- Batch：Dataのまとまりそのもの
- Batch Size：そのまとまりに何件入れるか

まずはこの違いだけ押さえれば十分です。

## 1回進むと1 Step

では、最初の100枚をModelへ入れます。

Modelはその100枚を使って予想し、Lossを計算し、Parameterを少し調整します。

この記事では、この

> **1 Batchを使って、1回Trainingを進める単位**

を**1 Step**と考えます。

![1 Batchを使って予想・Loss計算・Parameter更新を1回進める](/images/articles/batch-epoch-step/fig-02-step.svg)

最初の100枚を処理したら1 Step。

次の100枚を処理したら2 Step。

さらに次の100枚なら3 Stepです。

つまり今回の例では、

**1000枚 ÷ 100枚 = 10 Batch**

なので、全部のDataを一度使い切るまでに**10 Step**進みます。

## 10回で1 Epoch

10 Step進むと、1000枚すべてを一度使ったことになります。

この、

> **学習用Data全体を一通り使うこと**

を**1 Epoch（エポック）**と呼びます。

今回なら、

**10 Step = 1 Epoch**

です。

![10個のBatchを順番に処理し、10 Stepで1 Epochになる](/images/articles/batch-epoch-step/fig-03-epoch.svg)

ここで大切なのは、Epochが「Parameterを1回だけ直す」という意味ではないことです。

1 Epochの中では、Batchごとに何度もStepが進みます。

つまり、

**BatchはDataの分け方**  
**StepはTrainingが進む回数**  
**EpochはData全体を何周したか**

を表しています。

## 5周なら5 Epoch

1 Epoch終わったからといって、Trainingが終わるとは限りません。

同じ学習用Dataを、もう一度最初から使うことがあります。

1000枚を5周するなら、

**5 Epoch**

です。

今回の例では1 Epochが10 Stepなので、

**5 Epoch × 10 Step = 50 Step**

になります。

![同じ学習用Dataを何周も使い、Epochを重ねていく](/images/articles/batch-epoch-step/fig-04-repeat-epochs.svg)

ただし、毎EpochでDataをまったく同じ順番に並べるとは限りません。

Trainingでは順番をShuffleしてからBatchへ分けることもあります。

順番が変わっても、

> **学習用Data全体を一通り使えば1 Epoch**

という考え方は同じです。

## 3つを一本でつなぐ

ここまでの1000枚の例を、一本につなげます。

**学習用Data：1000枚  
↓  
Batch Size：100枚  
↓  
100枚ずつ10 Batchに分ける  
↓  
1 Batchを処理すると1 Step  
↓  
10 Stepで1000枚を一通り使う  
↓  
これで1 Epoch  
↓  
5周すれば5 Epoch = 50 Step**

これがBatch・Step・Epochの基本関係です。

式で覚える必要はありません。

ただ、Data数がきれいに割り切れる場合なら、

> **1 EpochあたりのStep数 = Data数 ÷ Batch Size**

と考えると整理しやすくなります。

Data数がBatch Sizeで割り切れない場合は、最後だけ小さいBatchになることがあります。

## なぜ分けて学ぶ？

では、なぜ最初から1000枚全部を一度に使わないのでしょうか。

一つの大きな理由は、**Memoryと計算量**です。

DataやModelが大きくなると、全部を同時に載せるのは難しくなります。

Batchに分ければ、

> **扱える量ずつ計算しながら、少しずつParameterを更新できる**

ようになります。

一方で、Batch Sizeを小さくすれば必ず良い、大きくすれば必ず良い、という単純な話でもありません。

Batch Sizeは、速度・Memory使用量・学習の進み方に関わる設定値です。

その「どの値を選ぶか」は、別の記事で扱う方が分かりやすい内容です。

ここでは、

> **Batchは大量Dataを、Trainingで扱いやすい単位へ分ける考え方**

と理解できれば十分です。

## 最後にもう一度

Batch・Step・Epochを、最後に一言ずつ整理します。

**Batch**  
→ 一度にまとめて処理するDataのまとまり

**Batch Size**  
→ 1 Batchに何件入れるか

**Step**  
→ 1 Batchを使ってTrainingを1回進める単位

**Epoch**  
→ 学習用Data全体を一通り使った回数

1000枚を100枚ずつなら、

**100枚 = 1 Batch  
10 Batch = 10 Step  
10 Step = 1 Epoch  
5 Epoch = 50 Step**

です。

ここまで理解できれば、Batch・Epoch・Stepの入口としては十分です。

次にTraining Logで、

> Epoch 3 / 10  
> Step 240 / 1000

のような表示を見ても、「何を数えているのか」がかなり読みやすくなるはずです。

## 参考資料

- [Keras - Model training APIs](https://keras.io/api/models/model_training_apis/)
- [PyTorch - Quickstart](https://docs.pytorch.org/tutorials/beginner/basics/quickstart_tutorial.html)
- [PyTorch - DataLoader](https://docs.pytorch.org/docs/stable/data.html)
