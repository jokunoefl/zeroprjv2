"use client";
import React, { useState } from "react";
import Link from "next/link";

// 単元データの型定義
interface Topic {
  id: string;
  name: string;
  subject: string;
  domain?: string;
  prerequisites: string[];
  dependencies: string[];
  mastery?: number;
  attempts?: number;
}

// 科目の定義
const SUBJECTS = [
  { id: "math", name: "算数" },
  { id: "japanese", name: "理解（国語）" },
  { id: "science", name: "理科" },
  { id: "social", name: "社会" }
];

// サンプルデータ
const sampleTopics: Topic[] = [
  // 算数
  { id: "math-1", name: "整数の範囲", subject: "math", prerequisites: [], dependencies: ["math-2"] },
  { id: "math-2", name: "小数", subject: "math", prerequisites: ["math-1"], dependencies: ["math-3"] },
  { id: "math-3", name: "分数", subject: "math", prerequisites: ["math-2"], dependencies: ["math-4"] },
  { id: "math-4", name: "約分と通分", subject: "math", prerequisites: ["math-3"], dependencies: ["math-5"] },
  { id: "math-5", name: "分数と小数の混合計算", subject: "math", prerequisites: ["math-4"], dependencies: ["math-6"] },
  { id: "math-6", name: "四則混合算", subject: "math", prerequisites: ["math-5"], dependencies: ["math-7"] },
  { id: "math-7", name: "累乗と指数", subject: "math", prerequisites: ["math-6"], dependencies: ["math-8"] },
  { id: "math-8", name: "正負の数", subject: "math", prerequisites: ["math-7"], dependencies: ["math-9"] },
  { id: "math-9", name: "整数の性質（倍数・約数）", subject: "math", prerequisites: ["math-8"], dependencies: ["math-10"] },
  { id: "math-10", name: "最小公倍数・最大公約数", subject: "math", prerequisites: ["math-9"], dependencies: ["math-15"] },
  { id: "math-15", name: "割合", subject: "math", prerequisites: ["math-10"], dependencies: ["math-16"] },
  { id: "math-16", name: "百分率・歩合", subject: "math", prerequisites: ["math-15"], dependencies: ["math-17"] },
  { id: "math-17", name: "割合文章題", subject: "math", prerequisites: ["math-16"], dependencies: ["math-25"] },
  { id: "math-25", name: "速さの基礎", subject: "math", prerequisites: ["math-17"], dependencies: ["math-26"] },
  { id: "math-26", name: "旅人算", subject: "math", prerequisites: ["math-25"], dependencies: ["math-35"] },
  { id: "math-35", name: "平面図形の基礎", subject: "math", prerequisites: ["math-26"], dependencies: ["math-43"] },
  { id: "math-43", name: "合同と相似", subject: "math", prerequisites: ["math-35"], dependencies: ["math-44"] },
  { id: "math-44", name: "相似比と面積比", subject: "math", prerequisites: ["math-43"], dependencies: [] },

  // 理解（国語）
  { id: "japanese-1", name: "漢字の読み（音読み・訓読み）", subject: "japanese", prerequisites: [], dependencies: ["japanese-2"] },
  { id: "japanese-2", name: "漢字の書き取り", subject: "japanese", prerequisites: ["japanese-1"], dependencies: ["japanese-3"] },
  { id: "japanese-3", name: "同音異義語・同訓異字", subject: "japanese", prerequisites: ["japanese-2"], dependencies: ["japanese-4"] },
  { id: "japanese-4", name: "類義語・対義語", subject: "japanese", prerequisites: ["japanese-3"], dependencies: ["japanese-5"] },
  { id: "japanese-5", name: "慣用句・ことわざ", subject: "japanese", prerequisites: ["japanese-4"], dependencies: ["japanese-6"] },
  { id: "japanese-6", name: "四字熟語", subject: "japanese", prerequisites: ["japanese-5"], dependencies: ["japanese-11"] },
  { id: "japanese-11", name: "品詞の識別", subject: "japanese", prerequisites: ["japanese-6"], dependencies: ["japanese-12"] },
  { id: "japanese-12", name: "文の成分（主語・述語・修飾語）", subject: "japanese", prerequisites: ["japanese-11"], dependencies: ["japanese-13"] },
  { id: "japanese-13", name: "敬語の使い方", subject: "japanese", prerequisites: ["japanese-12"], dependencies: ["japanese-14"] },
  { id: "japanese-14", name: "接続詞・指示語", subject: "japanese", prerequisites: ["japanese-13"], dependencies: ["japanese-15"] },
  { id: "japanese-15", name: "助詞・助動詞", subject: "japanese", prerequisites: ["japanese-14"], dependencies: ["japanese-21"] },
  { id: "japanese-21", name: "指示語の内容", subject: "japanese", prerequisites: ["japanese-15"], dependencies: ["japanese-22"] },
  { id: "japanese-22", name: "接続語の働き", subject: "japanese", prerequisites: ["japanese-21"], dependencies: ["japanese-23"] },
  { id: "japanese-23", name: "段落の要約", subject: "japanese", prerequisites: ["japanese-22"], dependencies: ["japanese-24"] },
  { id: "japanese-24", name: "文章の要旨", subject: "japanese", prerequisites: ["japanese-23"], dependencies: ["japanese-25"] },
  { id: "japanese-25", name: "筆者の主張", subject: "japanese", prerequisites: ["japanese-24"], dependencies: ["japanese-26"] },
  { id: "japanese-26", name: "比喩・表現技法", subject: "japanese", prerequisites: ["japanese-25"], dependencies: ["japanese-31"] },
  { id: "japanese-31", name: "文章の構成", subject: "japanese", prerequisites: ["japanese-26"], dependencies: ["japanese-32"] },
  { id: "japanese-32", name: "段落の書き方", subject: "japanese", prerequisites: ["japanese-31"], dependencies: ["japanese-33"] },
  { id: "japanese-33", name: "接続語の使い方", subject: "japanese", prerequisites: ["japanese-32"], dependencies: ["japanese-34"] },
  { id: "japanese-34", name: "敬語の使い分け", subject: "japanese", prerequisites: ["japanese-33"], dependencies: ["japanese-35"] },
  { id: "japanese-35", name: "文章の推敲", subject: "japanese", prerequisites: ["japanese-34"], dependencies: [] },
];

export default function AdminPage() {
  const [topics, setTopics] = useState<Topic[]>(sampleTopics);
  const [selectedSubject, setSelectedSubject] = useState<string>("math");
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 科目別のトピックをフィルタリング
  const filteredTopics = topics.filter(topic => 
    topic.subject === selectedSubject && 
    topic.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 新しいトピックを追加
  const handleAddTopic = () => {
    const newTopic: Topic = {
      id: `${selectedSubject}-${Date.now()}`,
      name: "",
      subject: selectedSubject,
      prerequisites: [],
      dependencies: []
    };
    setEditingTopic(newTopic);
    setIsAddingNew(true);
  };

  // トピックを編集
  const handleEditTopic = (topic: Topic) => {
    setEditingTopic({ ...topic });
    setIsAddingNew(false);
  };

  // トピックを削除
  const handleDeleteTopic = (topicId: string) => {
    if (confirm("この単元を削除しますか？依存関係も削除されます。")) {
      const updatedTopics = topics.filter(t => t.id !== topicId);
      // 依存関係からも削除
      const cleanedTopics = updatedTopics.map(topic => ({
        ...topic,
        prerequisites: topic.prerequisites.filter(p => p !== topicId),
        dependencies: topic.dependencies.filter(d => d !== topicId)
      }));
      setTopics(cleanedTopics);
    }
  };

  // 編集を保存
  const handleSaveTopic = () => {
    if (!editingTopic || !editingTopic.name.trim()) {
      alert("単元名を入力してください");
      return;
    }

    if (isAddingNew) {
      setTopics([...topics, editingTopic]);
    } else {
      setTopics(topics.map(t => t.id === editingTopic.id ? editingTopic : t));
    }
    setEditingTopic(null);
    setIsAddingNew(false);
  };

  // 編集をキャンセル
  const handleCancelEdit = () => {
    setEditingTopic(null);
    setIsAddingNew(false);
  };

  // 依存関係を追加
  const handleAddPrerequisite = (topicId: string, prereqId: string) => {
    const updatedTopics = topics.map(topic => {
      if (topic.id === topicId) {
        return {
          ...topic,
          prerequisites: [...topic.prerequisites, prereqId]
        };
      }
      if (topic.id === prereqId) {
        return {
          ...topic,
          dependencies: [...topic.dependencies, topicId]
        };
      }
      return topic;
    });
    setTopics(updatedTopics);
  };

  // 依存関係を削除
  const handleRemovePrerequisite = (topicId: string, prereqId: string) => {
    const updatedTopics = topics.map(topic => {
      if (topic.id === topicId) {
        return {
          ...topic,
          prerequisites: topic.prerequisites.filter(p => p !== prereqId)
        };
      }
      if (topic.id === prereqId) {
        return {
          ...topic,
          dependencies: topic.dependencies.filter(d => d !== topicId)
        };
      }
      return topic;
    });
    setTopics(updatedTopics);
  };

  // トピック名を取得
  const getTopicName = (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    return topic ? topic.name : topicId;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">管理者画面</h1>
              <p className="text-gray-600 mt-2">単元の依存関係を管理します</p>
            </div>
            <Link 
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              メイン画面に戻る
            </Link>
          </div>
        </div>

        {/* 科目選択 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">科目選択</h2>
          <div className="flex gap-2">
            {SUBJECTS.map(subject => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSubject === subject.id
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {subject.name}
              </button>
            ))}
          </div>
        </div>

        {/* 検索と追加 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">単元管理</h2>
            <button
              onClick={handleAddTopic}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              新しい単元を追加
            </button>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="単元名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 編集モーダル */}
        {editingTopic && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">
                {isAddingNew ? "新しい単元を追加" : "単元を編集"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    単元名
                  </label>
                  <input
                    type="text"
                    value={editingTopic.name}
                    onChange={(e) => setEditingTopic({ ...editingTopic, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="単元名を入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分野（オプション）
                  </label>
                  <input
                    type="text"
                    value={editingTopic.domain || ""}
                    onChange={(e) => setEditingTopic({ ...editingTopic, domain: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="分野を入力（例：物理、化学、生物）"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveTopic}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 単元リスト */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {SUBJECTS.find(s => s.id === selectedSubject)?.name}の単元一覧
            </h2>
            {filteredTopics.length === 0 ? (
              <p className="text-gray-500 text-center py-8">単元が見つかりません</p>
            ) : (
              <div className="space-y-4">
                {filteredTopics.map(topic => (
                  <div key={topic.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{topic.name}</h3>
                        {topic.domain && (
                          <p className="text-sm text-gray-500">分野: {topic.domain}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTopic(topic)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                    
                    {/* 前提条件 */}
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">前提条件</h4>
                      <div className="flex flex-wrap gap-2">
                        {topic.prerequisites.length === 0 ? (
                          <span className="text-gray-500 text-sm">前提条件なし</span>
                        ) : (
                          topic.prerequisites.map(prereqId => (
                            <span
                              key={prereqId}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
                            >
                              {getTopicName(prereqId)}
                              <button
                                onClick={() => handleRemovePrerequisite(topic.id, prereqId)}
                                className="text-green-600 hover:text-green-800"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 後続単元 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">後続単元</h4>
                      <div className="flex flex-wrap gap-2">
                        {topic.dependencies.length === 0 ? (
                          <span className="text-gray-500 text-sm">後続単元なし</span>
                        ) : (
                          topic.dependencies.map(depId => (
                            <span
                              key={depId}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                            >
                              {getTopicName(depId)}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 前提条件を追加 */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">前提条件を追加</h4>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddPrerequisite(topic.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                        defaultValue=""
                      >
                        <option value="">前提条件を選択...</option>
                        {filteredTopics
                          .filter(t => t.id !== topic.id && !topic.prerequisites.includes(t.id))
                          .map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              // ここでAPIにデータを保存
              console.log("保存するデータ:", topics);
              alert("データを保存しました（コンソールを確認してください）");
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            変更を保存
          </button>
        </div>
      </div>
    </div>
  );
}
