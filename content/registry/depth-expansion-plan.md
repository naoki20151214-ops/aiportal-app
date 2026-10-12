# AI Portal Depth Expansion Plan

更新日: 2026-10-05

この文書は、AI Portalを「初心者向けサイト」で終わらせず、**完全初心者から専門・研究レベルまで連続して学べる知識体系**へ育てるための深度設計です。

## 1. 基本方針

AI Portalは、入口をやさしくする一方で、専門性を削りません。

目指す構造は、

**LEVEL 0 → LEVEL 1 → LEVEL 2 → LEVEL 3 → LEVEL 4 → LEVEL 5**

と、読者が必要な深さまで段階的に進めるKnowledge Graphです。

重要なのは、1記事を長大化して全レベルを詰め込むことではありません。

- 入口記事は入口記事として完結する
- 仕組みは仕組みの記事で深掘りする
- 実装は実装の記事へ進む
- 専門設計は専門記事へ進む
- 研究論点は研究記事へ進む

という分業を行います。

## 2. 現在のLEVEL分布

2026-10-05時点の500ノードでは、以下の分布です。

- LEVEL 0: 14
- LEVEL 1: 116
- LEVEL 2: 240
- LEVEL 3: 122
- LEVEL 4: 8
- LEVEL 5: 0

この数はKPIではなく、**Knowledge Graphの偏りを確認する診断値**です。

現状はLEVEL 0〜3が厚く、LEVEL 4〜5が薄いため、今後は専門・研究層を意識して補完します。

## 3. 深度設計の原則

### 入口は広く、奥は深く

Google検索やSNSなどから初めて来た読者は、LEVEL 0〜1で迷わず理解できることを優先します。

一方で、専門家や学習を継続する読者には、LEVEL 3〜5まで進める道を用意します。

### LEVELを記事内で混ぜない

LEVEL 1の記事の後半だけLEVEL 3にしない。

LEVEL 4の記事を初心者向け説明で薄めすぎない。

各記事は割り当てられたLEVELの読者に対して、最初から最後まで一貫した難易度を保ちます。

### 深掘りはNodeへ分割する

高度な内容が必要になった場合は、同じ記事の後半へ押し込まず、原則として別Nodeにします。

例:

- AIに必要な確率の基礎（LEVEL 1）
- 確率分布（LEVEL 2）
- Entropy（LEVEL 2）
- Cross Entropy（LEVEL 2）
- Bayesian Inference（LEVEL 3）
- Calibration（LEVEL 3）
- より高度なProbabilistic Modeling / Uncertainty / Bayesian Deep Learning（LEVEL 4〜5）

## 4. 主要分野ごとの到達点

すべてのTopicをLEVEL 5まで作る必要はありません。

ただし、AI Portalの主要分野には、少なくとも**専門レベルへ到達する学習経路**を持たせます。

### AI基礎・数理

入口:
- AI / Machine Learning / Deep Learning
- Probability / Vector / Matrix / Optimization

専門へ:
- Optimization Design
- Probabilistic Modeling
- Information Theory
- Generalization / Calibration / Uncertainty
- Scaling / Sparse Models / MoE

研究へ:
- 理論的仮定
- 新しいOptimization手法
- Scalingの限界
- Generalizationの未解決問題
- 新しいArchitecture / Training Method

### 生成AI・LLM

入口:
- LLM / Token / Prompt / RAG

専門へ:
- Decoding
- Retrieval Design
- Context Engineering
- Alignment
- Evaluation
- Agentic RAG
- Fine-tuning Strategy

研究へ:
- Reasoning
- Test-time Compute
- Long Context
- Hallucination / Faithfulness
- Model Editing
- Alignment Evaluation

### AIエージェント

入口:
- Agent / Tool Use / Memory / Workflow

専門へ:
- Reliability
- Idempotency
- Security
- Multi-agent Coordination
- Long-running Workflow
- Observability

研究へ:
- Autonomous Planning
- Agent Evaluation
- Coordination Protocol
- Emergent Multi-agent Behavior
- Safety / Control

### AI開発・インフラ

入口:
- GPU / Inference / Latency / Throughput

専門へ:
- Parallelism
- Quantization
- KV Cache
- Speculative Decoding
- Distributed Training
- Fault Tolerance
- Serving Architecture

研究へ:
- Kernel / Compiler Optimization
- Distributed Systems Design
- Novel Serving Architecture
- Hardware-aware Model Design
- Large-scale Training Efficiency

### フィジカルAI・ロボティクス

入口:
- Sensor / Perception / Planning / Control

専門へ:
- Sensor Fusion
- Motion Planning
- Control
- Sim2Real
- Robot Learning
- Safety

研究へ:
- World Models
- Embodied Foundation Models
- General-purpose Robot Policy
- Long-horizon Planning
- Real-world Evaluation

### AI活用・社会・安全

入口:
- Risk / Privacy / Copyright / Governance

専門へ:
- Red Teaming
- Model Evaluation
- Audit
- Enterprise Governance
- Security Control

研究へ:
- Evaluation Methodology
- Interpretability
- Alignment / Safety Measurement
- Socio-technical Risk Analysis

## 5. LEVEL 4・5を作る条件

LEVEL 4以上は、難しい言葉を増やすために作りません。

以下のいずれかが必要なときに作ります。

- 複数方式のTrade-offを専門的に比較する必要がある
- Production制約で設計判断が変わる
- 性能・Latency・Memory・Costの最適化が主題になる
- Failure Mode / Troubleshootingが独立した知識になる
- 論文や公式実装を比較しないと説明できない
- 理論的仮定や評価Protocolが結論に影響する
- 未解決問題・研究論点そのものがCenter Questionになる

## 6. 記事制作時のDepth Routing

執筆中に「これは難しすぎるが重要」と感じた場合、削除する前に次を確認します。

1. この内容は現在の記事のCenter Questionへ必須か
2. 現在の記事のLEVELで理解必須か
3. 既存のchildren / related Nodeに移せるか
4. 適切なNodeがなければ新Nodeを作るべきか
5. そのNodeのLEVELとprerequisiteは何か

**重要な高度内容を捨てず、適切な深度へRouteする**ことを基本動作にします。

## 7. 完成形

AI Portalの完成形は、

> 初心者がGoogle検索から1記事読んで理解できる。
> そのまま次の記事へ進めば、大学・実務・専門・研究レベルまで到達できる。

というサイトです。

「初心者にやさしい」と「専門家にも価値がある」を両立させ、**サイト全体を一冊の階層型教科書として設計する**ことを目標にします。
