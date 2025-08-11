"use client";
import React, { useState, useEffect, useCallback } from "react";
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

// APIレスポンスの型定義
interface ApiResponse {
  id: number;
  name: string;
  prerequisites: string[];
  dependencies: string[];
  subject: string;
  domain?: string;
}

// 科目の定義
const SUBJECTS = [
  { id: "math", name: "算数" },
  { id: "science", name: "理科" },
  { id: "social", name: "社会" }
];

// 科目別のdomainオプション（動的に取得するため初期値は空）
const DOMAIN_OPTIONS = {
  math: [],
  science: [],
  social: []
};

export default function AdminPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("math");
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [domainOptions, setDomainOptions] = useState<{[key: string]: string[]}>(DOMAIN_OPTIONS);
  const [prerequisitesOptions, setPrerequisitesOptions] = useState<{[key: string]: Array<{id: number, name: string}>}>({});
  const [editingPrerequisitesId, setEditingPrerequisitesId] = useState<string | null>(null);

  // APIベースURLを取得
  const getApiBase = useCallback(() => {
    if (typeof window !== 'undefined') {
      // 本番環境ではNEXT_PUBLIC_API_BASE環境変数を使用
      return (window as { API_BASE?: string }).API_BASE || 
             process.env.NEXT_PUBLIC_API_BASE || 
             'https://zeroprjv2.onrender.com';
    }
    return process.env.NEXT_PUBLIC_API_BASE || 'https://zeroprjv2.onrender.com';
  }, []);

  // データベースからドメイン一覧を取得
  const fetchDomains = useCallback(async (subject: string) => {
    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/domains/${subject}`);
      if (response.ok) {
        const data = await response.json();
        setDomainOptions(prev => ({
          ...prev,
          [subject]: data.domains || []
        }));
      } else {
        console.error('Failed to fetch domains:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    }
  }, [getApiBase]);

  // データベースから前提条件一覧を取得
  const fetchPrerequisites = useCallback(async (subject: string) => {
    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/prerequisites/${subject}`);
      if (response.ok) {
        const data = await response.json();
        setPrerequisitesOptions(prev => ({
          ...prev,
          [subject]: data.prerequisites || []
        }));
      } else {
        console.error('Failed to fetch prerequisites:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching prerequisites:', error);
    }
  }, [getApiBase]);

  // データベースから単元データを取得
  const fetchTopics = useCallback(async (subject: string) => {
    try {
      setLoading(true);
      const apiBase = getApiBase();
      console.log('Fetching topics from:', `${apiBase}/dependencies/${subject}`);
      
      const response = await fetch(`${apiBase}/dependencies/${subject}`);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data: ApiResponse[] = await response.json();
        console.log('Received data:', data);
        const convertedTopics: Topic[] = data.map(item => ({
          id: item.id.toString(),
          name: item.name,
          subject: item.subject,
          domain: item.domain,
          prerequisites: item.prerequisites || [],
          dependencies: item.dependencies || []
        }));
        setTopics(convertedTopics);
      } else {
        console.error('Failed to fetch topics:', response.status, response.statusText);
        // APIが利用できない場合のフォールバックデータ
        const fallbackData: Topic[] = [
          {
            id: "1",
            name: "サンプル単元1",
            subject: subject,
            domain: "サンプルドメイン",
            prerequisites: [],
            dependencies: []
          },
          {
            id: "2", 
            name: "サンプル単元2",
            subject: subject,
            domain: "サンプルドメイン",
            prerequisites: ["サンプル単元1"],
            dependencies: []
          }
        ];
        setTopics(fallbackData);
        console.log('Using fallback data due to API error');
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      // ネットワークエラーの場合のフォールバックデータ
      const fallbackData: Topic[] = [
        {
          id: "1",
          name: "サンプル単元1",
          subject: subject,
          domain: "サンプルドメイン",
          prerequisites: [],
          dependencies: []
        },
        {
          id: "2",
          name: "サンプル単元2", 
          subject: subject,
          domain: "サンプルドメイン",
          prerequisites: ["サンプル単元1"],
          dependencies: []
        }
      ];
      setTopics(fallbackData);
      console.log('Using fallback data due to network error');
    } finally {
      setLoading(false);
    }
  }, [getApiBase]);

  // 科目が変更されたときにデータを再取得
  useEffect(() => {
    fetchTopics(selectedSubject);
    fetchDomains(selectedSubject);
    fetchPrerequisites(selectedSubject);
  }, [selectedSubject, fetchTopics, fetchDomains, fetchPrerequisites]);

  // 科目別のトピックをフィルタリング
  const filteredTopics = topics.filter(topic => 
    topic.subject === selectedSubject && 
    topic.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 新しいトピックを追加
  const handleAddTopic = () => {
    const newTopic: Topic = {
      id: `new-${Date.now()}`,
      name: "",
      subject: selectedSubject,
      domain: DOMAIN_OPTIONS[selectedSubject as keyof typeof DOMAIN_OPTIONS]?.[0] || "",
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
  const handleDeleteTopic = async (topicId: string) => {
    if (confirm("この単元を削除しますか？依存関係も削除されます。")) {
      try {
        // 実際のAPIでは削除エンドポイントを呼び出す
        const updatedTopics = topics.filter(t => t.id !== topicId);
        // 依存関係からも削除
        const cleanedTopics = updatedTopics.map(topic => ({
          ...topic,
          prerequisites: topic.prerequisites.filter(p => p !== topicId),
          dependencies: topic.dependencies.filter(d => d !== topicId)
        }));
        setTopics(cleanedTopics);
        
        // TODO: APIで削除処理を実装
        console.log('Delete topic:', topicId);
      } catch (error) {
        console.error('Error deleting topic:', error);
        alert('削除に失敗しました');
      }
    }
  };

  // ドメイン編集を開始
  const handleStartDomainEdit = (topicId: string) => {
    setEditingDomainId(topicId);
  };

  // ドメイン編集を保存
  const handleSaveDomainEdit = async (topicId: string, newDomain: string) => {
    try {
      // バックエンドAPIを呼び出してドメインを更新
      const response = await fetch(`${getApiBase()}/dependencies/${selectedSubject}/${topicId}/domain`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: newDomain })
      });

      if (response.ok) {
        // 成功した場合、ローカル状態を更新
        const updatedTopics = topics.map(topic => 
          topic.id === topicId 
            ? { ...topic, domain: newDomain }
            : topic
        );
        setTopics(updatedTopics);
        setEditingDomainId(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'ドメインの更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating domain:', error);
      alert('ドメインの更新に失敗しました: ' + (error as Error).message);
    }
  };

  // ドメイン編集をキャンセル
  const handleCancelDomainEdit = () => {
    setEditingDomainId(null);
  };

  const handleStartPrerequisitesEdit = (topicId: string) => {
    setEditingPrerequisitesId(topicId);
  };

  const handleSavePrerequisitesEdit = async (topicId: string, newPrerequisites: string[]) => {
    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/dependencies/${selectedSubject}/${topicId}/prerequisites`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prerequisites: newPrerequisites })
      });
      
      if (response.ok) {
        // ローカルの状態を更新
        setTopics(prev => prev.map(topic => 
          topic.id === topicId 
            ? { ...topic, prerequisites: newPrerequisites }
            : topic
        ));
        setEditingPrerequisitesId(null);
      } else {
        console.error('Failed to update prerequisites:', response.status, response.statusText);
        alert('前提条件の更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating prerequisites:', error);
      alert('前提条件の更新に失敗しました');
    }
  };

  const handleCancelPrerequisitesEdit = () => {
    setEditingPrerequisitesId(null);
  };

  // 編集を保存
  const handleSaveTopic = async () => {
    if (!editingTopic || !editingTopic.name.trim()) {
      alert("単元名を入力してください");
      return;
    }

    try {
      if (isAddingNew) {
        // 新しいトピックを追加
        const newTopic = {
          ...editingTopic,
          id: `new-${Date.now()}` // 一時的なID
        };
        setTopics([...topics, newTopic]);
        
        // TODO: APIで新規作成処理を実装
        console.log('Create new topic:', newTopic);
      } else {
        // 既存のトピックを更新
        setTopics(topics.map(t => t.id === editingTopic.id ? editingTopic : t));
        
        // TODO: APIで更新処理を実装
        console.log('Update topic:', editingTopic);
      }
      setEditingTopic(null);
      setIsAddingNew(false);
    } catch (error) {
      console.error('Error saving topic:', error);
      alert('保存に失敗しました');
    }
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

  // 変更を保存
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      // TODO: APIで一括保存処理を実装
      console.log("保存するデータ:", topics);
      
      // 実際のAPI呼び出しをここに実装
      // const response = await fetch(`${getApiBase()}/dependencies/${selectedSubject}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(topics)
      // });
      
      alert("データを保存しました");
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 前提条件表示・編集コンポーネント
  const PrerequisitesEditor = ({ topic }: { topic: Topic }) => {
    const [tempPrerequisites, setTempPrerequisites] = useState<string[]>(topic.prerequisites || []);

    if (editingPrerequisitesId === topic.id) {
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          handleSavePrerequisitesEdit(topic.id, tempPrerequisites);
        } else if (e.key === 'Escape') {
          setTempPrerequisites(topic.prerequisites || []);
          handleCancelPrerequisitesEdit();
        }
      };

      const handleAddPrerequisite = () => {
        setTempPrerequisites([...tempPrerequisites, '']);
      };

      const handleRemovePrerequisite = (index: number) => {
        setTempPrerequisites(tempPrerequisites.filter((_, i) => i !== index));
      };

      const handlePrerequisiteChange = (index: number, value: string) => {
        const newPrerequisites = [...tempPrerequisites];
        newPrerequisites[index] = value;
        setTempPrerequisites(newPrerequisites);
      };

      return (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">前提条件:</div>
          {tempPrerequisites.map((prereq, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                value={prereq}
                onChange={(e) => handlePrerequisiteChange(index, e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
              >
                <option value="">前提条件を選択...</option>
                {prerequisitesOptions[selectedSubject]?.map(option => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleRemovePrerequisite(index)}
                className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                title="削除"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddPrerequisite}
              className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
              title="前提条件を追加"
            >
              + 追加
            </button>
            <button
              onClick={() => handleSavePrerequisitesEdit(topic.id, tempPrerequisites)}
              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
              title="保存 (Enter)"
            >
              ✓ 保存
            </button>
            <button
              onClick={() => {
                setTempPrerequisites(topic.prerequisites || []);
                handleCancelPrerequisitesEdit();
              }}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
              title="キャンセル (Esc)"
            >
              ✕ キャンセル
            </button>
          </div>
        </div>
      );
    }

    return (
      <div 
        className="text-sm text-gray-500 cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors border border-transparent hover:border-blue-200"
        onClick={() => {
          setTempPrerequisites(topic.prerequisites || []);
          handleStartPrerequisitesEdit(topic.id);
        }}
        title="クリックして前提条件を編集"
      >
        {topic.prerequisites && topic.prerequisites.length > 0 
          ? topic.prerequisites.join(', ')
          : "前提条件なし"
        }
        <span className="ml-1 text-xs text-gray-400">✏️</span>
      </div>
    );
  };

  // ドメイン表示・編集コンポーネント
  const DomainEditor = ({ topic }: { topic: Topic }) => {
    const [tempDomain, setTempDomain] = useState(topic.domain || "");

    if (editingDomainId === topic.id) {
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          handleSaveDomainEdit(topic.id, tempDomain);
        } else if (e.key === 'Escape') {
          setTempDomain(topic.domain || "");
          handleCancelDomainEdit();
        }
      };

      return (
        <div className="flex items-center gap-2">
          <select
            value={tempDomain}
            onChange={(e) => setTempDomain(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
            autoFocus
          >
            <option value="">ドメインを選択...</option>
            {domainOptions[selectedSubject]?.map(domain => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleSaveDomainEdit(topic.id, tempDomain)}
            className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
            title="保存 (Enter)"
          >
            ✓
          </button>
          <button
            onClick={() => {
              setTempDomain(topic.domain || "");
              handleCancelDomainEdit();
            }}
            className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
            title="キャンセル (Esc)"
          >
            ✕
          </button>
        </div>
      );
    }

    return (
      <div 
        className="text-sm text-gray-500 cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors border border-transparent hover:border-blue-200"
        onClick={() => {
          setTempDomain(topic.domain || "");
          handleStartDomainEdit(topic.id);
        }}
        title="クリックしてドメインを編集"
      >
        {topic.domain || "ドメイン未設定"}
        <span className="ml-1 text-xs text-gray-400">✏️</span>
      </div>
    );
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
                    単元名 *
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
                    ドメイン
                  </label>
                  <select
                    value={editingTopic.domain || ""}
                    onChange={(e) => setEditingTopic({ ...editingTopic, domain: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">ドメインを選択...</option>
                    {DOMAIN_OPTIONS[selectedSubject as keyof typeof DOMAIN_OPTIONS]?.map(domain => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
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
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">データを読み込み中...</p>
              </div>
            ) : filteredTopics.length === 0 ? (
              <p className="text-gray-500 text-center py-8">単元が見つかりません</p>
            ) : (
              <div className="space-y-4">
                {filteredTopics.map(topic => (
                  <div key={topic.id} className="border border-gray-200 rounded-lg p-4">
                                          <div className="mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">{topic.name}</h3>
                          <DomainEditor topic={topic} />
                        </div>
                      </div>
                    
                    {/* 前提条件 */}
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">前提条件</h4>
                      <PrerequisitesEditor topic={topic} />
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
            onClick={handleSaveChanges}
            disabled={saving}
            className={`px-6 py-3 rounded-lg transition-colors font-medium ${
              saving 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {saving ? '保存中...' : '変更を保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
