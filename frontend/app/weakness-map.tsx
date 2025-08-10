"use client";
import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  RotateCcw, 
  Target, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  TrendingUp,
  BookOpen,
  Maximize2,
  Minimize2
} from "lucide-react";

// データ型定義
interface LearningNode {
  id: string;
  name: string;
  mastery: number; // 0-100
  questionCount: number; // 最近の出題量
  prerequisites: string[]; // 前提単元のID
  dependencies: string[]; // 後続単元のID
  mistakeTypes: {
    calculation: number; // 計算ミス率
    comprehension: number; // 読解ミス率
    logic: number; // 条件整理ミス率
  };
  recentQuestions: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    timeSpent: number;
  }>;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // 分単位
  priority: 'high' | 'medium' | 'low';
}

interface WeaknessMapProps {
  data: LearningNode[];
  onNodeClick: (node: LearningNode) => void;
  onStartPractice: (nodeId: string, type: 'current' | 'prerequisite' | 'quick') => void;
}

// 色の定義（指定された色を使用）
const MASTERY_COLORS = {
  low: '#E53935',    // 赤 <60
  medium: '#FB8C00', // 橙 60-75
  high: '#FDD835',   // 黄 75-85
  excellent: '#43A047' // 緑 85+
};

const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981'
};



// マスターレベルに基づく色を取得
function getMasteryColor(mastery: number): string {
  if (mastery < 60) return MASTERY_COLORS.low;
  if (mastery < 75) return MASTERY_COLORS.medium;
  if (mastery < 85) return MASTERY_COLORS.high;
  return MASTERY_COLORS.excellent;
}

// ノードサイズを出題量に基づいて計算
function getNodeSize(questions: number): number {
  return Math.max(50, Math.min(90, 50 + questions * 3));
}

// 依存マップのメインコンポーネント
export function WeaknessMap({ data, onNodeClick, onStartPractice }: WeaknessMapProps) {
  const [selectedNode, setSelectedNode] = useState<LearningNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // ノードの位置を計算（改良されたレイアウト）
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const levelMap: Record<string, number> = {};
    
    // レベルを計算（前提単元の最大レベル + 1）
    data.forEach(node => {
      if (node.prerequisites.length === 0) {
        levelMap[node.id] = 0;
      } else {
        const maxPrereqLevel = Math.max(...node.prerequisites.map(p => levelMap[p] || 0));
        levelMap[node.id] = maxPrereqLevel + 1;
      }
    });

    // 各レベル内での位置を計算
    const levelNodes: Record<number, string[]> = {};
    data.forEach(node => {
      const level = levelMap[node.id];
      if (!levelNodes[level]) levelNodes[level] = [];
      levelNodes[level].push(node.id);
    });

    // 位置を割り当て（より広いスペース）
    Object.entries(levelNodes).forEach(([level, nodeIds]) => {
      const y = parseInt(level) * 180 + 100;
      const startX = 120;
      const spacing = Math.max(200, 800 / nodeIds.length); // ノード数に応じて間隔を調整
      
      nodeIds.forEach((nodeId, index) => {
        const x = startX + index * spacing;
        positions[nodeId] = { x, y };
      });
    });

    return positions;
  }, [data]);

  const handleNodeClick = (node: LearningNode) => {
    setSelectedNode(node);
    onNodeClick(node);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // マウスドラッグでパン機能
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // スクロール時のパン機能を無効化
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-[800px]'} bg-gray-50 overflow-hidden flex flex-col`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold">学習依存マップ</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>弱点</span>
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span>要復習</span>
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span>習得済み</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="縮小"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="拡大"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="リセット"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={isFullscreen ? "全画面解除" : "全画面表示"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左側: 依存マップ */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-auto cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div
            className="relative transition-transform duration-200"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              minHeight: '100%',
              minWidth: '100%'
            }}
          >
            {/* 接続線を描画 */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', minWidth: '800px', minHeight: '600px' }}>
              {data.map(node => 
                node.prerequisites.map(prereqId => {
                  const start = nodePositions[prereqId];
                  const end = nodePositions[node.id];
                  if (!start || !end) return null;
                  
                  const isHovered = hoveredNode === node.id || hoveredNode === prereqId;
                  
                  return (
                    <line
                      key={`${prereqId}-${node.id}`}
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      stroke={isHovered ? "#3B82F6" : "#CBD5E1"}
                      strokeWidth={isHovered ? 3 : 2}
                      strokeDasharray={isHovered ? "5,5" : "none"}
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })
              )}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#CBD5E1" />
                </marker>
              </defs>
            </svg>

            {/* ノードを描画 */}
            {data.map(node => {
              const position = nodePositions[node.id];
              if (!position) return null;

              const size = getNodeSize(node.questionCount);
              const color = getMasteryColor(node.mastery);
              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNode === node.id;

              return (
                <motion.div
                  key={node.id}
                  className="absolute cursor-pointer"
                  style={{
                    left: position.x - size / 2,
                    top: position.y - size / 2,
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <div
                    className="rounded-full flex items-center justify-center text-white font-medium text-sm relative"
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: color,
                      border: isSelected ? '4px solid #3B82F6' : '3px solid white',
                      boxShadow: isHovered ? '0 8px 25px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.2)',
                    }}
                  >
                    {node.mastery < 60 && <AlertTriangle className="w-5 h-5" />}
                    {node.mastery >= 85 && <CheckCircle className="w-5 h-5" />}
                    {node.mastery >= 60 && node.mastery < 85 && <TrendingUp className="w-5 h-5" />}
                    <span className="text-xs font-bold">{node.mastery}%</span>
                  </div>
                  
                  {/* ノード名 */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 text-xs font-medium text-gray-700 bg-white px-3 py-1 rounded-full shadow-lg whitespace-nowrap border">
                    {node.name}
                  </div>

                  {/* 優先度インジケーター */}
                  <div 
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                    style={{ backgroundColor: PRIORITY_COLORS[node.priority] }}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 右側: 詳細パネル */}
        <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-6"
              >
                {/* ヘッダー */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-bold text-gray-900">{selectedNode.name}</h4>
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-blue-600" />
                      <span className="text-lg font-bold">{selectedNode.mastery}%</span>
                    </div>
                  </div>

                  {/* 定着度バー */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>定着度</span>
                      <span className="font-medium">{selectedNode.mastery}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                          backgroundColor: getMasteryColor(selectedNode.mastery)
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedNode.mastery}%` }}
                      />
                    </div>
                  </div>

                                     {/* 基本情報 */}
                   <div className="grid grid-cols-2 gap-4 pt-3">
                     <div className="text-center p-3 bg-blue-50 rounded-lg">
                       <div className="text-2xl font-bold text-blue-600">{selectedNode.questionCount}</div>
                       <div className="text-xs text-gray-600">最近の出題</div>
                     </div>
                     <div className="text-center p-3 bg-green-50 rounded-lg">
                       <div className="text-2xl font-bold text-green-600">{selectedNode.estimatedTime}分</div>
                       <div className="text-xs text-gray-600">推定時間</div>
                     </div>
                   </div>
                </div>

                {/* ミス傾向 */}
                <div className="space-y-3">
                  <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    ミス傾向分析
                  </h5>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">計算ミス</span>
                        <span className="font-medium">{selectedNode.mistakeTypes.calculation}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-red-500 rounded-full transition-all duration-300"
                          style={{ width: `${selectedNode.mistakeTypes.calculation}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">読解ミス</span>
                        <span className="font-medium">{selectedNode.mistakeTypes.comprehension}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-orange-500 rounded-full transition-all duration-300"
                          style={{ width: `${selectedNode.mistakeTypes.comprehension}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">条件整理</span>
                        <span className="font-medium">{selectedNode.mistakeTypes.logic}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${selectedNode.mistakeTypes.logic}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 直近の問題 */}
                <div className="space-y-3">
                  <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    直近の問題
                  </h5>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedNode.recentQuestions.slice(0, 5).map((question, index) => (
                      <motion.div
                        key={question.id}
                        className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => onStartPractice(selectedNode.id, 'quick')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">Q{index + 1}</span>
                          <div className="flex items-center gap-2">
                            {question.isCorrect ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{question.timeSpent}s</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 line-clamp-2">{question.text}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <motion.button
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    onClick={() => onStartPractice(selectedNode.id, 'current')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Target className="w-4 h-4" />
                    この単元から学習開始
                  </motion.button>
                  
                  {selectedNode.prerequisites.length > 0 && (
                    <motion.button
                      className="w-full bg-orange-600 text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
                      onClick={() => onStartPractice(selectedNode.id, 'prerequisite')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowRight className="w-4 h-4" />
                      前提単元に戻る
                    </motion.button>
                  )}
                  
                  <motion.button
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    onClick={() => onStartPractice(selectedNode.id, 'quick')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Zap className="w-4 h-4" />
                    3問クイック復習（3分）
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-gray-500 py-12 px-6"
              >
                <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">ノードを選択してください</p>
                <p className="text-sm">マップ上のノードをクリックして詳細を確認できます</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// サンプルデータ
export const sampleWeaknessData: LearningNode[] = [
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
  },
  {
    id: "decimals",
    name: "小数の計算",
    mastery: 30,
    questionCount: 10,
    prerequisites: [],
    dependencies: ["fractions"],
    mistakeTypes: {
      calculation: 70,
      comprehension: 20,
      logic: 10
    },
    recentQuestions: [
      { id: "16", text: "0.5 + 0.25 = ?", isCorrect: false, timeSpent: 35 },
      { id: "17", text: "1.2 × 0.3 = ?", isCorrect: false, timeSpent: 50 },
      { id: "18", text: "0.8 ÷ 0.2 = ?", isCorrect: true, timeSpent: 25 },
      { id: "19", text: "0.6 + 0.4 = ?", isCorrect: true, timeSpent: 15 },
      { id: "20", text: "2.5 × 0.4 = ?", isCorrect: false, timeSpent: 45 }
    ],
    difficulty: 'easy',
    estimatedTime: 10,
    priority: 'high'
  },
  {
    id: "algebra",
    name: "文字式",
    mastery: 75,
    questionCount: 5,
    prerequisites: ["fractions", "decimals"],
    dependencies: [],
    mistakeTypes: {
      calculation: 25,
      comprehension: 45,
      logic: 30
    },
    recentQuestions: [
      { id: "21", text: "x + 3 = 8 のとき、x = ?", isCorrect: true, timeSpent: 20 },
      { id: "22", text: "2x - 5 = 7 のとき、x = ?", isCorrect: true, timeSpent: 30 },
      { id: "23", text: "3x + 2 = 11 のとき、x = ?", isCorrect: false, timeSpent: 40 },
      { id: "24", text: "x/2 = 4 のとき、x = ?", isCorrect: true, timeSpent: 25 },
      { id: "25", text: "2x + 1 = 9 のとき、x = ?", isCorrect: true, timeSpent: 35 }
    ],
    difficulty: 'hard',
    estimatedTime: 18,
    priority: 'medium'
  }
];
