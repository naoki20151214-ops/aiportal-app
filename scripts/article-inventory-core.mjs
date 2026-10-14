const RANK = ['draft/', 'review/', 'feat/', 'preview/', 'release/', 'release-prep/'];

export function branchScore(name) {
  const i = RANK.findIndex(p => name.startsWith(p));
  return i === -1 ? RANK.length : i;
}

export function articleFields(markdown, {allowLegacy = false} = {}) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('Article has no YAML frontmatter');
  const text = match[1];
  const field = name => text.match(new RegExp(`^${name}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'))?.[1]?.trim();
  const id = field('id');
  const slug = field('slug');
  const status = field('status');
  if (!slug || (!allowLegacy && (!id || !status))) throw new Error('Article must specify slug; new Registry articles also require id and status');
  return {id: id || null, slug, status: status || (allowLegacy ? 'published' : null)};
}

export function imagePaths(markdown) {
  return [...new Set([...markdown.matchAll(/!\[[^\]]*\]\((\/images\/[^)\s]+)\)/g)].map(x => `public${x[1]}`))];
}

export function flattenCurriculum(core, registry) {
  const byId = new Map(registry.nodes.map(node => [node.id, node]));
  if (byId.size !== registry.nodes.length) throw new Error('Duplicate Registry IDs');
  const all = core.days.flatMap(day => day.nodes.map((id, index) => {
    const node = byId.get(id);
    if (!node) throw new Error(`Core Curriculum references unknown Registry ID: ${id}`);
    return {...node, day: day.day, dayPosition: index + 1};
  }));
  if (all.length !== core.targetArticleCount || new Set(all.map(n => n.id)).size !== all.length) {
    throw new Error('Core Curriculum count or IDs are inconsistent');
  }
  return all;
}

export function inventoryForNodes({nodes, mainArticles, remoteBranches, pullRequests = []}) {
  const mainBySlug = new Map(mainArticles.map(a => [a.slug, a]));
  const evidence = new Map(nodes.map(n => [n.slug, []]));
  for (const branch of remoteBranches) {
    if (!branch.name || branch.name === 'main' || !Array.isArray(branch.tree)) continue;
    const contents = new Map(branch.tree.map(item => [item.path, item]));
    for (const node of nodes) {
      const file = contents.get(`content/articles/${node.slug}.md`);
      if (file?.type === 'blob') {
        evidence.get(node.slug).push({branch:branch.name, sha:file.sha, tree:branch.tree});
      }
    }
  }
  return nodes.map(node => {
    const main = mainBySlug.get(node.slug);
    const branches = evidence.get(node.slug)
      .sort((a,b) => branchScore(a.branch) - branchScore(b.branch) || a.branch.localeCompare(b.branch));
    const relevantPrs = pullRequests.filter(pr => {
      const matchId = new RegExp(`(^|[^A-Z0-9])${node.id}([^A-Z0-9]|$)`, 'i');
      return matchId.test(pr.title ?? '') || branches.some(b => b.branch === pr.head?.ref);
    }).map(pr => ({number:pr.number, state:pr.state, merged:!!pr.merged_at, branch:pr.head?.ref, title:pr.title}));
    const verdict = main ? (main.status === 'published' ? 'published' : 'reuse-main')
      : branches.length || relevantPrs.some(pr => !pr.merged) ? 'reuse-remote' : 'new-candidate';
    return {...node, mainArticleStatus:main?.status ?? null,
      mainImages:main?.images ?? null, mainImageMissing:main?.imageMissing ?? null,
      mainTest:main?.test ?? null,
      branches, prs:relevantPrs, representative:null, verdict};
  });
}

export function decideStart(row) {
  if (!row) return {allowed:false, why:'Article ID is not in Core Curriculum'};
  if (row.verdict === 'published') return {allowed:false, why:'Already published. Do not rewrite an existing publication.'};
  if (row.verdict === 'reuse-main') return {allowed:false, why:`Article already exists on main (${row.mainArticleStatus}). Resume review/publication instead.`};
  if (row.verdict === 'reuse-remote') return {allowed:false, why:`Existing artifact found in other branches/PRs. Reuse it: ${row.branches.slice(0,4).map(b=>b.branch).join(', ') || 'consult PR history'}`};
  if (row.status !== 'planned') return {allowed:false, why:`Registry status is ${row.status}, not planned. Audit this mismatch first.`};
  return {allowed:true, why:'No matching article in main, retained branches, or PR history at scan time. New drafting is eligible; claim the ID first.'};
}

export function checkReuseProvenance({row, sourceRef = undefined, incomingBranch, incomingPrNumber = undefined}) {
  if (!row) throw new Error('Unknown article ID');
  if (row.mainArticleStatus) throw new Error(`${row.id}: article already exists on main`);
  const candidates = row.branches.filter(b => b.branch !== incomingBranch);
  if (candidates.length === 0) {
    if (sourceRef) throw new Error(`${row.id}: declared reuse source has no verified article`);
    // The PR being inspected is not *prior* work. Only another PR's
    // evidence can block fresh drafting; retained source branches still
    // require reuse declarations below.
    const otherPrs = row.prs.filter(p => Number(p.number) !== Number(incomingPrNumber));
    if (otherPrs.some(p => !p.merged))
      throw new Error(`${row.id}: PR history suggests prior work; investigate before starting`);
    // A newly added PR article is normally draft/review/ready in the PR Registry.
    // Only existing main files, other retained branches, or PR history prove duplication.
    return 'NEW: no remote source found';
  }
  if (!sourceRef || !candidates.some(e => e.branch === sourceRef)) {
    throw new Error(`${row.id}: already exists on ${candidates.slice(0,4).map(e=>e.branch).join(', ')}. Add .github/article-reuse/${row.id}.yml with sourceRef referencing an existing source (do not merge preview-only PRs).`);
  }
  return `REUSE: source ${sourceRef} verified`;
}

export function markdownTable(rows, {repository, scannedAt, branchCount, prCount}) {
  const lines = [
    '# AI Portal｜Core Curriculum 100 制作管理表',
    '',
    `更新日時（UTC）：${scannedAt}`,
    '',
    `対象：${rows.length}記事｜走査ブランチ：${branchCount}｜PR履歴：${prCount}`,
    '',
    '**注意：** main の `planned` は未執筆の証拠ではありません。「既存成果物あり」の場合、新しく書き始めず、元の原稿を確認してください。自動生成の判定は公開承認を意味しません。',
    '',
    '|順|記事ID|記事タイトル|main|原稿・制作状況|画像|テスト|引き継ぎ元|',
    '|---:|---|---|---|---|---|---|---|',
  ];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const status = r.mainArticleStatus || r.status;
    const stage = r.verdict === 'published' ? '公開済み'
      : r.verdict === 'reuse-main' ? 'mainに原稿あり'
      : r.verdict === 'reuse-remote' ? (r.representative?.status ? `既存原稿（${r.representative.status}）` : '既存成果物あり（要確認）')
      : '既存原稿未検出';
    const image = r.mainImages != null ? `${r.mainImages.length}点${r.mainImageMissing?.length ? '（欠損あり）' : ''}`
      : r.representative ? `${r.representative.imageCount}点${r.representative.missingImages.length?'（欠損あり）':''}` : '未確認';
    const tests = r.mainTest === true ? 'あり' : r.representative?.testHint ? '候補あり' : '未確認';
    const refs = r.branches.slice(0,2).map(e => `[${e.branch}](https://github.com/${repository}/tree/${encodeURIComponent(e.branch)})`).join('・');
    const more = r.branches.length > 2 ? ` ほか${r.branches.length-2}件` : '';
    const prNotice = refs || more ? '' : r.prs.some(p=>!p.merged) ? '過去PRあり' : '—';
    lines.push(`|${i+1}|${r.id}|${r.title.replaceAll('|','／')}|${status}|${stage}|${image}|${tests}|${refs}${more}${prNotice}|`);
  }
  const counts = Object.fromEntries(['published','reuse-main','reuse-remote','new-candidate'].map(v => [v, rows.filter(r=>r.verdict===v).length]));
  lines.splice(6,0,`集計：公開済 ${counts.published}／mainに原稿あり ${counts['reuse-main']}／他ブランチ等に原稿あり ${counts['reuse-remote']}／新規制作候補 ${counts['new-candidate']}`,'');
  return lines.join('\n')+'\n';
}
