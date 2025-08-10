'use client';

import React, { useState, useRef } from 'react';

interface TestResult {
  id: number;
  subject: string;
  test_name: string;
  total_score: number;
  max_score: number;
  score_percentage: number;
  analysis_status: string;
  created_at: string;
  overall_analysis?: string;
  topics?: TopicDetail[];
}

interface TopicDetail {
  topic: string;
  correct_count: number;
  total_count: number;
  score_percentage: number;
  weakness_analysis?: string;
  improvement_advice?: string;
}

export default function TestUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [testName, setTestName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('ファイルを選択してください');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', '1');
    if (subject) formData.append('subject', subject);
    if (testName) formData.append('test_name', testName);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/upload-test-result`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult(result);
        alert('テスト結果のアップロードと分析が完了しました！');
        // 履歴を更新
        loadTestHistory();
      } else {
        let errorMessage = 'アップロードに失敗しました';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        alert(`アップロードエラー: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'ネットワークエラーが発生しました';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(`アップロードエラー: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const loadTestHistory = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/test-results/1`);
      if (response.ok) {
        const data = await response.json();
        setTestHistory(data.test_results);
      }
    } catch (error) {
      console.error('履歴の読み込みエラー:', error);
    }
  };

  const handleShowHistory = () => {
    if (!showHistory) {
      loadTestHistory();
    }
    setShowHistory(!showHistory);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">テスト結果分析</h1>
      
      {/* アップロードセクション */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">テスト結果をアップロード</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ファイル選択 (PDF, JPG, PNG)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.bmp,.tiff"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                選択されたファイル: {file.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                科目 (オプション)
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">自動判定</option>
                <option value="算数">算数</option>
                <option value="理科">理科</option>
                <option value="社会">社会</option>
                <option value="国語">国語</option>
                <option value="英語">英語</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                テスト名 (オプション)
              </label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="例: 中間テスト、期末テスト"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? '分析中...' : 'アップロードして分析'}
          </button>
        </div>
      </div>

      {/* 分析結果表示 */}
      {uploadResult && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">分析結果</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">科目</h3>
              <p className="text-2xl font-bold text-blue-600">{uploadResult.subject}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">得点</h3>
              <p className="text-2xl font-bold text-green-600">
                {uploadResult.total_score}/{uploadResult.max_score}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800">正答率</h3>
              <p className="text-2xl font-bold text-purple-600">
                {uploadResult.score_percentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {uploadResult.overall_analysis && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">全体分析</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap">{uploadResult.overall_analysis}</p>
              </div>
            </div>
          )}

          {uploadResult.topics && uploadResult.topics.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4">単元別分析</h3>
              <div className="space-y-4">
                {uploadResult.topics.map((topic, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">{topic.topic}</h4>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        topic.score_percentage >= 80 ? 'bg-green-100 text-green-800' :
                        topic.score_percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {topic.correct_count}/{topic.total_count} ({topic.score_percentage.toFixed(1)}%)
                      </span>
                    </div>
                    
                    {topic.weakness_analysis && (
                      <div className="mb-2">
                        <h5 className="text-sm font-medium text-gray-700">弱点分析</h5>
                        <p className="text-sm text-gray-600">{topic.weakness_analysis}</p>
                      </div>
                    )}
                    
                    {topic.improvement_advice && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700">改善アドバイス</h5>
                        <p className="text-sm text-gray-600">{topic.improvement_advice}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 履歴表示 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">テスト履歴</h2>
          <button
            onClick={handleShowHistory}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            {showHistory ? '履歴を隠す' : '履歴を表示'}
          </button>
        </div>

        {showHistory && (
          <div className="space-y-4">
            {testHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">まだテスト結果がありません</p>
            ) : (
              testHistory.map((test) => (
                <div key={test.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{test.test_name}</h3>
                      <p className="text-sm text-gray-600">{test.subject}</p>
                      <p className="text-sm text-gray-500">{formatDate(test.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {test.total_score}/{test.max_score}
                      </p>
                      <p className={`text-sm font-medium ${
                        test.score_percentage >= 80 ? 'text-green-600' :
                        test.score_percentage >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {test.score_percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
