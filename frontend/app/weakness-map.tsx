"use client";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ====== 既存：汎用GET API関数・取得ユーティリティ ======
interface WindowWithAPI extends Window {
  API_BASE?: string;
  AUTH_TOKEN?: string;
}

// ====== Weakness Map（依存マップ + 詳細ペイン） ======
type WeakNode = { id: string; name: string; mastery: number; attempts: number; recent_decay?: number; domain?: string; };
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

// Domain別データの型定義
type DomainNodes = Record<string, WeakNode[]>;
type DomainEdges = Record<string, WeakEdge[]>;

// サンプルデータ（フォールバック用）
const fallbackNodesByDomain: DomainNodes = {
  "数と計算": [
    { id: "1", name: "整数の範囲", mastery: 85, attempts: 45, domain: "数と計算" },
    { id: "2", name: "小数", mastery: 78, attempts: 38, domain: "数と計算" },
    { id: "3", name: "分数", mastery: 72, attempts: 42, domain: "数と計算" },
  ],
  "数量関係": [
    { id: "15", name: "割合", mastery: 48, attempts: 35, domain: "数量関係" },
    { id: "16", name: "百分率・歩合", mastery: 52, attempts: 28, domain: "数量関係" },
  ],
  "図形": [
    { id: "35", name: "平面図形の基礎", mastery: 65, attempts: 30, domain: "図形" },
    { id: "43", name: "合同と相似", mastery: 55, attempts: 22, domain: "図形" },
  ],
  "量と測定": [
    { id: "50", name: "長さ・面積・体積", mastery: 70, attempts: 35, domain: "量と測定" },
    { id: "51", name: "重さ・時間", mastery: 65, attempts: 30, domain: "量と測定" },
  ]
};

const fallbackEdgesByDomain: DomainEdges = {
  "数と計算": [
    { from: "1", to: "2" },
    { from: "2", to: "3" },
  ],
  "数量関係": [
    { from: "15", to: "16" },
  ],
  "図形": [
    { from: "35", to: "43" },
  ],
  "量と測定": [
    { from: "50", to: "51" },
  ]
};



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
        {chips.map((c)=> <span key={c} className="px-2 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs">ミス：{c}</span>)}
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
  const [currentDomain, setCurrentDomain] = useState<string>("数と計算");

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
      // フォールバックデータを使用
      return { 
        nodes: fallbackNodesByDomain[currentDomain] || fallbackNodesByDomain["数と計算"], 
        edges: fallbackEdgesByDomain[currentDomain] || fallbackEdgesByDomain["数と計算"] 
      };
    }

    // データベースから取得したデータをdomain別にグループ化
    const nodesByDomain: DomainNodes = {};
    const edgesByDomain: DomainEdges = {};

    // データベースデータを変換
    const nodes: WeakNode[] = dependencyData.map((item) => ({
      id: item.id.toString(),
      name: item.name,
      mastery: Math.floor(Math.random() * 100), // 仮のデータ（実際はAPIから取得）
      attempts: Math.floor(Math.random() * 30) + 10,
      domain: item.domain || "その他"
    }));

    // domain別にグループ化
    nodes.forEach((node) => {
      const domain = node.domain || "その他";
      if (!nodesByDomain[domain]) {
        nodesByDomain[domain] = [];
      }
      nodesByDomain[domain].push(node);
    });

    // 依存関係を構築
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

    // domain別にエッジをグループ化
    edges.forEach((edge) => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (fromNode && toNode) {
        const domain = fromNode.domain || "その他";
        if (!edgesByDomain[domain]) {
          edgesByDomain[domain] = [];
        }
        edgesByDomain[domain].push(edge);
      }
    });

    // 現在のdomainのデータを返す
    const currentDomainNodes = nodesByDomain[currentDomain] || nodesByDomain["その他"] || [];
    const currentDomainEdges = edgesByDomain[currentDomain] || edgesByDomain["その他"] || [];

    return { 
      nodes: currentDomainNodes, 
      edges: currentDomainEdges 
    };
  }, [dependencyData, currentDomain]);

  const getSubjectName = (subject: string) => {
    switch (subject) {
      case "science": return "理科";
      case "social": return "社会";
      case "math": return "算数";
      default: return "算数";
    }
  };

  // 科目別のdomain一覧を取得
  const getDomainsForSubject = useCallback((subject: string) => {
    if (dependencyData.length > 0) {
      // データベースから取得したデータからdomain一覧を取得
      const domains = new Set<string>();
      dependencyData.forEach((item) => {
        if (item.domain) {
          domains.add(item.domain);
        }
      });
      return Array.from(domains);
    }
    
    // フォールバック用のdomain一覧
    switch (subject) {
      case "science":
        return ["物理", "化学", "生物", "地学"];
      case "social":
        return ["地理", "歴史", "公民"];
      case "math":
        return ["数と計算", "数量関係", "図形", "量と測定"];
      default:
        return ["数と計算", "数量関係", "図形", "量と測定"];
    }
  }, [dependencyData]);

  // 科目が変更されたときに適切なdomainを設定
  useEffect(() => {
    const domains = getDomainsForSubject(currentSubject);
    if (domains.length > 0 && !domains.includes(currentDomain)) {
      setCurrentDomain(domains[0]);
    }
  }, [currentSubject, currentDomain, getDomainsForSubject]);

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
      
      {/* Domain別タブ */}
      <div className="flex gap-2 overflow-x-auto">
        {getDomainsForSubject(currentSubject).map((domain) => (
          <button
            key={domain}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              currentDomain === domain 
                ? "bg-blue-100 text-blue-700 border border-blue-300" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setCurrentDomain(domain)}
          >
            {domain}
          </button>
        ))}
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
      attempts: Math.floor(Math.random() * 30) + 10,
      domain: item.domain
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
