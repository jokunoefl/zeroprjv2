import os
import tempfile
import shutil
import base64
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
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False
    print("Warning: pdfplumber not available. Enhanced PDF processing will be disabled.")

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("Warning: pytesseract not available. OCR will be disabled.")

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: openai not available. AI analysis will be disabled.")

class TestResultAnalyzer:
    def __init__(self, openai_api_key: Optional[str] = None):
        """テスト結果分析器の初期化"""
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if self.openai_api_key:
            self.client = OpenAI(api_key=self.openai_api_key)
        else:
            self.client = None
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """PDFからテキストを抽出（日本語対応強化版）"""
        if not PDF2_AVAILABLE and not PDFPLUMBER_AVAILABLE:
            raise Exception("PDF処理が利用できません（PyPDF2またはpdfplumberがインストールされていません）")
        
        # まずpdfplumberで試行（日本語に強い）
        if PDFPLUMBER_AVAILABLE:
            try:
                print("pdfplumberを使用してPDFテキスト抽出を試行...")
                text = ""
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                
                if text.strip():
                    print(f"pdfplumberでテキスト抽出成功: {len(text)} 文字")
                    return text
                else:
                    print("pdfplumberでテキストが抽出できませんでした")
            except Exception as e:
                print(f"pdfplumberでの抽出エラー: {e}")
        
        # pdfplumberが失敗した場合はPyPDF2で試行
        if PDF2_AVAILABLE:
            try:
                print("PyPDF2を使用してPDFテキスト抽出を試行...")
                text = ""
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page in pdf_reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                
                if text.strip():
                    print(f"PyPDF2でテキスト抽出成功: {len(text)} 文字")
                    return text
                else:
                    print("PyPDF2でテキストが抽出できませんでした")
            except Exception as e:
                print(f"PyPDF2での抽出エラー: {e}")
        
        # 両方とも失敗した場合はOCRを試行
        print("テキスト抽出に失敗したため、OCR処理を試行します...")
        return self._extract_text_with_ocr(file_path)
    
    def _extract_text_with_ocr(self, file_path: str) -> str:
        """OCRを使用してPDFからテキストを抽出"""
        if not PIL_AVAILABLE or not TESSERACT_AVAILABLE:
            raise Exception("OCR処理が利用できません（Pillowまたはpytesseractがインストールされていません）")
        
        try:
            print("OCR処理開始...")
            # PDFを画像に変換してOCR処理
            from pdf2image import convert_from_path
            
            # PDFの各ページを画像に変換
            images = convert_from_path(file_path, dpi=300)
            
            text = ""
            for i, image in enumerate(images):
                print(f"ページ {i+1} のOCR処理中...")
                page_text = pytesseract.image_to_string(image, lang='jpn+eng')
                text += page_text + "\n"
            
            print(f"OCR処理完了: {len(text)} 文字")
            return text
            
        except ImportError:
            print("pdf2imageが利用できません。代替方法を試行します...")
            # pdf2imageが利用できない場合は、PyPDF2で画像として抽出を試行
            return self._extract_text_from_pdf_images(file_path)
        except Exception as e:
            print(f"OCR処理エラー: {e}")
            raise Exception(f"OCR処理エラー: {str(e)}")
    
    def _extract_text_from_pdf_images(self, file_path: str) -> str:
        """PyPDF2を使用してPDFから画像としてテキストを抽出"""
        try:
            print("PyPDF2で画像としてテキスト抽出を試行...")
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num, page in enumerate(pdf_reader.pages):
                    # 画像リソースを抽出
                    if '/XObject' in page['/Resources']:
                        xObject = page['/Resources']['/XObject'].get_object()
                        for obj in xObject:
                            if xObject[obj]['/Subtype'] == '/Image':
                                print(f"ページ {page_num+1} で画像を発見")
                    
                    # テキスト抽出を再試行
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            
            return text
        except Exception as e:
            print(f"画像抽出エラー: {e}")
            return "PDFファイルの内容を読み取れませんでした。"
    
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
    
    def _encode_pdf_to_base64(self, pdf_file_path: str) -> str:
        """PDFファイルをBase64エンコード"""
        try:
            with open(pdf_file_path, 'rb') as pdf_file:
                pdf_content = pdf_file.read()
                return base64.b64encode(pdf_content).decode('utf-8')
        except Exception as e:
            print(f"PDF Base64エンコードエラー: {e}")
            return ""
    
    def _clean_extracted_text(self, text: str) -> str:
        """抽出されたテキストをクリーンアップ"""
        if not text:
            return text
        
        # 文字化けした文字を除去
        cleaned_text = ""
        for char in text:
            # 制御文字を除去
            if ord(char) < 32 and char not in '\n\r\t':
                continue
            # 文字化けした文字を除去（0xFFFDは置換文字）
            if char == '\ufffd':
                continue
            cleaned_text += char
        
        # 連続する空白を単一の空白に置換
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text)
        
        # 行頭行末の空白を除去
        cleaned_text = re.sub(r'^\s+|\s+$', '', cleaned_text, flags=re.MULTILINE)
        
        # 空行を除去
        cleaned_text = re.sub(r'\n\s*\n', '\n', cleaned_text)
        
        return cleaned_text.strip()
    
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
        
        if not self.openai_api_key or not self.client:
            print("OpenAI APIキーが設定されていません。ダミー分析を実行します。")
            return self._generate_dummy_analysis(test_result)
        
        try:
            # AI分析用のプロンプトを作成
            prompt = self._create_analysis_prompt(test_result)
            
            response = self.client.chat.completions.create(
                model="gpt-5",
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
        
        if not self.openai_api_key or not self.client:
            print("OpenAI APIキーが設定されていません。ダミー分析を実行します。")
            return self._generate_dummy_analysis_from_pdf(pdf_file_path)
        
        try:
            # PDFファイルを直接アップロードして分析（テキスト抽出なし）
            try:
                print(f"PDFファイル直接アップロード開始: {pdf_file_path}")
                print(f"ファイル存在確認: {os.path.exists(pdf_file_path)}")
                print(f"ファイルサイズ確認: {os.path.getsize(pdf_file_path)} bytes")
                
                with open(pdf_file_path, 'rb') as pdf_file:
                    pdf_content = pdf_file.read()
                    print(f"PDFファイル読み込み完了: {len(pdf_content)} bytes")
                    print(f"PDFファイルの最初の100バイト: {pdf_content[:100]}")
                    
                    # PDFヘッダーの確認
                    if pdf_content.startswith(b'%PDF'):
                        print("有効なPDFファイルです")
                    else:
                        print("警告: PDFヘッダーが見つかりません")
                    
                    # Base64エンコード
                    base64_content = base64.b64encode(pdf_content).decode('utf-8')
                    print(f"Base64エンコード完了: {len(base64_content)} 文字")
                    
                    # ChatGPTへの送信
                    print("ChatGPTへの送信開始...")
                    response = self.client.chat.completions.create(
                        model="gpt-5",
                        messages=[
                            {
                                "role": "system", 
                                "content": "あなたは教育心理学と学習科学に精通した教育コンサルタントです。PDFファイルのテスト結果を詳細に分析し、個別化された学習戦略を提案します。具体的で実行可能なアドバイスを提供してください。"
                            },
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": self._create_pdf_analysis_prompt()
                                    },
                                    {
                                        "type": "file_url",
                                        "file_url": {
                                            "url": f"data:application/pdf;base64,{base64_content}"
                                        }
                                    }
                                ]
                            }
                        ],
                        max_tokens=4000,
                        temperature=0.7
                    )
                    print("ChatGPTからの応答受信完了")
                
                analysis_text = response.choices[0].message.content
                print(f"AI分析結果: {analysis_text[:200]}...")
                print(f"分析結果の長さ: {len(analysis_text)} 文字")
                
                # 分析結果を構造化
                result = self._parse_pdf_analysis(analysis_text, pdf_file_path, "")
                print(f"構造化された結果の分析手法: {result.get('analysis_method', 'unknown')}")
                print(f"構造化された結果のソースファイル: {result.get('source_file', 'unknown')}")
                return result
                
            except Exception as file_upload_error:
                print(f"PDFファイル直接アップロードエラー: {file_upload_error}")
                print("テキスト抽出ベースの分析にフォールバックします。")
                
                # フォールバック: テキスト抽出ベースの分析
                try:
                    print(f"PDFテキスト抽出開始: {pdf_file_path}")
                    text_content = self.extract_text_from_pdf(pdf_file_path)
                    text_content = self._clean_extracted_text(text_content)
                    print(f"PDFから抽出されたテキスト: {text_content[:200]}...")
                    
                    prompt = self._create_pdf_analysis_prompt_with_content(text_content)
                    
                    response = self.client.chat.completions.create(
                        model="gpt-5",
                        messages=[
                            {"role": "system", "content": "あなたは教育心理学と学習科学に精通した教育コンサルタントです。PDFファイルのテスト結果を詳細に分析し、個別化された学習戦略を提案します。具体的で実行可能なアドバイスを提供してください。"},
                            {"role": "user", "content": prompt}
                        ],
                        max_tokens=4000,
                        temperature=0.7
                    )
                    
                    analysis_text = response.choices[0].message.content
                    
                    # 分析結果を構造化
                    return self._parse_pdf_analysis(analysis_text, pdf_file_path, text_content)
                    
                except Exception as text_extract_error:
                    print(f"テキスト抽出エラー: {text_extract_error}")
                    return self._generate_dummy_analysis_from_pdf(pdf_file_path)
            
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

    def _create_pdf_analysis_prompt_with_content(self, text_content: str) -> str:
        """PDF内容を含む分析用のプロンプトを作成"""
        
        # 文字化けの検出
        garbled_chars = re.findall(r'[\ufffd\u0000-\u001f\u007f-\u009f]', text_content)
        text_quality_note = ""
        if garbled_chars:
            text_quality_note = f"""
**注意**: 抽出されたテキストに文字化けや制御文字が含まれています（{len(garbled_chars)}文字）。
可能な限り内容を推測して分析を行ってください。
"""
        
        return f"""
以下のPDFファイルから抽出されたテスト結果の内容を分析してください：

{text_quality_note}

## PDFファイルの内容
```
{text_content}
```

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

**重要**: 上記のPDF内容を具体的に参照して分析してください。内容が見えない場合は、その旨を明記してください。

各項目は具体的で実行可能な内容にしてください。
"""

    def _create_pdf_analysis_prompt(self) -> str:
        """PDF直接分析用のプロンプトを作成"""
        return """
以下のPDFファイルのテスト結果を詳細に分析してください。

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

**重要**: PDFファイルの内容を直接参照して分析してください。文字化けや読み取りにくい部分がある場合は、その旨を明記してください。

各項目は具体的で実行可能な内容にしてください。
"""

    def _parse_pdf_analysis(self, analysis_text: str, pdf_file_path: str, text_content: str = "") -> Dict:
        """PDF分析結果を構造化"""
        # 分析結果を構造化
        return {
            'overall_analysis': analysis_text,
            'source_file': pdf_file_path,
            'analysis_method': 'PDF直接分析' if not text_content else 'PDF内容分析',
            'extracted_content': text_content[:500] + "..." if len(text_content) > 500 else text_content,
            'topics': [
                {
                    'topic': 'PDF分析結果',
                    'correct_count': 0,
                    'total_count': 0,
                    'score_percentage': 0.0,
                    'weakness_analysis': analysis_text,
                    'improvement_advice': 'PDFファイルの直接分析により生成された改善提案'
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
            'extracted_content': 'PDFファイルの内容を読み取れませんでした。',
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
