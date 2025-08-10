"use client";
import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Target, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  TrendingUp
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
  subject?: string;
  domain?: string;
}

interface WeaknessMapProps {
  data: LearningNode[];
  onNodeClick: (node: LearningNode) => void;
  onStartPractice: (nodeId: string, type: 'current' | 'prerequisite' | 'quick') => void;
  subject?: string;
}

// 色の定義
const MASTERY_COLORS = {
  low: '#E53935',    // 赤 <60
  medium: '#FB8C00', // 橙 60-75
  high: '#FDD835',   // 黄 75-85
  excellent: '#43A047' // 緑 85+
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
  return Math.max(60, Math.min(100, 60 + questions * 4));
}

// 依存マップのメインコンポーネント
export function WeaknessMap({ data, onNodeClick, onStartPractice, subject = "math" }: WeaknessMapProps) {
  const [selectedNode, setSelectedNode] = useState<LearningNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dbData, setDbData] = useState<LearningNode[]>([]);
  const [loading, setLoading] = useState(true);

  // データベースから依存関係データを取得
  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/dependencies/${subject}/flow`);
        if (response.ok) {
          const result = await response.json();
          const topics = result.topics || [];
          
                     // データベースのデータをLearningNode形式に変換
           const convertedData: LearningNode[] = topics.map((topic: { id: number; name: string; prerequisites: string[]; dependencies: string[]; subject?: string; domain?: string }) => ({
            id: topic.id.toString(),
            name: topic.name,
            mastery: Math.floor(Math.random() * 100), // 仮のデータ
            questionCount: Math.floor(Math.random() * 15) + 5,
            prerequisites: topic.prerequisites || [],
            dependencies: topic.dependencies || [],
            mistakeTypes: {
              calculation: Math.floor(Math.random() * 80),
              comprehension: Math.floor(Math.random() * 60),
              logic: Math.floor(Math.random() * 70)
            },
            recentQuestions: [
              {
                id: "1",
                text: `${topic.name}に関する問題1`,
                isCorrect: Math.random() > 0.5,
                timeSpent: Math.floor(Math.random() * 60) + 30
              },
              {
                id: "2",
                text: `${topic.name}に関する問題2`,
                isCorrect: Math.random() > 0.5,
                timeSpent: Math.floor(Math.random() * 60) + 30
              },
              {
                id: "3",
                text: `${topic.name}に関する問題3`,
                isCorrect: Math.random() > 0.5,
                timeSpent: Math.floor(Math.random() * 60) + 30
              }
            ],
            difficulty: Math.random() > 0.7 ? 'hard' : Math.random() > 0.4 ? 'medium' : 'easy',
            estimatedTime: Math.floor(Math.random() * 20) + 10,
            priority: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
            subject: topic.subject,
            domain: topic.domain
          }));
          
          setDbData(convertedData);
        }
      } catch (error) {
        console.error('Failed to fetch dependencies:', error);
        // エラーの場合はサンプルデータを使用
        setDbData(sampleWeaknessData);
      } finally {
        setLoading(false);
      }
    };

    fetchDependencies();
  }, [subject]);

  // 使用するデータを決定（データベースデータがあれば使用、なければサンプルデータ）
  const displayData = dbData.length > 0 ? dbData : data;

  // ノードの位置を計算（横方向フロー図レイアウト）
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const levelMap: Record<string, number> = {};
    
    // レベルを計算
    displayData.forEach(node => {
      if (node.prerequisites.length === 0) {
        levelMap[node.id] = 0;
      } else {
        const maxPrereqLevel = Math.max(...node.prerequisites.map(p => {
          const prereqNode = displayData.find(n => n.name === p || n.id === p);
          return prereqNode ? (levelMap[prereqNode.id] || 0) : 0;
        }));
        levelMap[node.id] = maxPrereqLevel + 1;
      }
    });

    // 各レベル内での位置を計算
    const levelNodes: Record<number, string[]> = {};
    displayData.forEach(node => {
      const level = levelMap[node.id];
      if (!levelNodes[level]) levelNodes[level] = [];
      levelNodes[level].push(node.id);
    });

    // 横方向フロー図として配置
    Object.entries(levelNodes).forEach(([level, nodeIds]) => {
      const x = parseInt(level) * 300 + 150; // 横方向の間隔
      const startY = 100;
      
      nodeIds.forEach((nodeId, index) => {
        const y = startY + index * 200;
        positions[nodeId] = { x, y };
      });
    });

    return positions;
  }, [displayData]);

  const handleNodeClick = (node: LearningNode) => {
    setSelectedNode(node);
    onNodeClick(node);
  };

  if (loading) {
    return (
      <div className="flex h-[600px] bg-gray-50 rounded-xl overflow-hidden items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">依存関係データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] bg-gray-50 rounded-xl overflow-hidden">
      {/* 左側: 依存マップ */}
      <div className="flex-1 relative p-4 overflow-auto">
        <h3 className="text-lg font-semibold mb-4">学習依存マップ - {subject}</h3>
        
        {/* 接続線を描画 */}
        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', minWidth: '1200px', minHeight: '600px' }}>
          {displayData.map(node => 
            node.prerequisites.map(prereqName => {
              const prereqNode = displayData.find(n => n.name === prereqName || n.id === prereqName);
              if (!prereqNode) return null;
              
              const start = nodePositions[prereqNode.id];
              const end = nodePositions[node.id];
              if (!start || !end) return null;
              
              const isHovered = hoveredNode === node.id || hoveredNode === prereqNode.id;
              
              return (
                <line
                  key={`${prereqNode.id}-${node.id}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={isHovered ? "#3B82F6" : "#CBD5E1"}
                  strokeWidth={isHovered ? 3 : 2}
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
        {displayData.map(node => {
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
                  border: isSelected ? '3px solid #3B82F6' : '2px solid white',
                  boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                {node.mastery < 60 && <AlertTriangle className="w-4 h-4" />}
                {node.mastery >= 85 && <CheckCircle className="w-4 h-4" />}
                {node.mastery >= 60 && node.mastery < 85 && <TrendingUp className="w-4 h-4" />}
                <span className="text-xs font-bold">{node.mastery}%</span>
              </div>
              
              {/* ノード名 */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap">
                {node.name}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 右側: 詳細パネル */}
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        {selectedNode ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">{selectedNode.name}</h4>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">{selectedNode.mastery}%</span>
              </div>
            </div>

            {/* 定着度バー */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>定着度</span>
                <span>{selectedNode.mastery}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${selectedNode.mastery}%`,
                    backgroundColor: getMasteryColor(selectedNode.mastery)
                  }}
                />
              </div>
            </div>

            {/* 基本情報 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{selectedNode.questionCount}</div>
                <div className="text-xs text-gray-600">最近の出題</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{selectedNode.estimatedTime}分</div>
                <div className="text-xs text-gray-600">推定時間</div>
              </div>
            </div>

            {/* ミス傾向 */}
            <div className="space-y-2">
              <h5 className="font-medium text-sm">ミス傾向</h5>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>計算ミス</span>
                  <span>{selectedNode.mistakeTypes.calculation}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="h-1 bg-red-500 rounded-full"
                    style={{ width: `${selectedNode.mistakeTypes.calculation}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>読解ミス</span>
                  <span>{selectedNode.mistakeTypes.comprehension}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="h-1 bg-orange-500 rounded-full"
                    style={{ width: `${selectedNode.mistakeTypes.comprehension}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>条件整理</span>
                  <span>{selectedNode.mistakeTypes.logic}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="h-1 bg-blue-500 rounded-full"
                    style={{ width: `${selectedNode.mistakeTypes.logic}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 直近の問題 */}
            <div className="space-y-2">
              <h5 className="font-medium text-sm">直近の問題</h5>
              <div className="space-y-2">
                {selectedNode.recentQuestions.slice(0, 3).map((question, index) => (
                  <div
                    key={question.id}
                    className="p-2 bg-gray-50 rounded text-xs cursor-pointer hover:bg-gray-100"
                    onClick={() => onStartPractice(selectedNode.id, 'quick')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Q{index + 1}</span>
                      <div className="flex items-center gap-1">
                        {question.isCorrect ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                        )}
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{question.timeSpent}s</span>
                      </div>
                    </div>
                    <div className="text-gray-600 truncate">{question.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="space-y-2 pt-4 border-t">
              <button
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                onClick={() => onStartPractice(selectedNode.id, 'current')}
              >
                <Target className="w-4 h-4" />
                この単元からやる
              </button>
              
              {selectedNode.prerequisites.length > 0 && (
                <button
                  className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                  onClick={() => onStartPractice(selectedNode.id, 'prerequisite')}
                >
                  <ArrowRight className="w-4 h-4" />
                  前提単元に戻る
                </button>
              )}
              
              <button
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                onClick={() => onStartPractice(selectedNode.id, 'quick')}
              >
                <Zap className="w-4 h-4" />
                3問だけ解く
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>ノードをクリックして詳細を確認</p>
          </div>
        )}
      </div>
    </div>
  );
}

// サンプルデータ（フォールバック用）
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
  }
];
