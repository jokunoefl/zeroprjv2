"use client";
import React, { useMemo, useState } from "react";

// ====== 既存：汎用GET API関数・取得ユーティリティ ======
async function apiGet(path: string){
  if(!(window as any).API_BASE){
    const m = path.match(/\/questions\/(\d+)/);
    if(m){
      const id = Number(m[1]);
      if (id % 2) {
        // 算数：割合
        return {
          id,
          subject: "算数",
          topic: "割合（取得）",
          text: `定価2000円の商品を20%引きで販売したときの販売価格は？（ID:${id}）`,
          hint: "販売価格 = 定価 × 0.8",
          correct: "1600",
          unit: "円"
        };
      } else {
        // 国語：漢字
        return {
          id,
          subject: "国語",
          topic: "漢字の読み書き",
          text: `次の漢字の読みをひらがなで書きなさい：\n『情報』（ID:${id}）`,
          hint: "コンピュータで扱う○○",
          correct: "じょうほう",
          unit: ""
        };
      }
    }
    return { ok: true } as any;
  }
  const API_BASE = (window as any).API_BASE;
  const AUTH_TOKEN = (window as any).AUTH_TOKEN;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : { 'Authorization': 'Bearer demo-jwt' })
    }
  });
  return await res.json();
}

async function fetchQuestionById(questionId: number){
  return apiGet(`/questions/${questionId}`);
}

// ====== Weakness Map（依存マップ + 詳細ペイン） ======
type WeakNode = { id: string; name: string; mastery: number; attempts: number; recent_decay?: number; };
type WeakEdge = { from: string; to: string };

const weakNodesSample: WeakNode[] = [
  { id: "n1", name: "整数・小数・分数", mastery: 82, attempts: 40 },
  { id: "n2", name: "四則混合/通分・約分", mastery: 76, attempts: 28 },
  { id: "n3", name: "割合の定義・百分率", mastery: 63, attempts: 22 },
  { id: "n4", name: "損益・連続増減", mastery: 58, attempts: 18 },
  { id: "n5", name: "比（内分・連比）", mastery: 69, attempts: 21 },
  { id: "n6", name: "速さの基本", mastery: 71, attempts: 26 },
  { id: "n7", name: "旅人・通過・追いつき", mastery: 54, attempts: 19 },
  { id: "n8", name: "平面図形の性質", mastery: 74, attempts: 25 },
  { id: "n9", name: "相似・面積比", mastery: 65, attempts: 17 },
];

const weakEdgesSample: WeakEdge[] = [
  { from: "n1", to: "n2" },
  { from: "n2", to: "n3" },
  { from: "n3", to: "n4" },
  { from: "n3", to: "n5" },
  { from: "n5", to: "n6" },
  { from: "n6", to: "n7" },
  { from: "n2", to: "n8" },
  { from: "n8", to: "n9" },
  { from: "n5", to: "n9" }
];

function masteryColor(m: number){
  if(m < 60) return "bg-red-100 text-red-700 border-red-300";
  if(m < 75) return "bg-orange-100 text-orange-700 border-orange-300";
  if(m < 85) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-green-100 text-green-700 border-green-300";
}

function layerize(nodes: WeakNode[], edges: WeakEdge[]): WeakNode[][]{
  const id2node = Object.fromEntries(nodes.map(n=>[n.id,n]));
  const indeg: Record<string, number> = Object.fromEntries(nodes.map(n=>[n.id,0]));
  edges.forEach(e=>{ indeg[e.to] = (indeg[e.to]||0)+1; });
  const layers: WeakNode[][] = [];
  const used = new Set<string>();
  let frontier = nodes.filter(n=> (indeg[n.id]||0)===0);
  if(frontier.length===0) frontier = [nodes[0]];
  while(frontier.length){
    layers.push(frontier);
    frontier.forEach(n=>used.add(n.id));
    const nextIds = new Set<string>();
    edges.forEach(e=>{ if(used.has(e.from) && !used.has(e.to)) nextIds.add(e.to); });
    frontier = Array.from(nextIds).map(id=>id2node[id]).filter(Boolean);
    if(frontier.length===0){
      const rest = nodes.filter(n=>!used.has(n.id));
      if(rest.length) frontier = [rest[0]]; else break;
    }
  }
  return layers;
}

function WeaknessMap({ nodes, edges, onSelect }:{ nodes: WeakNode[]; edges: WeakEdge[]; onSelect: (n: WeakNode)=>void }){
  const layers = useMemo(()=>layerize(nodes, edges), [nodes, edges]);
  const positions: Record<string, {x:number;y:number}> = {};
  const colW = 260; const rowH = 84; const x0 = 16; const y0 = 16;
  layers.forEach((col, ci)=>{
    col.forEach((n, ri)=>{ positions[n.id] = { x: x0 + ci*colW, y: y0 + ri*rowH }; });
  });
  const width = Math.max(640, x0 + layers.length*colW + 120);
  const height = Math.max(320, y0 + Math.max(...layers.map(c=>c.length))*rowH + 40);

  return (
    <div className="w-full overflow-x-auto">
      <div className="relative" style={{ width, height }}>
        <svg className="absolute inset-0 w-full h-full">
          {edges.map((e,i)=>{
            const a = positions[e.from];
            const b = positions[e.to];
            if(!a||!b) return null;
            const x1=a.x+170, y1=a.y+28, x2=b.x+10, y2=b.y+28;
            return (
              <g key={i}>
                <defs>
                  <marker id={`arrow-${i}`} markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
                  </marker>
                </defs>
                <path d={`M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`} stroke="#94a3b8" strokeWidth="1.5" fill="none" markerEnd={`url(#arrow-${i})`} />
              </g>
            );
          })}
        </svg>
        {nodes.map(n=>{
          const p = positions[n.id];
          if(!p) return null;
          return (
            <button key={n.id} className={`absolute rounded-xl border px-3 py-2 text-left shadow-sm hover:shadow ${masteryColor(n.mastery)}`} style={{ left: p.x, top: p.y, width: 170 }} onClick={()=>onSelect(n)}>
              <div className="text-sm font-medium truncate">{n.name}</div>
              <div className="text-xs opacity-80">定着 {n.mastery}% ・ 試行 {n.attempts}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300"/> <span>{"<"}60%</span></span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-300"/> <span>60–75%</span></span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"/> <span>75–85%</span></span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300"/> <span>85%+</span></span>
      </div>
    </div>
  );
}

function WeaknessDetail({ node, onStart }:{ node: WeakNode | null; onStart: (topic?: string)=>void }){
  if(!node){
    return (<div className="text-sm text-muted-foreground p-3">左のマップから単元を選ぶと、ミス傾向と即時練習の導線が表示されます。</div>);
  }
  const chips = node.name.includes("割合") ? ["式設定", "百分率⇄小数", "もとにする量"] : node.name.includes("速さ") ? ["単位換算", "比の整え", "図の読み取り"] : ["計算ミス", "条件整理", "単位"];
  const topic = node.name.includes("割合") ? "割合" : node.name.includes("速さ") ? "速さ" : node.name.includes("相似") ? "相似" : "計算";
  return (
    <div className="space-y-3">
      <div className="text-sm"><span className="font-semibold">選択：</span>{node.name}</div>
      <div className="flex flex-wrap gap-2">
        {chips.map((c,i)=> <span key={i} className="px-2 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs">ミス：{c}</span>)}
      </div>
      <div className="text-xs text-muted-foreground">代表の1問（モック）</div>
      <div className="rounded-2xl border p-3 space-y-2">
        <div className="text-sm">この単元の典型問題を30秒で確認しましょう。</div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-xl bg-black text-white" onClick={()=>onStart(topic)}>3問だけ解く</button>
          <button className="px-3 py-1.5 rounded-xl bg-gray-100">解説を読む</button>
        </div>
      </div>
    </div>
  );
}

// ====== 画面統合（モック） ======
export default function App(){
  const [selected, setSelected] = useState<WeakNode|null>(null);
  const [lastPack, setLastPack] = useState<string|undefined>(undefined);

  const startQuickPack = async (topic?: string)=>{
    setLastPack(topic||"計算");
    // 実APIなら POST /practice/quickpack を呼ぶ
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-lg font-semibold">弱点マップ（算数）</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border p-3 bg-white">
          <WeaknessMap nodes={weakNodesSample} edges={weakEdgesSample} onSelect={setSelected} />
        </div>
        <div className="rounded-2xl border p-3 bg-white">
          <WeaknessDetail node={selected} onStart={startQuickPack} />
          {lastPack && (
            <div className="mt-3 text-xs text-muted-foreground">開始しました：{lastPack} の3問クイックドリル（モック）</div>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">※ 色：赤{'<'}60% / 橙60–75% / 黄75–85% / 緑85%+。ノードをクリックすると右に詳細が出ます。</div>
    </div>
  );
}

// 既存のコンポーネントとの互換性のため、元のインターフェースも保持
export function WeaknessMapComponent({ data, onNodeClick, onStartPractice, subject = "math" }: any) {
  // 既存のインターフェースを新しい実装に変換
  const nodes: WeakNode[] = data.map((item: any) => ({
    id: item.id,
    name: item.name,
    mastery: item.mastery || Math.floor(Math.random() * 100),
    attempts: item.questionCount || Math.floor(Math.random() * 30) + 10
  }));

  const edges: WeakEdge[] = [];
  data.forEach((item: any) => {
    if (item.prerequisites) {
      item.prerequisites.forEach((prereq: string) => {
        edges.push({ from: prereq, to: item.id });
      });
    }
  });

  const [selected, setSelected] = useState<WeakNode|null>(null);
  const [lastPack, setLastPack] = useState<string|undefined>(undefined);

  const startQuickPack = async (topic?: string)=>{
    setLastPack(topic||"計算");
    if (onStartPractice && selected) {
      onStartPractice(selected.id, 'quick');
    }
  };

  const handleNodeSelect = (node: WeakNode) => {
    setSelected(node);
    if (onNodeClick) {
      const originalNode = data.find((item: any) => item.id === node.id);
      onNodeClick(originalNode || node);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-lg font-semibold">弱点マップ（{subject}）</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border p-3 bg-white">
          <WeaknessMap nodes={nodes} edges={edges} onSelect={handleNodeSelect} />
        </div>
        <div className="rounded-2xl border p-3 bg-white">
          <WeaknessDetail node={selected} onStart={startQuickPack} />
          {lastPack && (
            <div className="mt-3 text-xs text-muted-foreground">開始しました：{lastPack} の3問クイックドリル（モック）</div>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">※ 色：赤{'<'}60% / 橙60–75% / 黄75–85% / 緑85%+。ノードをクリックすると右に詳細が出ます。</div>
    </div>
  );
}

// サンプルデータ（フォールバック用）
export const sampleWeaknessData = [
  {
    id: "fractions",
    name: "分数の計算",
    mastery: 45,
    questionCount: 8,
    prerequisites: [],
    dependencies: ["ratio", "percentage"],
    mistakeTypes: {
      calculation: 60,
      comprehension: 30,
      logic: 10
    },
    recentQuestions: [
      { id: "1", text: "1/2 + 1/3 = ?", isCorrect: false, timeSpent: 45 },
      { id: "2", text: "2/5 × 3/4 = ?", isCorrect: true, timeSpent: 30 },
      { id: "3", text: "3/4 ÷ 1/2 = ?", isCorrect: false, timeSpent: 60 },
      { id: "4", text: "1/3 + 2/3 = ?", isCorrect: true, timeSpent: 15 },
      { id: "5", text: "5/6 - 1/6 = ?", isCorrect: false, timeSpent: 40 }
    ],
    difficulty: 'medium',
    estimatedTime: 15,
    priority: 'high'
  },
  {
    id: "ratio",
    name: "割合",
    mastery: 65,
    questionCount: 12,
    prerequisites: ["fractions"],
    dependencies: ["percentage"],
    mistakeTypes: {
      calculation: 40,
      comprehension: 50,
      logic: 10
    },
    recentQuestions: [
      { id: "6", text: "原価1000円、利益20%の売価は？", isCorrect: true, timeSpent: 35 },
      { id: "7", text: "定価の8割で1200円、定価は？", isCorrect: false, timeSpent: 55 },
      { id: "8", text: "30%の食塩水200g、食塩は？", isCorrect: true, timeSpent: 25 },
      { id: "9", text: "5%の値引きで950円、元値は？", isCorrect: false, timeSpent: 50 },
      { id: "10", text: "原価の25%利益で1250円、原価は？", isCorrect: true, timeSpent: 30 }
    ],
    difficulty: 'hard',
    estimatedTime: 20,
    priority: 'medium'
  },
  {
    id: "percentage",
    name: "百分率",
    mastery: 85,
    questionCount: 6,
    prerequisites: ["fractions", "ratio"],
    dependencies: [],
    mistakeTypes: {
      calculation: 20,
      comprehension: 30,
      logic: 50
    },
    recentQuestions: [
      { id: "11", text: "80%を小数で表すと？", isCorrect: true, timeSpent: 10 },
      { id: "12", text: "0.35を百分率で表すと？", isCorrect: true, timeSpent: 15 },
      { id: "13", text: "25%の食塩水300g、食塩は？", isCorrect: true, timeSpent: 20 },
      { id: "14", text: "定価の15%引きで850円、定価は？", isCorrect: false, timeSpent: 45 },
      { id: "15", text: "原価の30%利益で1300円、原価は？", isCorrect: true, timeSpent: 25 }
    ],
    difficulty: 'medium',
    estimatedTime: 12,
    priority: 'low'
  }
];
