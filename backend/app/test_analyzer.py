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
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "あなたは教育の専門家で、テスト結果を分析して弱点を特定し、具体的な改善アドバイスを提供します。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            analysis_text = response.choices[0].message.content
            
            # 分析結果を構造化
            return self._parse_ai_analysis(analysis_text, test_result)
            
        except Exception as e:
            print(f"AI分析エラー: {e}")
            return self._generate_dummy_analysis(test_result)
    
    def _create_analysis_prompt(self, test_result: Dict) -> str:
        """AI分析用のプロンプトを作成"""
        prompt = f"""
以下のテスト結果を分析して、弱点と改善アドバイスを提供してください。

科目: {test_result['subject']}
テスト名: {test_result['test_name']}
総合点: {test_result['total_score']}/{test_result['max_score']} ({test_result['score_percentage']:.1f}%)

単元別結果:
"""
        
        for topic in test_result['topics']:
            prompt += f"- {topic['topic']}: {topic['correct_count']}/{topic['total_count']} ({topic['score_percentage']:.1f}%)\n"
        
        prompt += """
以下の形式で回答してください：

弱点分析:
- 具体的な弱点の説明

改善アドバイス:
- 具体的な学習方法
- おすすめの練習問題
- 学習スケジュールの提案

優先度の高い単元:
- 最も改善が必要な単元とその理由
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
        analysis = {
            'overall_analysis': f"{test_result['subject']}のテスト結果を分析しました。",
            'topics': []
        }
        
        for topic in test_result['topics']:
            if topic['score_percentage'] < 60:
                weakness = f"{topic['topic']}の理解が不十分です。基礎から復習が必要です。"
                advice = f"{topic['topic']}の基本問題を繰り返し解き、理解を深めてください。"
            elif topic['score_percentage'] < 80:
                weakness = f"{topic['topic']}は基本的な理解はできていますが、応用問題に課題があります。"
                advice = f"{topic['topic']}の応用問題を多く解き、実践力を向上させてください。"
            else:
                weakness = f"{topic['topic']}は良好な成績です。"
                advice = f"{topic['topic']}の知識を維持し、さらに発展的な学習に取り組んでください。"
            
            topic['weakness_analysis'] = weakness
            topic['improvement_advice'] = advice
            analysis['topics'].append(topic)
        
        return analysis
