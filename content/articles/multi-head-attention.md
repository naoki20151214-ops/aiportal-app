---
id: "BAS-0020"
title: "Multi-Head Attentionとは？｜なぜAttentionを複数使うのか"
slug: "multi-head-attention"
description: "Multi-Head Attention（マルチヘッド注意機構）はなぜ複数のAttentionを使うのか。「赤くて小さな帽子」の例を通して、別々の計算結果を組み合わせる理由と限界を学びます。"
category: "AI基礎・技術"
level: 2
type: "mechanism"
status: "review"
publishedAt: "2026-10-11"
updatedAt: "2026-10-11"
author: "AI Portal編集部"
thumbnail: "/images/articles/multi-head-attention/hero.svg"
tags: ["Multi-Head Attention", "Transformer", "Self-Attention", "Attention", "AI基礎"]
---

**赤くて小さな帽子を買った。**

この文章から帽子のことを考えると、少なくとも二つの手掛かりがあります。

「赤い」は色。「小さな」は大きさです。

前の記事「[Self-Attentionとは？](/articles/self-attention)」では、AIが同じ文章の別の位置の情報を使って、各位置の数値表現を計算する仕組みを学びました。

ここで、新しい疑問が生まれます。

> **Attentionが一つあれば、文章にある情報を全部まとめられるのでは？　なぜ複数使うの？**

実は、一つのAttentionでも複数の位置の情報を組み合わせられます。それでも、**異なる計算の仕方を並べて使える**ことが、Transformerの重要な工夫になっています。

その仕組みが**Multi-Head Attention（マルチヘッド・アテンション）**です。

今日は「複数にする必要性」から考えていきましょう。

![赤くて小さな帽子を手掛かりに複数のAttentionを説明する図](/images/articles/multi-head-attention/hero.svg)

## 一つでも情報は集まる

まず、大切な確認があります。

Attentionは、「一つの単語だけを選ぶ」仕組みではありません。

たとえば「帽子」の位置を処理するとき、参照できる「赤くて」に関わる位置にも、「小さな」に関わる位置にも、計算で重みを付けられます。

そして複数の位置の数値情報を、重みに応じて組み合わせられます。

つまり、一つのAttentionでも、複数の情報を扱えるのです。

ここを飛ばして「色担当と大きさ担当が必要だから二つに分ける」と説明すると、誤解が生まれます。

**一つでも情報を集められる。それなのに、なぜ複数なのか？**

そこが今回の本当の疑問です。

## 別々の計算を並べる

同じ文章を、二つの異なる観点から読み取る場面を想像してください。

たとえば、一人は色の手掛かりに目を向け、もう一人は大きさの手掛かりに目を向けるかもしれません。

二人の見方が違えば、同じ文章から得られる情報も違ってきます。

Multi-Head Attentionも、**複数のAttentionの計算を並べて、それぞれの出力を得る**という考え方です。

ここで、それぞれの計算の単位を**Head（ヘッド）**と呼びます。

ただし、この比喩を現実の仕組みと混同しないでください。

**実際のHeadが「色担当」「大きさ担当」に固定されるわけではありません。** どの関係を計算に反映するかは学習によって決まり、人間に読み取りやすい担当が見つかるとは限らないからです。

![複数のHeadが同じ入力からそれぞれ出力を計算する概念図](/images/articles/multi-head-attention/fig-01-heads.svg)

## 同じ入力なのに違う？

「同じ文章を使うなら、各Headの答えも同じになりそう」と感じませんか。

そこで、以前学んだ[Embeddingとは？](/articles/what-is-embedding)を思い出しましょう。

AIの内部では、言葉に対応する数値表現を、学習済みのパラメータで加工します。

Multi-Head Attentionでは、一般的に各Headが**それぞれの学習済みの変換**を使います。

そのため、同じ入力の位置から計算しても、Headごとに異なる数値表現やAttentionの重み、出力が得られます。

つまり、**入力が同じでも、計算のために作る数値が違う**のです。

「Headが増えたら、入力の文章も二倍になる」ということではありません。

![同じ入力が異なる学習済み変換を経て別々の出力になる図](/images/articles/multi-head-attention/fig-02-projections.svg)

## Headの中では何をする？

ここで、前の記事「[Query・Key・Valueとは？](/articles/query-key-value)」が登場します。

各Headでは、入力の数値表現からQuery・Key・Valueという計算用の数値を作ります。

QueryとKeyを使って参照先ごとの**重み**を計算し、その重みでValueを組み合わせるのが基本です。

ただ、この記事の目的はQ・K・Vの細かい計算を暗記することではありません。

**一つのHeadが、情報を重みに応じて組み合わせる計算を行う。**

そして、その計算が複数並んでいる。

今は、ここまで理解できれば十分です。

## 結果をどう使う？

複数のHeadが、それぞれの計算結果を出したとします。

でも、別々の結果を作るだけでは、モデルの次の処理へうまくつながりません。

そこで、元のTransformerなどで使われる代表的な構成では、各Headの結果を**横に並べて一つにまとめ、さらに学習済みの変換を行います**。

つまり、

**一つの入力  
↓  
複数のHeadが別々に計算  
↓  
それぞれの数値出力をまとめる  
↓  
さらに変換して次の処理へ渡す**

という流れです。

数値のまとまりが作られるのであって、色担当の文章や大きさ担当の文章が別々に生成されるわけではありません。

![各Headの数値結果を結合し次の処理へ渡す図](/images/articles/multi-head-attention/fig-03-merge.svg)

## ここで迷ったら

この先を読む前に、どこで分からなくなったか確認してみてください。

- **「同じ文章の別の位置を参考にする」が分からない** → [Self-Attentionとは？](/articles/self-attention)の「赤い帽子」の例まで戻る。
- **「重みを決めて数値を取り込む」が分からない** → [Attentionとは？](/articles/what-is-attention)の「選ぶだけでは終わらない」を復習する。
- **「Query・Key・Valueから数字を作る」が分からない** → [Query・Key・Valueとは？](/articles/query-key-value)の「まず二つの仕事」を読む。そこで難しければ、記事内の復習案内からさらに戻る。

**一段戻ることは、学習が遅れることではありません。** どの部分を理解し直すべきか分かる方が、次へ進みやすくなります。

## 複数なら必ず正確？

Headの数が多ければ多いほど、必ず賢いモデルになるのでしょうか。

そう単純には言えません。

Headの数に加えて、Headごとの数値表現の大きさ、モデル全体の構造、学習方法なども影響します。

また、複数のHeadが似た働きをする場合もあります。「Headを増やせば、必ず新しい意味が一つずつ見つかる」とは限りません。

Multi-Head Attentionは、**複数の異なる数値変換を使って、情報を組み合わせる選択肢を広げる仕組み**です。

性能がどう変わるかは、実際のモデルと学習結果で確かめる必要があります。

## 未来の言葉は見える？

もう一つだけ注意点です。

ChatGPT型の自己回帰モデルでは、通常、まだ先にあるToken位置を参照できません。

この制限は、Headを複数にしても勝手に消えるわけではありません。

それぞれのHeadが参照できる範囲は、モデルが設定したマスクなどの制限を受けます。

Self-Attentionの記事で学んだ「未来を見られない」という性質と、Multi-Head Attentionを使うことは矛盾しません。

## 今日の結論

今回の内容は、次の一文にまとめられます。

> **Multi-Head Attentionは、同じ入力に対して複数のAttention計算を行い、それぞれの数値出力をまとめて利用する仕組み。**

一つのAttentionでも情報を集められます。

しかし複数のHeadが**異なる学習済み変換**を使えば、同じ入力を違う形で扱えます。

ここで大切なのは、「色担当・大きさ担当」という比喩を覚えることより、**別々の計算結果を組み合わせる**という仕組みをつかむことです。

## 分からなければ戻ろう

最後まで読んで「そもそもHeadが何をしているのか分からない」と感じたら、[Self-Attentionとは？](/articles/self-attention)に戻り、「赤い帽子」の情報を利用する一つの計算を復習してみてください。

「数値をどう取り込むか」が分からなければ、[Attentionとは？](/articles/what-is-attention)へ戻るのが近道です。[Query・Key・Valueとは？](/articles/query-key-value)が難しければ、そこに設けた「ここで迷ったら」の案内から、さらに一段戻れます。

次へ進むために、**この記事を一度で完全に理解する必要はありません。** 戻り先が分かれば、必要なときに学び直せます。

## 参考資料

- [Vaswani et al. (2017) — Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [Harvard NLP — The Annotated Transformer](https://nlp.seas.harvard.edu/annotated-transformer/)
- [PyTorch — MultiheadAttention](https://docs.pytorch.org/docs/stable/generated/torch.nn.MultiheadAttention.html)
