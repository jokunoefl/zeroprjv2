"use client";
import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";

// ====== 既存：汎用GET API関数・取得ユーティリティ ======
interface ApiResponse {
  id?: number;
  subject?: string;
  topic?: string;
  text?: string;
  hint?: string;
  correct?: string;
  unit?: string;
  ok?: boolean;
}

interface WindowWithAPI extends Window {
  API_BASE?: string;
  AUTH_TOKEN?: string;
}

async function apiGet(path: string): Promise<ApiResponse>{
  const windowWithAPI = window as WindowWithAPI;
  if(!windowWithAPI.API_BASE){
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
    return { ok: true };
  }
  const API_BASE = windowWithAPI.API_BASE;
  const AUTH_TOKEN = windowWithAPI.AUTH_TOKEN;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : { 'Authorization': 'Bearer demo-jwt' })
    }
  });
  return await res.json();
}

// ====== Weakness Map（依存マップ + 詳細ペイン） ======
type WeakNode = { id: string; name: string; mastery: number; attempts: number; recent_decay?: number; };
type WeakEdge = { from: string; to: string };

// データベースから取得する依存関係データの型
interface DependencyData {
  id: number;
  name: string;
  prerequisites: string[];
  dependencies: string[];
  subject: string;
  domain?: string;
}

// 算数のサンプルデータ（フォールバック用）
const mathNodesSample: WeakNode[] = [
  { id: "1", name: "整数の範囲", mastery: 85, attempts: 45 },
  { id: "2", name: "小数", mastery: 78, attempts: 38 },
  { id: "3", name: "分数", mastery: 72, attempts: 42 },
  { id: "4", name: "約分と通分", mastery: 68, attempts: 35 },
  { id: "5", name: "分数と小数の混合計算", mastery: 65, attempts: 28 },
  { id: "6", name: "四則混合算", mastery: 70, attempts: 40 },
  { id: "7", name: "累乗と指数", mastery: 58, attempts: 25 },
  { id: "8", name: "正負の数", mastery: 75, attempts: 32 },
  { id: "9", name: "整数の性質（倍数・約数）", mastery: 62, attempts: 30 },
  { id: "10", name: "最小公倍数・最大公約数", mastery: 55, attempts: 22 },
  { id: "15", name: "割合", mastery: 48, attempts: 35 },
  { id: "16", name: "百分率・歩合", mastery: 52, attempts: 28 },
  { id: "17", name: "割合文章題", mastery: 45, attempts: 20 },
  { id: "25", name: "速さの基礎", mastery: 60, attempts: 25 },
  { id: "26", name: "旅人算", mastery: 42, attempts: 18 },
  { id: "35", name: "平面図形の基礎", mastery: 65, attempts: 30 },
  { id: "43", name: "合同と相似", mastery: 55, attempts: 22 },
  { id: "44", name: "相似比と面積比", mastery: 48, attempts: 18 },
];

// 理解（国語）のサンプルデータ
const japaneseNodesSample: WeakNode[] = [
  // 漢字・語彙
  { id: "1", name: "漢字の読み（音読み・訓読み）", mastery: 80, attempts: 45 },
  { id: "2", name: "漢字の書き取り", mastery: 75, attempts: 42 },
  { id: "3", name: "同音異義語・同訓異字", mastery: 72, attempts: 38 },
  { id: "4", name: "類義語・対義語", mastery: 68, attempts: 35 },
  { id: "5", name: "慣用句・ことわざ", mastery: 65, attempts: 32 },
  { id: "6", name: "四字熟語", mastery: 62, attempts: 28 },
  // 文法
  { id: "11", name: "品詞の識別", mastery: 70, attempts: 40 },
  { id: "12", name: "文の成分（主語・述語・修飾語）", mastery: 68, attempts: 36 },
  { id: "13", name: "敬語の使い方", mastery: 65, attempts: 30 },
  { id: "14", name: "接続詞・指示語", mastery: 72, attempts: 34 },
  { id: "15", name: "助詞・助動詞", mastery: 58, attempts: 25 },
  // 読解
  { id: "21", name: "指示語の内容", mastery: 75, attempts: 42 },
  { id: "22", name: "接続語の働き", mastery: 72, attempts: 38 },
  { id: "23", name: "段落の要約", mastery: 68, attempts: 35 },
  { id: "24", name: "文章の要旨", mastery: 65, attempts: 32 },
  { id: "25", name: "筆者の主張", mastery: 62, attempts: 28 },
  { id: "26", name: "比喩・表現技法", mastery: 58, attempts: 25 },
  // 作文
  { id: "31", name: "文章の構成", mastery: 70, attempts: 36 },
  { id: "32", name: "段落の書き方", mastery: 68, attempts: 34 },
  { id: "33", name: "接続語の使い方", mastery: 65, attempts: 30 },
  { id: "34", name: "敬語の使い分け", mastery: 62, attempts: 28 },
  { id: "35", name: "文章の推敲", mastery: 55, attempts: 22 },
];

// 算数の依存関係
const mathEdgesSample: WeakEdge[] = [
  { from: "1", to: "2" },
  { from: "2", to: "3" },
  { from: "3", to: "4" },
  { from: "4", to: "5" },
  { from: "5", to: "6" },
  { from: "6", to: "7" },
  { from: "7", to: "8" },
  { from: "8", to: "9" },
  { from: "9", to: "10" },
  { from: "10", to: "15" },
  { from: "15", to: "16" },
  { from: "16", to: "17" },
  { from: "17", to: "25" },
  { from: "25", to: "26" },
  { from: "26", to: "35" },
  { from: "35", to: "43" },
  { from: "43", to: "44" },
];

// 理解（国語）の依存関係
const japaneseEdgesSample: WeakEdge[] = [
  // 漢字・語彙の流れ
  { from: "1", to: "2" },
  { from: "2", to: "3" },
  { from: "3", to: "4" },
  { from: "4", to: "5" },
  { from: "5", to: "6" },
  // 文法の流れ
  { from: "11", to: "12" },
  { from: "12", to: "13" },
  { from: "13", to: "14" },
  { from: "14", to: "15" },
  // 読解の流れ
  { from: "21", to: "22" },
  { from: "22", to: "23" },
  { from: "23", to: "24" },
  { from: "24", to: "25" },
  { from: "25", to: "26" },
  // 作文の流れ
  { from: "31", to: "32" },
  { from: "32", to: "33" },
  { from: "33", to: "34" },
  { from: "34", to: "35" },
  // 分野間の関連
  { from: "6", to: "11" },  // 四字熟語 → 品詞の識別
  { from: "15", to: "21" }, // 助詞・助動詞 → 指示語の内容
  { from: "26", to: "31" }, // 比喩・表現技法 → 文章の構成
];

// 理科のサンプルデータ
const scienceNodesSample: WeakNode[] = [
  { id: "1", name: "光の性質（反射・屈折）", mastery: 75, attempts: 30 },
  { id: "2", name: "光の作図（鏡・レンズ）", mastery: 68, attempts: 25 },
  { id: "3", name: "音の性質（高さ・大きさ・波）", mastery: 72, attempts: 28 },
  { id: "4", name: "音の伝わり方（空気・水・金属）", mastery: 65, attempts: 22 },
  { id: "5", name: "電流と回路（直列・並列）", mastery: 58, attempts: 35 },
  { id: "6", name: "オームの法則と応用計算", mastery: 52, attempts: 30 },
  { id: "7", name: "電磁石の性質", mastery: 48, attempts: 20 },
  { id: "8", name: "電磁誘導と応用", mastery: 45, attempts: 18 },
  { id: "9", name: "力のはたらき（てこ・滑車）", mastery: 62, attempts: 25 },
  { id: "10", name: "力のつり合いとモーメント計算", mastery: 55, attempts: 22 },
  { id: "21", name: "状態変化（融解・凝固・蒸発・沸騰・凝縮）", mastery: 70, attempts: 32 },
  { id: "22", name: "物質の分類（純物質・混合物）", mastery: 65, attempts: 28 },
  { id: "23", name: "気体の発生方法と性質", mastery: 58, attempts: 25 },
  { id: "24", name: "水溶液の性質（酸・アルカリ・中和）", mastery: 52, attempts: 30 },
  { id: "25", name: "中和計算", mastery: 48, attempts: 20 },
  { id: "41", name: "植物の分類と特徴", mastery: 75, attempts: 35 },
  { id: "42", name: "光合成と呼吸", mastery: 68, attempts: 30 },
  { id: "43", name: "種子の発芽条件", mastery: 72, attempts: 25 },
  { id: "44", name: "花のつくりとはたらき", mastery: 65, attempts: 28 },
  { id: "45", name: "受粉と受精", mastery: 58, attempts: 22 },
  { id: "61", name: "地層と化石", mastery: 70, attempts: 30 },
  { id: "62", name: "火山と火成岩", mastery: 65, attempts: 25 },
  { id: "63", name: "地震の仕組みと震度・マグニチュード", mastery: 62, attempts: 28 },
  { id: "64", name: "プレートテクトニクス", mastery: 55, attempts: 20 },
  { id: "65", name: "気象の観測（温度・湿度・気圧）", mastery: 68, attempts: 32 },
];

const scienceEdgesSample: WeakEdge[] = [
  // 物理
  { from: "1", to: "2" },
  { from: "2", to: "3" },
  { from: "3", to: "4" },
  { from: "4", to: "5" },
  { from: "5", to: "6" },
  { from: "6", to: "7" },
  { from: "7", to: "8" },
  { from: "8", to: "9" },
  { from: "9", to: "10" },
  // 化学
  { from: "21", to: "22" },
  { from: "22", to: "23" },
  { from: "23", to: "24" },
  { from: "24", to: "25" },
  // 生物
  { from: "41", to: "42" },
  { from: "42", to: "43" },
  { from: "43", to: "44" },
  { from: "44", to: "45" },
  // 地学
  { from: "61", to: "62" },
  { from: "62", to: "63" },
  { from: "63", to: "64" },
  { from: "64", to: "65" },
];

// 社会のサンプルデータ
const socialNodesSample: WeakNode[] = [
  // 地理
  { id: "1", name: "日本の都道府県と県庁所在地", mastery: 80, attempts: 40 },
  { id: "2", name: "日本の地方区分（8地方区分）", mastery: 75, attempts: 35 },
  { id: "3", name: "日本の主要山地・山脈・山岳", mastery: 68, attempts: 30 },
  { id: "4", name: "日本の主要河川と流域", mastery: 65, attempts: 28 },
  { id: "5", name: "日本の主要平野と盆地", mastery: 62, attempts: 25 },
  { id: "6", name: "日本の気候区分", mastery: 58, attempts: 32 },
  { id: "7", name: "季節風と降水量の分布", mastery: 55, attempts: 20 },
  { id: "8", name: "農業地域の特徴（稲作・畑作・酪農）", mastery: 52, attempts: 22 },
  { id: "9", name: "漁業の種類と漁場", mastery: 48, attempts: 18 },
  { id: "10", name: "工業地域の特徴（太平洋ベルトなど）", mastery: 45, attempts: 25 },
  // 歴史
  { id: "26", name: "旧石器時代と縄文時代の暮らし", mastery: 70, attempts: 30 },
  { id: "27", name: "弥生時代と稲作の伝来", mastery: 65, attempts: 28 },
  { id: "28", name: "古墳時代と大和政権", mastery: 62, attempts: 25 },
  { id: "29", name: "飛鳥時代と大化の改新", mastery: 58, attempts: 22 },
  { id: "30", name: "奈良時代と平城京", mastery: 55, attempts: 20 },
  { id: "31", name: "平安時代の貴族文化", mastery: 52, attempts: 18 },
  { id: "32", name: "鎌倉時代と武士の台頭", mastery: 48, attempts: 25 },
  { id: "33", name: "室町時代と戦国時代", mastery: 45, attempts: 22 },
  { id: "34", name: "安土桃山時代と天下統一", mastery: 42, attempts: 20 },
  { id: "35", name: "江戸時代の政治と身分制度", mastery: 40, attempts: 18 },
  // 公民
  { id: "51", name: "日本国憲法の三大原則", mastery: 75, attempts: 35 },
  { id: "52", name: "基本的人権の種類", mastery: 70, attempts: 32 },
  { id: "53", name: "三権分立の仕組み", mastery: 65, attempts: 30 },
  { id: "54", name: "国会の役割と仕組み", mastery: 62, attempts: 28 },
  { id: "55", name: "内閣の役割と行政機関", mastery: 58, attempts: 25 },
  { id: "56", name: "裁判所の役割", mastery: 55, attempts: 22 },
  { id: "57", name: "地方自治と住民参加", mastery: 52, attempts: 20 },
  { id: "58", name: "選挙制度と政治参加", mastery: 48, attempts: 18 },
  { id: "59", name: "政党と政治資金", mastery: 45, attempts: 15 },
  { id: "60", name: "国際連合と国際協力", mastery: 42, attempts: 12 },
];

const socialEdgesSample: WeakEdge[] = [
  // 地理
  { from: "1", to: "2" },
  { from: "2", to: "3" },
  { from: "3", to: "4" },
  { from: "4", to: "5" },
  { from: "5", to: "6" },
  { from: "6", to: "7" },
  { from: "7", to: "8" },
  { from: "8", to: "9" },
  { from: "9", to: "10" },
  // 歴史
  { from: "26", to: "27" },
  { from: "27", to: "28" },
  { from: "28", to: "29" },
  { from: "29", to: "30" },
  { from: "30", to: "31" },
  { from: "31", to: "32" },
  { from: "32", to: "33" },
  { from: "33", to: "34" },
  { from: "34", to: "35" },
  // 公民
  { from: "51", to: "52" },
  { from: "52", to: "53" },
  { from: "53", to: "54" },
  { from: "54", to: "55" },
  { from: "55", to: "56" },
  { from: "56", to: "57" },
  { from: "57", to: "58" },
  { from: "58", to: "59" },
  { from: "59", to: "60" },
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

function WeaknessDetail({ node, onStart, subject = "math" }:{ node: WeakNode | null; onStart: (topic?: string)=>void; subject?: string }){
  if(!node){
    return (<div className="text-sm text-muted-foreground p-3">左のマップから単元を選ぶと、ミス傾向と即時練習の導線が表示されます。</div>);
  }

  // 科目別のミス傾向とトピックを設定
  const getMistakeChips = (nodeName: string, subject: string) => {
    switch (subject) {
      case "japanese":
        if (nodeName.includes("漢字")) return ["読み間違い", "書き間違い", "同音異義語"];
        if (nodeName.includes("文法")) return ["品詞の識別", "文の成分", "敬語の使い方"];
        if (nodeName.includes("読解")) return ["指示語の内容", "接続語の働き", "要旨の把握"];
        if (nodeName.includes("作文")) return ["文章の構成", "段落の書き方", "敬語の使い分け"];
        return ["語彙力", "理解力", "表現力"];
      case "science":
        if (nodeName.includes("光")) return ["作図ミス", "反射・屈折の理解", "レンズの性質"];
        if (nodeName.includes("音")) return ["波の性質", "伝わり方", "高さ・大きさ"];
        if (nodeName.includes("電流")) return ["回路の理解", "オームの法則", "計算ミス"];
        if (nodeName.includes("力")) return ["てこの原理", "滑車の仕組み", "モーメント計算"];
        return ["実験の理解", "計算ミス", "概念の理解"];
      case "social":
        if (nodeName.includes("地理")) return ["地名の暗記", "位置関係", "産業の特徴"];
        if (nodeName.includes("歴史")) return ["年代の暗記", "因果関係", "人物の役割"];
        if (nodeName.includes("公民")) return ["制度の理解", "権利と義務", "政治の仕組み"];
        return ["暗記", "理解", "関連付け"];
      case "math":
      default:
        if (nodeName.includes("割合")) return ["式設定", "百分率⇄小数", "もとにする量"];
        if (nodeName.includes("速さ")) return ["単位換算", "比の整え", "図の読み取り"];
        if (nodeName.includes("相似")) return ["相似比", "面積比", "作図"];
        return ["計算ミス", "条件整理", "単位"];
    }
  };

  const getTopic = (nodeName: string, subject: string) => {
    switch (subject) {
      case "japanese":
        if (nodeName.includes("漢字")) return "漢字";
        if (nodeName.includes("文法")) return "文法";
        if (nodeName.includes("読解")) return "読解";
        if (nodeName.includes("作文")) return "作文";
        return "国語";
      case "science":
        if (nodeName.includes("光") || nodeName.includes("音") || nodeName.includes("電流") || nodeName.includes("力")) return "物理";
        if (nodeName.includes("状態") || nodeName.includes("物質") || nodeName.includes("水溶液")) return "化学";
        if (nodeName.includes("植物") || nodeName.includes("光合成")) return "生物";
        if (nodeName.includes("地層") || nodeName.includes("火山") || nodeName.includes("地震")) return "地学";
        return "理科";
      case "social":
        if (nodeName.includes("都道府県") || nodeName.includes("地方") || nodeName.includes("山地") || nodeName.includes("河川")) return "地理";
        if (nodeName.includes("時代") || nodeName.includes("時代の暮らし")) return "歴史";
        if (nodeName.includes("憲法") || nodeName.includes("三権") || nodeName.includes("国会")) return "公民";
        return "社会";
      case "math":
      default:
        if (nodeName.includes("割合")) return "割合";
        if (nodeName.includes("速さ")) return "速さ";
        if (nodeName.includes("相似")) return "相似";
        return "計算";
    }
  };

  const chips = getMistakeChips(node.name, subject);
  const topic = getTopic(node.name, subject);

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
  const [dependencyData, setDependencyData] = useState<DependencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSubject, setCurrentSubject] = useState<string>("math");

  // データベースから依存関係データを取得
  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        setLoading(true);
        const windowWithAPI = window as WindowWithAPI;
        if (windowWithAPI.API_BASE) {
          const response = await fetch(`${windowWithAPI.API_BASE}/dependencies/${currentSubject}/flow`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            // タイムアウトを設定
            signal: AbortSignal.timeout(5000)
          });
          if (response.ok) {
            const result = await response.json();
            setDependencyData(result.topics || []);
          } else {
            console.warn('API response not ok, using sample data');
            setDependencyData([]);
          }
        } else {
          console.log('No API_BASE configured, using sample data');
          setDependencyData([]);
        }
      } catch (error) {
        console.warn('Failed to fetch dependencies, using sample data:', error);
        setDependencyData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDependencies();
  }, [currentSubject]);

  // 依存関係データをWeakNodeとWeakEdgeに変換
  const { nodes, edges } = useMemo(() => {
    if (dependencyData.length === 0) {
      // サンプルデータを使用（科目別）
      switch (currentSubject) {
        case "japanese":
          return { nodes: japaneseNodesSample, edges: japaneseEdgesSample };
        case "science":
          return { nodes: scienceNodesSample, edges: scienceEdgesSample };
        case "social":
          return { nodes: socialNodesSample, edges: socialEdgesSample };
        case "math":
        default:
          return { nodes: mathNodesSample, edges: mathEdgesSample };
      }
    }

    // データベースデータを変換
    const nodes: WeakNode[] = dependencyData.map((item, index) => ({
      id: item.id.toString(),
      name: item.name,
      mastery: Math.floor(Math.random() * 100), // 仮のデータ（実際はAPIから取得）
      attempts: Math.floor(Math.random() * 30) + 10
    }));

    const edges: WeakEdge[] = [];
    dependencyData.forEach((item) => {
      if (item.prerequisites) {
        item.prerequisites.forEach((prereq) => {
          const prereqItem = dependencyData.find(d => d.name === prereq);
          if (prereqItem) {
            edges.push({ from: prereqItem.id.toString(), to: item.id.toString() });
          }
        });
      }
    });

    return { nodes, edges };
  }, [dependencyData, currentSubject]);

  const getSubjectName = (subject: string) => {
    switch (subject) {
      case "japanese": return "理解（国語）";
      case "science": return "理科";
      case "social": return "社会";
      case "math": return "算数";
      default: return "算数";
    }
  };

  const startQuickPack = async (topic?: string)=>{
    setLastPack(topic||"計算");
    // 実APIなら POST /practice/quickpack を呼ぶ
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-lg font-semibold">弱点マップ（{getSubjectName(currentSubject)}）</div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">依存関係データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">弱点マップ（{getSubjectName(currentSubject)}）</div>
        <div className="flex gap-2">
          <button 
            className={`px-3 py-1 rounded-lg text-sm ${currentSubject === "math" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
            onClick={() => setCurrentSubject("math")}
          >
            算数
          </button>
          <button 
            className={`px-3 py-1 rounded-lg text-sm ${currentSubject === "japanese" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
            onClick={() => setCurrentSubject("japanese")}
          >
            理解
          </button>
          <button 
            className={`px-3 py-1 rounded-lg text-sm ${currentSubject === "science" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
            onClick={() => setCurrentSubject("science")}
          >
            理科
          </button>
          <button 
            className={`px-3 py-1 rounded-lg text-sm ${currentSubject === "social" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
            onClick={() => setCurrentSubject("social")}
          >
            社会
          </button>
          <Link 
            href="/admin"
            className="px-3 py-1 rounded-lg text-sm bg-gray-800 text-white hover:bg-gray-700 transition-colors"
          >
            管理者
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border p-3 bg-white">
          <WeaknessMap nodes={nodes} edges={edges} onSelect={setSelected} />
        </div>
        <div className="rounded-2xl border p-3 bg-white">
          <WeaknessDetail node={selected} onStart={startQuickPack} subject={currentSubject} />
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
interface WeaknessMapComponentProps {
  data: Array<{
    id: string;
    name: string;
    mastery?: number;
    questionCount?: number;
    prerequisites?: string[];
  }>;
  onNodeClick?: (node: WeakNode) => void;
  onStartPractice?: (nodeId: string, type: 'current' | 'prerequisite' | 'quick') => void;
  subject?: string;
}

export function WeaknessMapComponent({ data, onNodeClick, onStartPractice, subject = "math" }: WeaknessMapComponentProps) {
  const [dependencyData, setDependencyData] = useState<DependencyData[]>([]);
  const [loading, setLoading] = useState(true);

  // データベースから依存関係データを取得
  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        setLoading(true);
        const windowWithAPI = window as WindowWithAPI;
        if (windowWithAPI.API_BASE) {
          const response = await fetch(`${windowWithAPI.API_BASE}/dependencies/${subject}/flow`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            // タイムアウトを設定
            signal: AbortSignal.timeout(5000)
          });
          if (response.ok) {
            const result = await response.json();
            setDependencyData(result.topics || []);
          } else {
            console.warn('API response not ok, using sample data');
            setDependencyData([]);
          }
        } else {
          console.log('No API_BASE configured, using sample data');
          setDependencyData([]);
        }
      } catch (error) {
        console.warn('Failed to fetch dependencies, using sample data:', error);
        setDependencyData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDependencies();
  }, [subject]);

  // 依存関係データをWeakNodeとWeakEdgeに変換
  const { nodes, edges } = useMemo(() => {
    if (dependencyData.length === 0) {
      // 既存のデータを使用
      const nodes: WeakNode[] = data.map((item) => ({
        id: item.id,
        name: item.name,
        mastery: item.mastery || Math.floor(Math.random() * 100),
        attempts: item.questionCount || Math.floor(Math.random() * 30) + 10
      }));

      const edges: WeakEdge[] = [];
      data.forEach((item) => {
        if (item.prerequisites) {
          item.prerequisites.forEach((prereq: string) => {
            edges.push({ from: prereq, to: item.id });
          });
        }
      });

      return { nodes, edges };
    }

    // データベースデータを変換
    const nodes: WeakNode[] = dependencyData.map((item) => ({
      id: item.id.toString(),
      name: item.name,
      mastery: Math.floor(Math.random() * 100), // 仮のデータ（実際はAPIから取得）
      attempts: Math.floor(Math.random() * 30) + 10
    }));

    const edges: WeakEdge[] = [];
    dependencyData.forEach((item) => {
      if (item.prerequisites) {
        item.prerequisites.forEach((prereq) => {
          const prereqItem = dependencyData.find(d => d.name === prereq);
          if (prereqItem) {
            edges.push({ from: prereqItem.id.toString(), to: item.id.toString() });
          }
        });
      }
    });

    return { nodes, edges };
  }, [dependencyData, data]);

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
      const originalNode = data.find((item) => item.id === node.id);
      onNodeClick(originalNode ? { ...originalNode, mastery: node.mastery, attempts: node.attempts } : node);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-lg font-semibold">弱点マップ（{subject}）</div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">依存関係データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

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
