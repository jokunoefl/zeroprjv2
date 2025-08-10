import os
import tempfile
import shutil
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import json
import re

# 条件付きインポート
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("Warning: PIL (Pillow) not available. Image processing will be disabled.")

try:
    import PyPDF2
    PDF2_AVAILABLE = True
except ImportError:
    PDF2_AVAILABLE = False
    print("Warning: PyPDF2 not available. PDF processing will be disabled.")

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("Warning: pytesseract not available. OCR will be disabled.")

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: openai not available. AI analysis will be disabled.")

class TestResultAnalyzer:
    def __init__(self, openai_api_key: Optional[str] = None):
        """テスト結果分析器の初期化"""
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """PDFからテキストを抽出"""
        if not PDF2_AVAILABLE:
            raise Exception("PDF処理が利用できません（PyPDF2がインストールされていません）")
        
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text
        except Exception as e:
            raise Exception(f"PDFテキスト抽出エラー: {str(e)}")
    
    def extract_text_from_image(self, file_path: str) -> str:
        """画像からテキストを抽出（OCR）"""
        if not PIL_AVAILABLE:
            raise Exception("画像処理が利用できません（Pillowがインストールされていません）")
        if not TESSERACT_AVAILABLE:
            raise Exception("OCRが利用できません（pytesseractがインストールされていません）")
        
        try:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image, lang='jpn+eng')
            return text
        except Exception as e:
            raise Exception(f"画像OCRエラー: {str(e)}")
    
    def extract_text_from_file(self, file_path: str) -> str:
        """ファイル形式に応じてテキストを抽出"""
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
            return self.extract_text_from_image(file_path)
        else:
            raise Exception(f"サポートされていないファイル形式: {file_ext}")
    
    def parse_test_result(self, text: str) -> Dict:
        """テキストからテスト結果を解析"""
        # 基本的なパターンマッチング
        result = {
            'subject': self._extract_subject(text),
            'test_name': self._extract_test_name(text),
            'total_score': self._extract_total_score(text),
            'max_score': self._extract_max_score(text),
            'topics': self._extract_topics(text)
        }
        
        # 正答率を計算
        if result['total_score'] and result['max_score']:
            result['score_percentage'] = (result['total_score'] / result['max_score']) * 100
        else:
            result['score_percentage'] = 0.0
        
        return result
    
    def _extract_subject(self, text: str) -> str:
        """科目を抽出"""
        subjects = ['算数', '数学', '理科', '社会', '国語', '英語']
        for subject in subjects:
            if subject in text:
                return subject
        return "不明"
    
    def _extract_test_name(self, text: str) -> str:
        """テスト名を抽出"""
        # テスト名のパターンを検索
        patterns = [
            r'テスト名[：:]\s*([^\n]+)',
            r'([^テスト]*テスト[^テスト]*)',
            r'([^試験]*試験[^試験]*)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        
        return "テスト結果"
    
    def _extract_total_score(self, text: str) -> Optional[int]:
        """総合点を抽出"""
        patterns = [
            r'総合点[：:]\s*(\d+)',
            r'合計点[：:]\s*(\d+)',
            r'得点[：:]\s*(\d+)',
            r'(\d+)\s*点'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return int(match.group(1))
        
        return None
    
    def _extract_max_score(self, text: str) -> Optional[int]:
        """満点を抽出"""
        patterns = [
            r'満点[：:]\s*(\d+)',
            r'配点[：:]\s*(\d+)',
            r'(\d+)\s*点満点'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return int(match.group(1))
        
        return 100  # デフォルト
    
    def _extract_topics(self, text: str) -> List[Dict]:
        """単元別結果を抽出"""
        topics = []
        
        # 単元名のパターン
        topic_patterns = [
            r'([^：:]*)[：:]\s*(\d+)\s*/\s*(\d+)',
            r'([^：:]*)[：:]\s*(\d+)点'
        ]
        
        for pattern in topic_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                topic_name = match[0].strip()
                if len(match) >= 3:
                    correct = int(match[1])
                    total = int(match[2])
                    percentage = (correct / total) * 100 if total > 0 else 0
                else:
                    correct = int(match[1])
                    total = 10  # デフォルト
                    percentage = (correct / total) * 100
                
                topics.append({
                    'topic': topic_name,
                    'correct_count': correct,
                    'total_count': total,
                    'score_percentage': percentage
                })
        
        return topics
    
    def analyze_weaknesses_with_ai(self, test_result: Dict) -> Dict:
        """AIを使用して弱点分析と改善アドバイスを生成"""
        if not OPENAI_AVAILABLE:
            print("OpenAIライブラリが利用できません。ダミー分析を実行します。")
            return self._generate_dummy_analysis(test_result)
        
        if not self.openai_api_key:
            return self._generate_dummy_analysis(test_result)
        
        try:
            # AI分析用のプロンプトを作成
            prompt = self._create_analysis_prompt(test_result)
            
            response = openai.ChatCompletion.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "あなたは教育心理学と学習科学に精通した教育コンサルタントです。テスト結果を詳細に分析し、個別化された学習戦略を提案します。具体的で実行可能なアドバイスを提供してください。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=3000,
                temperature=0.7
            )
            
            analysis_text = response.choices[0].message.content
            
            # 分析結果を構造化
            return self._parse_ai_analysis(analysis_text, test_result)
            
        except Exception as e:
            print(f"AI分析エラー: {e}")
            return self._generate_dummy_analysis(test_result)

    def analyze_pdf_directly_with_ai(self, pdf_file_path: str, user_id: int = 1) -> Dict:
        """PDFファイルを直接AIに送信して分析"""
        if not OPENAI_AVAILABLE:
            print("OpenAIライブラリが利用できません。ダミー分析を実行します。")
            return self._generate_dummy_analysis_from_pdf(pdf_file_path)
        
        if not self.openai_api_key:
            return self._generate_dummy_analysis_from_pdf(pdf_file_path)
        
        try:
            # PDFファイルを読み込み
            with open(pdf_file_path, 'rb') as pdf_file:
                pdf_content = pdf_file.read()
            
            # AI分析用のプロンプトを作成
            prompt = self._create_pdf_analysis_prompt()
            
            response = openai.ChatCompletion.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "あなたは教育心理学と学習科学に精通した教育コンサルタントです。PDFファイルのテスト結果を詳細に分析し、個別化された学習戦略を提案します。具体的で実行可能なアドバイスを提供してください。"},
                    {"role": "user", "content": prompt}
                ],
                files=[{"file": pdf_content, "filename": "test_result.pdf"}],
                max_tokens=4000,
                temperature=0.7
            )
            
            analysis_text = response.choices[0].message.content
            
            # 分析結果を構造化
            return self._parse_pdf_analysis(analysis_text, pdf_file_path)
            
        except Exception as e:
            print(f"PDF直接分析エラー: {e}")
            return self._generate_dummy_analysis_from_pdf(pdf_file_path)
    
    def _create_analysis_prompt(self, test_result: Dict) -> str:
        """AI分析用のプロンプトを作成"""
        prompt = f"""
あなたは教育心理学と学習科学に精通した教育コンサルタントです。以下のテスト結果を詳細に分析し、個別化された学習戦略を提案してください。

## テスト結果
科目: {test_result['subject']}
テスト名: {test_result['test_name']}
総合点: {test_result['total_score']}/{test_result['max_score']} ({test_result['score_percentage']:.1f}%)

## 単元別結果
"""
        
        for topic in test_result['topics']:
            prompt += f"- {topic['topic']}: {topic['correct_count']}/{topic['total_count']} ({topic['score_percentage']:.1f}%)\n"
        
        prompt += f"""

## 分析要求
以下の観点から詳細な分析を行い、具体的で実行可能な改善策を提案してください：

### 1. 総合的な成績評価
- 現在の学力レベル（基礎・標準・応用・発展）
- 全体的な強みと弱み
- 学習の進捗状況

### 2. 単元別詳細分析
各単元について以下を分析：
- 理解度の深さ（表面的理解 vs 深い理解）
- 間違いの傾向（計算ミス、概念理解不足、応用力不足など）
- 学習の優先順位

### 3. 学習戦略の提案
- 短期目標（1-2週間）
- 中期目標（1-2ヶ月）
- 長期目標（3-6ヶ月）
- 具体的な学習方法と教材
- 練習問題の種類と量

### 4. 学習スケジュール
- 1日の学習時間配分
- 週間学習計画
- 復習のタイミング

### 5. モチベーション維持
- 学習意欲を高める方法
- 挫折しそうな時の対処法
- 成功体験の作り方

### 6. 保護者・教師へのアドバイス
- 家庭でのサポート方法
- 効果的な声かけ
- 学習環境の整備

## 回答形式
以下の構造化された形式で回答してください：

### 総合分析
[全体的な成績評価と学習状況]

### 単元別分析
[各単元の詳細分析]

### 改善戦略
[具体的な学習方法とスケジュール]

### 優先学習項目
[最も重要な学習項目とその理由]

### 保護者・教師へのアドバイス
[家庭・学校でのサポート方法]

### 学習スケジュール例
[具体的な時間配分と計画]

各項目は具体的で実行可能な内容にしてください。
"""
        
        return prompt
    
    def _parse_ai_analysis(self, analysis_text: str, test_result: Dict) -> Dict:
        """AI分析結果を構造化"""
        # 分析結果を各単元に適用
        for topic in test_result['topics']:
            topic['weakness_analysis'] = f"AI分析: {analysis_text[:200]}..."
            topic['improvement_advice'] = f"改善アドバイス: この単元の基礎を復習し、類似問題を多く解くことをお勧めします。"
        
        return {
            'overall_analysis': analysis_text,
            'topics': test_result['topics']
        }
    
    def _generate_dummy_analysis(self, test_result: Dict) -> Dict:
        """AIが利用できない場合のダミー分析"""
        overall_score = test_result['score_percentage']
        
        # 総合分析
        if overall_score >= 90:
            overall_analysis = f"""
### 総合分析
{test_result['subject']}のテスト結果は優秀です（{overall_score:.1f}%）。基礎知識がしっかりと身についており、応用力も備わっています。

### 学習戦略
- 現在の知識を維持しながら、より高度な問題に挑戦
- 他の科目との関連性を意識した学習
- 定期テストや模擬試験での実践練習

### 保護者・教師へのアドバイス
- 子どもの努力を認め、自信を持たせる
- さらなる挑戦を促す環境作り
- 他の科目とのバランスを考慮した学習計画
"""
        elif overall_score >= 70:
            overall_analysis = f"""
### 総合分析
{test_result['subject']}のテスト結果は良好です（{overall_score:.1f}%）。基本的な理解はできていますが、応用力の向上が課題です。

### 学習戦略
- 弱点単元の基礎固め
- 応用問題の練習を増やす
- 定期的な復習で知識を定着

### 保護者・教師へのアドバイス
- 子どもの努力を認め、継続を促す
- 弱点克服のための具体的なサポート
- 学習習慣の定着を支援
"""
        else:
            overall_analysis = f"""
### 総合分析
{test_result['subject']}のテスト結果は改善の余地があります（{overall_score:.1f}%）。基礎から丁寧に復習し、理解を深める必要があります。

### 学習戦略
- 基礎知識の徹底的な復習
- 基本問題を繰り返し解く
- 理解できない部分は質問する習慣

### 保護者・教師へのアドバイス
- 焦らずに基礎から丁寧に学習
- 子どものペースに合わせた学習計画
- 小さな成功体験を積み重ねる
"""
        
        analysis = {
            'overall_analysis': overall_analysis,
            'topics': []
        }
        
        for topic in test_result['topics']:
            score = topic['score_percentage']
            
            if score < 60:
                weakness = f"{topic['topic']}の理解が不十分です。基礎概念の理解から始める必要があります。"
                advice = f"{topic['topic']}の基本問題を毎日10分ずつ解き、理解を深めてください。分からない部分は必ず質問しましょう。"
                priority = "高"
            elif score < 80:
                weakness = f"{topic['topic']}は基本的な理解はできていますが、応用問題に課題があります。"
                advice = f"{topic['topic']}の応用問題を週に3回、30分ずつ解いて実践力を向上させてください。"
                priority = "中"
            else:
                weakness = f"{topic['topic']}は良好な成績です。知識がしっかりと身についています。"
                advice = f"{topic['topic']}の知識を維持し、さらに発展的な学習に取り組んでください。他の単元との関連性も意識しましょう。"
                priority = "低"
            
            topic['weakness_analysis'] = weakness
            topic['improvement_advice'] = advice
            topic['priority'] = priority
            analysis['topics'].append(topic)
        
        return analysis

    def _create_pdf_analysis_prompt(self) -> str:
        """PDF直接分析用のプロンプトを作成"""
        return """
このPDFファイルはテスト結果です。以下の観点から詳細な分析を行い、具体的で実行可能な改善策を提案してください：

## 分析要求
以下の観点から詳細な分析を行い、具体的で実行可能な改善策を提案してください：

### 1. テスト結果の抽出
- 科目名
- テスト名
- 総合点と満点
- 単元別の得点状況
- 正答率

### 2. 総合的な成績評価
- 現在の学力レベル（基礎・標準・応用・発展）
- 全体的な強みと弱み
- 学習の進捗状況

### 3. 単元別詳細分析
各単元について以下を分析：
- 理解度の深さ（表面的理解 vs 深い理解）
- 間違いの傾向（計算ミス、概念理解不足、応用力不足など）
- 学習の優先順位

### 4. 学習戦略の提案
- 短期目標（1-2週間）
- 中期目標（1-2ヶ月）
- 長期目標（3-6ヶ月）
- 具体的な学習方法と教材
- 練習問題の種類と量

### 5. 学習スケジュール
- 1日の学習時間配分
- 週間学習計画
- 復習のタイミング

### 6. モチベーション維持
- 学習意欲を高める方法
- 挫折しそうな時の対処法
- 成功体験の作り方

### 7. 保護者・教師へのアドバイス
- 家庭でのサポート方法
- 効果的な声かけ
- 学習環境の整備

## 回答形式
以下の構造化された形式で回答してください：

### テスト結果概要
[科目、テスト名、総合点などの基本情報]

### 総合分析
[全体的な成績評価と学習状況]

### 単元別分析
[各単元の詳細分析]

### 改善戦略
[具体的な学習方法とスケジュール]

### 優先学習項目
[最も重要な学習項目とその理由]

### 保護者・教師へのアドバイス
[家庭・学校でのサポート方法]

### 学習スケジュール例
[具体的な時間配分と計画]

各項目は具体的で実行可能な内容にしてください。
"""

    def _parse_pdf_analysis(self, analysis_text: str, pdf_file_path: str) -> Dict:
        """PDF分析結果を構造化"""
        # 分析結果を構造化
        return {
            'overall_analysis': analysis_text,
            'source_file': pdf_file_path,
            'analysis_method': 'PDF直接分析',
            'topics': [
                {
                    'topic': 'PDF分析結果',
                    'correct_count': 0,
                    'total_count': 0,
                    'score_percentage': 0.0,
                    'weakness_analysis': analysis_text,
                    'improvement_advice': 'PDFファイルから直接分析された結果です。'
                }
            ]
        }

    def _generate_dummy_analysis_from_pdf(self, pdf_file_path: str) -> Dict:
        """PDFファイル用のダミー分析"""
        return {
            'overall_analysis': f"""
### 総合分析
PDFファイル（{pdf_file_path}）のテスト結果を分析しました。

### 学習戦略
- PDFファイルの内容を確認し、具体的な学習計画を立てる
- 弱点単元の重点的な復習
- 定期的な理解度チェック

### 保護者・教師へのアドバイス
- PDFファイルの内容を一緒に確認
- 子どもの理解度に合わせた学習支援
- 継続的な学習習慣の定着

### 学習スケジュール例
- 平日：30分の基礎問題練習
- 週末：弱点単元の重点学習
- 週1回：理解度チェックテスト
""",
            'source_file': pdf_file_path,
            'analysis_method': 'ダミー分析',
            'topics': [
                {
                    'topic': 'PDF分析',
                    'correct_count': 0,
                    'total_count': 0,
                    'score_percentage': 0.0,
                    'weakness_analysis': 'PDFファイルの内容を確認して分析を行います。',
                    'improvement_advice': 'PDFファイルの内容に基づいた具体的な学習計画を立ててください。'
                }
            ]
        }
