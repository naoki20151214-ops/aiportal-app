---
id: "BAS-0017"
title: "Transformerとは？｜AIは離れた言葉の関係をどう見つけるのか"
slug: "what-is-transformer"
description: "Transformerを初心者向けに解説。文章中の離れた言葉の関係、Attention、位置情報、並列処理を具体例から理解し、LLMにつながる基礎を学びます。"
category: "AI基礎・技術"
level: 1
type: "concept"
status: "review"
publishedAt: "2026-10-08"
updatedAt: "2026-10-08"
author: "AI Portal編集部"
thumbnail: "/images/articles/transformer/hero.svg"
tags: ["Transformer", "Attention", "LLM", "言語モデル", "AI基礎"]
---

「昨日買った本は、とても面白かった。**それ**を友達にも勧めた。」

この文章の「それ」は、何を指しているでしょうか。

もちろん、**本**です。

人間なら、途中に別の言葉が入っていても自然に分かります。

でも、AIが文章を数字として扱っているなら、どうやって「それ」と「本」のつながりを見つけるのでしょうか。

その疑問を考えるために登場するのが、**Transformer（トランスフォーマー）**です。

![離れた言葉の関係を考えるTransformerの概念図](/images/articles/transformer/hero.svg)

## 離れた言葉がつながる

まず、次の文章を見てください。

> **猫がソファで眠っていた。しばらくして、それは目を覚ました。**

「それ」が指すのは「猫」だと考えるのが自然です。

「それ」のすぐ前にある「しばらくして」ではありません。

文章を理解するには、隣り合った言葉だけでなく、**離れた位置にある言葉の関係**も重要です。

![猫とそれが文章の離れた位置でつながる](/images/articles/transformer/fig-01-relations.svg)

ここで「AIは一つ前の言葉だけを見ればいい」という考えでは足りなくなります。

## 以前は順番に読んだ

Transformerより前にも、文章を扱うニューラルネットワークはありました。

代表的な方式の一つがRNNです。

RNNは文章を順番に処理し、前の情報を次へ引き継ぐ仕組みを持っています。

**猫が  
↓  
ソファで  
↓  
眠っていた  
↓  
それは……**

という具合です。

もちろん、従来の方式にも工夫があり、離れた言葉の関係をまったく扱えなかったわけではありません。

ただし、長い系列で情報を保つことや、時間方向の処理を大規模に並列化することには難しさがありました。

![順番に処理する方式とTransformerの違い](/images/articles/transformer/fig-02-compare.svg)

## 関係を直接調べる

Transformerの重要な特徴は、**Attention**を中心的な仕組みとして利用することです。

Attentionは、簡単に言えば、

> **ある要素を処理するとき、ほかのどの要素をどれくらい参考にするか**

を計算する仕組みです。

「それ」を扱うときに、文章中の「猫」との関係を強く利用できる場合があります。

これは、人間が文章を読んで赤ペンで「それ→猫」と線を引くことと完全に同じではありません。

Model内部では、[Embeddingとは？](/articles/what-is-embedding)で学んだような数値表現を使い、要素間の関係を計算します。

![Attentionによって要素間の関係を計算する](/images/articles/transformer/fig-03-attention.svg)

**どのように関係の強さを計算するのか**は、次の記事「Attentionとは？」で扱います。

今は、離れた要素同士の情報を利用できることが重要です。

## 位置も分かるの？

ここで疑問が出てきます。

> 言葉同士の関係を見るだけなら、文章の順番が分からなくならない？

その通りです。

「犬が猫を追いかけた」と「猫が犬を追いかけた」では、登場する言葉が似ていても意味が変わります。

そこでTransformerでは、**位置の情報**もModelへ与えます。

その方法には、位置を表す数値を加える方式や、Attentionの計算に相対的な位置関係を組み込む方式などがあります。

![言葉の並びと位置情報の関係](/images/articles/transformer/fig-04-position.svg)

ここでは「Transformerは言葉の関係だけでなく、順番を扱う工夫も必要」と理解すれば十分です。

## 一度に計算しやすい

Transformerが広く使われるようになった理由は、言葉の関係を扱えることだけではありません。

多くの計算をまとめて処理しやすいことも重要です。

従来のRNNのように前の時刻の計算結果を次の時刻へ順番に渡す構造と比べると、TransformerのAttention計算は、Training時に系列の複数位置を並列に扱いやすい特徴があります。

ただし、**Transformerなら何でも一度に生成できる**わけではありません。

ChatGPTのように次のTokenを一つずつ生成する自己回帰型Modelでは、出力の生成自体は順番に進みます。

![Trainingでの並列計算と回答生成時の逐次処理](/images/articles/transformer/fig-05-parallel.svg)

この違いを覚えておくと、「Transformerは並列処理できる」と「文章を一つずつ生成する」が矛盾しないと分かります。

## Tokenが再び登場する

ここで、以前の「[トークンとは？](/articles/what-is-token)」を思い出してください。

文章はTokenへ分けられ、Token IDへ変換されます。

そのあと数値表現を取り出し、位置情報などを考慮しながらTransformerの層で処理します。

**文章  
↓  
Token  
↓  
Embeddingなどの数値表現  
↓  
位置情報を考慮  
↓  
Transformerで関係を計算  
↓  
次のTokenの予測などに利用**

![既習のTokenとEmbeddingがTransformerにつながる](/images/articles/transformer/fig-06-flow.svg)

これまで別々に学んできた言葉が、ようやく一つの流れにつながりました。

## LLMとの関係は？

Transformerは2017年に発表された研究「Attention Is All You Need」で提案されたアーキテクチャです。

その後、多くの大規模言語モデル（LLM）がTransformerを基盤として発展しました。

ただし、**Transformer＝LLM**ではありません。

Transformerはニューラルネットワークの構造です。

LLMは大規模な言語Modelのことです。

また、TransformerにもEncoder中心、Decoder中心、Encoder-Decoder型など、異なる構成があります。

画像など言語以外のDataにも利用されます。

つまりTransformerは、特定のチャットサービスだけの仕組みではないのです。

## 最後に一本でつなぐ

今日の話を整理しましょう。

**文章には離れた言葉の関係がある  
↓  
順番に処理する方式には難しさもあった  
↓  
TransformerはAttentionを活用する  
↓  
要素同士の関係を計算できる  
↓  
位置情報も考慮する  
↓  
大規模な学習で計算を並列化しやすい  
↓  
多くのLLMの基盤となった**

Transformerの全構造を覚える必要はまだありません。

まずは、

> **Transformerは、文章などの要素同士の関係をAttentionで扱うニューラルネットワークの仕組み**

と理解できれば十分です。

次は、いよいよ**Attentionとは何か**を具体的に見ていきます。

## 参考資料

- [Vaswani et al. (2017) — Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [Google Research — Transformer: A Novel Neural Network Architecture for Language Understanding](https://research.google/blog/transformer-a-novel-neural-network-architecture-for-language-understanding/)
- [Hugging Face — Transformers documentation](https://huggingface.co/docs/transformers/index)
