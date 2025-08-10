/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Brain, CalendarClock, CheckCircle2, Clock3, Database, FileText, Play, School, Settings, Sparkles, Trophy, XCircle, LogIn, User, Upload, Maximize2 } from "lucide-react";
import TestUpload from './test-upload';
import { WeaknessMapComponent, sampleWeaknessData } from './weakness-map';

function cn(...cls: (string | false | undefined)[]) { return cls.filter(Boolean).join(" "); }

export function Card({ className, children, ...props }: React.PropsWithChildren<{ className?: string } & React.HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("bg-card text-card-foreground border rounded-xl", className)} {...props}>{children}</div>;
}
export function CardHeader({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
export function CardTitle({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn("text-lg font-semibold", className)}>{children}</div>;
}
export function CardContent({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn("p-4 pt-0", className)}>{children}</div>;
}

export function Button({ className, children, variant = "default", size = "md", ...props }: any){
  const base = "inline-flex items-center justify-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const sizes: Record<string, string> = { sm: "h-8 px-3 text-sm", md: "h-9 px-4 text-sm", lg: "h-10 px-5" };
  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
    outline: "border bg-transparent hover:bg-muted"
  };
  return <button className={cn("rounded-md", base, sizes[size], variants[variant], className)} {...props}>{children}</button>;
}
export function Progress({ value, className }: { value: number; className?: string }){
  return (
    <div className={cn("w-full h-2 bg-muted rounded-full overflow-hidden", className)}>
      <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function Badge({ className, children, variant = "secondary" }: any){
  const variants: Record<string, string> = { secondary: "bg-secondary text-secondary-foreground" };
  return <span className={cn("inline-flex items-center px-2 h-6 text-xs rounded-md", variants[variant], className)}>{children}</span>;
}
export function Input(props: any){ return <input {...props} className={cn("h-9 px-3 border rounded-md w-full", props.className)} />; }
export function Label({ className, children }: any){ return <label className={cn("text-sm", className)}>{children}</label>; }

export function Table({ children }: any){ return <div className="overflow-x-auto"><table className="w-full text-sm">{children}</table></div>; }
export function TableHeader({ children }: any){ return <thead className="text-left text-xs text-muted-foreground">{children}</thead>; }
export function TableRow({ children }: any){ return <tr className="border-b last:border-0">{children}</tr>; }
export function TableHead({ children }: any){ return <th className="p-3 font-medium">{children}</th>; }
export function TableBody({ children }: any){ return <tbody>{children}</tbody>; }
export function TableCell({ children, className }: any){ return <td className={cn("p-3", className)}>{children}</td>; }

const TabsContext = React.createContext<{ value: string; onValueChange?: (v: string)=>void }>({ value: "" });
function Tabs({ value, onValueChange, children, className }: any){
  return <div className={className}><TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider></div>;
}
function TabsList({ children, className }: any){
  return <div className={cn("inline-flex gap-2 p-1 bg-muted rounded-xl", className)}>{children}</div>;
}
function TabsTrigger({ children, value, className }: any){
  const { value: activeValue, onValueChange } = React.useContext(TabsContext);
  const active = value === activeValue;
  return <button type="button" onClick={()=>onValueChange?.(value)} className={cn("h-8 px-3 rounded-lg text-sm", active ? "bg-card border" : "text-muted-foreground", className)}>{children}</button>;
}
function TabsContent({ children, value }: any){
  const { value: activeValue } = React.useContext(TabsContext);
  return value === activeValue ? <div>{children}</div> : null;
}

function Switch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean)=>void }){
  return (
    <button onClick={()=>onCheckedChange(!checked)} className={cn("w-10 h-6 rounded-full p-0.5", checked ? "bg-primary" : "bg-muted border")}> 
      <span className={cn("block w-5 h-5 bg-white rounded-full transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
    </button>
  );
}

function Dialog({ open, onOpenChange, children }: any){
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={()=>onOpenChange?.(false)} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
function DialogContent({ className, children }: any){ return <div className={cn("bg-card text-card-foreground border rounded-xl p-4 w-[90vw] max-w-xl", className)}>{children}</div>; }
function DialogHeader({ children }: any){ return <div className="mb-2">{children}</div>; }
function DialogTitle({ className, children }: any){ return <div className={cn("text-lg font-semibold", className)}>{children}</div>; }

const SelectContext = React.createContext<{ value: any; onValueChange?: (v:any)=>void; open: boolean; setOpen: (b:boolean)=>void }>({ value: undefined, onValueChange: undefined, open: false, setOpen: ()=>{} });
function Select({ value, onValueChange, children }: any){
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block" data-value={value}>
      <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
        {children}
      </SelectContext.Provider>
    </div>
  );
}
function roleLabel(v?: string){
  if(v === 'student') return '子ども';
  if(v === 'parent') return '保護者';
  return v || '';
}
function SelectTrigger({ className, children }: any){
  const { value, open, setOpen } = React.useContext(SelectContext);
  return (
    <button type="button" onClick={()=>setOpen(!open)} className={cn("border rounded-md h-8 px-3 inline-flex items-center justify-between gap-2 min-w-[110px] bg-card", className)}>
      <span className="text-sm">{roleLabel(value) || (children ?? '')}</span>
    </button>
  );
}
function SelectValue({ placeholder }: any){ const { value } = React.useContext(SelectContext); return <span>{roleLabel(value) || placeholder}</span>; }
function SelectContent({ children }: any){ const { open } = React.useContext(SelectContext); if(!open) return null; return <div className="absolute z-50 mt-2 bg-card border rounded-md shadow p-1 w-full">{children}</div>; }
function SelectItem({ value, children }: any){ const { onValueChange, setOpen } = React.useContext(SelectContext); return <div className="px-3 py-2 rounded hover:bg-muted cursor-pointer" onClick={()=>{ onValueChange?.(value); setOpen(false); }}>{children}</div>; }

const API_BASE = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_API_BASE) || "";
let AUTH_TOKEN: string | null = null;
export function setAuthToken(token: string | null){ AUTH_TOKEN = token; }
async function apiPost(path: string, body: any){
  if(!API_BASE){ return { ok: true, json: async () => ({ mock: true, ...body }) } as any; }
  return fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {}) }, body: JSON.stringify(body)});
}
async function apiGet(path: string){ if(!API_BASE){ return { ok: true } as any; } const res = await fetch(`${API_BASE}${path}`); return res.json(); }
async function gradeAnswer(questionId: number, userAnswer: string){ if(!API_BASE){ const numeric = userAnswer.replace(/[^0-9]/g, ""); return { is_correct: numeric === "1000", correct_answer: "1000" }; } const r = await apiPost(`/questions/${questionId}/answer`, { user_answer: userAnswer }); return r.json(); }
async function aiExplain(){ return { explanation: "利益率20%は1.2倍。1200÷1.2=1000。" }; }
async function generateVariant(){ return { question: { id: Math.floor(Math.random()*100000)+2000, subject: "算数", topic: "割合（類題）", text: "みかんを原価25%利益で…販売1250円。原価は？", hint: "販売=原価×1.25", correct: "1000", unit: "円" } }; }
async function submitPractice(){ return { ok: true }; }

const weakAreas = [
  { subject: "算数", topic: "割合と比", mastery: 42, due: "今日" },
  { subject: "国語", topic: "説明文の要旨", mastery: 55, due: "明日" },
  { subject: "理科", topic: "てこの規則", mastery: 48, due: "3日後" },
  { subject: "社会", topic: "地理（近畿地方）", mastery: 60, due: "7日後" }
];
const todaysList = [
  { id: 1, label: "計算ドリル（小数×分数）10問", est: "10分", done: false, subject: "算数", topic: "計算" },
  { id: 2, label: "割合の基本（基礎1〜3）", est: "15分", done: false, subject: "算数", topic: "割合" },
  { id: 3, label: "漢字10個・語彙カード", est: "8分", done: true, subject: "国語", topic: "語彙" },
  { id: 4, label: "社会 一問一答（近畿）20問", est: "12分", done: false, subject: "社会", topic: "地理" },
];
const recentActivities = [
  { when: "08/08 20:15", what: "算数：割合と比 基礎2", result: "7/10", time: "12分" },
  { when: "08/08 19:58", what: "国語：語彙10問", result: "10/10", time: "6分" },
  { when: "08/07 21:05", what: "理科：てこ 基礎", result: "6/10", time: "14分" },
];
const parentKpis = [
  { label: "今週の学習時間", value: "3時間40分", icon: Clock3 },
  { label: "今週の正答率", value: "68%", icon: CheckCircle2 },
  { label: "弱点解消数", value: "5件", icon: Trophy },
  { label: "次回確認テスト", value: "8/12", icon: CalendarClock }
];

function StatCard({ label, value, Icon }: { label: string; value: string; Icon: any }){
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-muted"><Icon className="w-6 h-6" /></div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PracticePanel({ open, onClose, subject, topic }: { open: boolean; onClose: () => void; subject?: string; topic?: string; }){
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ is_correct: boolean; correct_answer: string; ai_explain?: string } | null>(null);

  const initialQ = useMemo(() => ({
    id: 101,
    subject: subject || "算数",
    topic: topic || "割合",
    text: "ある品物を仕入れ値の20%の利益で売ると、販売価格は1,200円でした。仕入れ値はいくらですか？",
    hint: "販売価格 = 仕入れ値 × (1 + 利益率)",
    correct: "1000",
    unit: "円",
  }), [subject, topic]);
  const [q, setQ] = useState(initialQ);

  useEffect(() => {
    if(open){ setQ(initialQ); setAnswer(""); setSubmitted(false); setResult(null); setError(null); }
  }, [open, initialQ]);

  const handleSubmit = async () => {
    setError(null); setLoading(true);
    try{
      const graded = await gradeAnswer(q.id, answer);
      setResult(graded); setSubmitted(true);
      if(!(graded as any).ai_explain){ setExplaining(true); try{ const ex = await aiExplain(); setResult(prev => prev ? { ...prev, ai_explain: (ex as any).explanation } : prev);} finally{ setExplaining(false);} }
      await submitPractice();
    }catch(e: any){ setError(e?.message || '送信に失敗しました'); }
    finally{ setLoading(false); }
  };

  const handleGenerateVariant = async () => {
    setError(null); setExplaining(true);
    try{
      const resp = await generateVariant();
      const nq = (resp as any)?.question;
      if(nq){ setQ(nq); setAnswer(""); setSubmitted(false); setResult(null); }
    }catch(e:any){ setError(e?.message || '類題生成に失敗しました'); }
    finally{ setExplaining(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o: boolean)=>{ if(!o) onClose(); }}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Play className="w-5 h-5"/> 解く：{q.subject}／{q.topic}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}

          <Card className="rounded-2xl border">
            <CardHeader className="pb-2"><CardTitle className="text-base">問題</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6">{q.text}</p>
              <Button size="sm" variant="secondary" className="rounded-xl w-fit">ヒント：{q.hint}</Button>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-[1fr,auto] items-end">
            <div>
              <Label className="text-sm">あなたの答え（数値のみ）</Label>
              <Input value={answer} onChange={(e:any)=>setAnswer(e.target.value)} placeholder={`例）${q.correct}`} className="rounded-xl" />
            </div>
            <Button className="rounded-xl" disabled={loading} onClick={handleSubmit}>{loading? "採点中..." : "提出する"}</Button>
          </div>

          {submitted && result && (
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="rounded-2xl">
                <CardHeader className="pb-1"><CardTitle className="text/base">判定</CardTitle></CardHeader>
                <CardContent>
                  {result.is_correct ? (
                    <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="w-5 h-5"/> 正解！</div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600"><XCircle className="w-5 h-5"/> 不正解 正解は {result.correct_answer}{q.unit}</div>
                  )}
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader className="pb-1"><CardTitle className="text/base">AI解説（要点）</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line leading-6">{result.ai_explain || (explaining ? "解説を生成中..." : "解説はまだありません。提出すると生成します。")}</p>
                  <div className="mt-2 text-xs text-muted-foreground">※実API利用時はモデルの応答をそのまま表示します</div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="secondary" className="rounded-xl" onClick={onClose}>閉じる</Button>
            <div className="flex gap-2">
              <Button variant="secondary" className="rounded-xl" disabled={explaining} onClick={handleGenerateVariant}>類題をもう1問</Button>
              <Button className="rounded-xl">次の弱点へ進む</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TodayBlock({ onStart }: { onStart: (s?: string, t?: string)=>void }){
  const progress = Math.round((todaysList.filter(t => (t as any).done).length / todaysList.length) * 100);
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2"><Play className="w-5 h-5"/> 今日の学習リスト</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">進捗 {progress}%</div>
        </div>
        <ul className="space-y-2">
          {todaysList.map(item => (
            <li key={(item as any).id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
              <div className="flex items-center gap-3">
                <Switch checked={(item as any).done} onCheckedChange={() => {}} />
                <div>
                  <div className="text-sm font-medium">{(item as any).label}</div>
                  <div className="text-xs text-muted-foreground">目安 {(item as any).est}</div>
                </div>
              </div>
              <Button size="sm" variant="secondary" className="rounded-xl" onClick={()=>onStart((item as any).subject, (item as any).topic)}>開始</Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function WeakList({ onStart }: { onStart: (s?: string, t?: string)=>void }){
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5"/> 弱点Top4（優先復習）</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>科目</TableHead>
              <TableHead>単元</TableHead>
              <TableHead>定着度</TableHead>
              <TableHead>次の復習</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {weakAreas.map((w, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{w.subject}</TableCell>
                <TableCell>{w.topic}</TableCell>
                <TableCell className="w-48">
                  <div className="flex items-center gap-2">
                    <Progress value={w.mastery as number} className="h-2" />
                    <span className="text-xs text-muted-foreground w-10">{w.mastery}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="rounded-xl">{w.due}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" className="rounded-xl" onClick={()=>onStart(w.subject, w.topic)}>類題を解く</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RecentActivity(){
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5"/> 最近の学習</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日時</TableHead>
              <TableHead>内容</TableHead>
              <TableHead>結果</TableHead>
              <TableHead>時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentActivities.map((a, i) => (
              <TableRow key={i}>
                <TableCell>{a.when}</TableCell>
                <TableCell>{a.what}</TableCell>
                <TableCell>{a.result}</TableCell>
                <TableCell>{a.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TestUploadCard({ onNavigate }: { onNavigate: () => void }){
  return (
    <Card className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow" onClick={onNavigate}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600"/>
          テスト結果分析
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>PDF・画像ファイル対応</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Brain className="w-4 h-4 text-blue-500" />
            <span>AIによる弱点分析</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>改善アドバイス提供</span>
          </div>
          <Button className="w-full rounded-xl" variant="outline">
            テスト結果をアップロード
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ChildScreen({ onStart }: { onStart: (s?: string, t?: string)=>void }){
  const [showTestUpload, setShowTestUpload] = useState(false);
  const [showWeaknessMap, setShowWeaknessMap] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("math");

  const handleNodeClick = (node: any) => {
    console.log('Node clicked:', node);
  };

  const handleStartPractice = (nodeId: string, type: 'current' | 'prerequisite' | 'quick') => {
    const node = sampleWeaknessData.find(n => n.id === nodeId);
    if (node) {
      onStart('算数', node.name);
    }
  };

  if (showTestUpload) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setShowTestUpload(false)}
            className="rounded-xl"
          >
            ← 戻る
          </Button>
          <h1 className="text-2xl font-bold">テスト結果分析</h1>
        </div>
        <TestUpload />
      </div>
    );
  }

  if (showWeaknessMap) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">弱点依存マップ</h2>
              <p className="text-sm text-gray-600">学習項目の関連性と弱点を可視化</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedSubject} onValueChange={(v: string) => setSelectedSubject(v)}>
              <SelectTrigger className="w-32 rounded-xl">
                <SelectValue placeholder="科目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="math">算数</SelectItem>
                <SelectItem value="science">理科</SelectItem>
                <SelectItem value="social">社会</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => setShowWeaknessMap(false)}
              className="rounded-xl"
            >
              ← 戻る
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <WeaknessMapComponent 
            data={sampleWeaknessData}
            onNodeClick={handleNodeClick}
            onStartPractice={handleStartPractice}
            subject={selectedSubject}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-12">
      <div className="md:col-span-7 space-y-4">
        <TodayBlock onStart={onStart} />
        <WeakList onStart={onStart} />
      </div>
      <div className="md:col-span-5 space-y-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5"/> 今日のおすすめ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border p-3">
              <div className="text-sm font-medium">割合の基本・基礎2</div>
              <div className="text-xs text-muted-foreground">正答率58%／前回ミス：式の立て方</div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="rounded-xl" onClick={()=>onStart("算数","割合")}>すぐ解く</Button>
                <Button variant="secondary" size="sm" className="rounded-xl">ヒントを見る</Button>
              </div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-sm font-medium">語彙カード：同音異義語</div>
              <div className="text-xs text-muted-foreground">所要5分／電車でもOK</div>
              <div className="mt-2"><Button size="sm" variant="secondary" className="rounded-xl">カードを見る</Button></div>
            </div>
          </CardContent>
        </Card>
        
        {/* 依存マップカード */}
        <Card className="rounded-2xl cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-blue-100 hover:border-blue-300" onClick={() => setShowWeaknessMap(true)}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">弱点依存マップ</h3>
                <p className="text-sm text-gray-600">学習項目の関連性を可視化</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>弱点項目</span>
                <span className="text-gray-500">（要復習）</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span>前提知識</span>
                <span className="text-gray-500">（基礎固め）</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>習得済み</span>
                <span className="text-gray-500">（応用可能）</span>
              </div>
            </div>
            
            <Button 
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setShowWeaknessMap(true);
              }}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              マップを開く
            </Button>
          </CardContent>
        </Card>
        
        <TestUploadCard onNavigate={() => setShowTestUpload(true)} />
        <RecentActivity />
      </div>
    </div>
  );
}

function ParentScreen(){
  return (
    <div className="grid gap-4 md:grid-cols-12">
      <div className="md:col-span-12 grid md:grid-cols-4 gap-4">
        {parentKpis.map((k, i) => (
          <StatCard key={i} label={k.label} value={k.value} Icon={k.icon} />
        ))}
      </div>

      <div className="md:col-span-7 space-y-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5"/> 弱点Top5（推奨対策付き）</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>科目</TableHead>
                  <TableHead>単元</TableHead>
                  <TableHead>定着度</TableHead>
                  <TableHead>推奨学習</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weakAreas.map((w, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{w.subject}</TableCell>
                    <TableCell>{w.topic}</TableCell>
                    <TableCell className="w-48">
                      <Progress value={w.mastery as number} className="h-2" />
                      <div className="text-xs text-muted-foreground mt-1">{w.mastery}%</div>
                    </TableCell>
                    <TableCell className="text-sm">基礎5問×2回 → 類題</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="rounded-xl">今日のリストに追加</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <RecentActivity />
      </div>

      <div className="md:col-span-5 space-y-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2"><CalendarClock className="w-5 h-5"/> 週間スケジュール（自動生成）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
              {"月火水木金土日".split("").map((d, i) => (
                <div key={i} className="text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({length:7}).map((_, i) => (
                <div key={i} className="rounded-xl border p-2 min-h-[84px] text-xs space-y-1">
                  <Badge variant="secondary" className="rounded-xl">{i===0?"今日":""}</Badge>
                  <div>計算10分</div>
                  <div>割合 基礎</div>
                  <div className="text-muted-foreground">家庭</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5"/> 学習方針</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">基礎優先の割合</Label>
              <Input type="number" defaultValue={70} className="w-24" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">1セッション目安</Label>
              <Input type="number" defaultValue={15} className="w-24" />
            </div>
            <Button className="rounded-xl">保存</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AppMock(){
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceSubject, setPracticeSubject] = useState<string | undefined>();
  const [practiceTopic, setPracticeTopic] = useState<string | undefined>();

  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [role, setRole] = useState<"student"|"parent">("student");

  const startPractice = (s?: string, t?: string) => {
    setPracticeSubject(s); setPracticeTopic(t); setPracticeOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-5 md:p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-muted"><School className="w-5 h-5"/></div>
          <h1 className="text-2xl font-bold">基礎抜けゼロ化 — 学習モック</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="w-4 h-4"/> プロトタイプUI
          </div>
          {isLoggedIn ? (
            <div className="flex items-center gap-2 text-sm relative">
              <User className="w-4 h-4"/>
              <Select value={role} onValueChange={(v:any)=>setRole(v)}>
                <SelectTrigger className="w-[130px] rounded-xl h-8">
                  <SelectValue placeholder="ロール" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">子ども</SelectItem>
                  <SelectItem value="parent">保護者</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="secondary" className="rounded-xl" onClick={()=>{ setIsLoggedIn(false); setAuthToken(null); }}>ログアウト</Button>
            </div>
          ) : (
            <Button size="sm" className="rounded-xl" onClick={()=>{ setIsLoggedIn(true); setAuthToken('demo-jwt'); }}><LogIn className="w-4 h-4 mr-1"/> ログイン</Button>
          )}
        </div>
      </header>

      {isLoggedIn ? (
        <Tabs value={role === "parent" ? "parent" : "child"} onValueChange={(v: string)=>setRole(v as any)} className="w-full">
          <TabsList className="rounded-2xl">
            <TabsTrigger value="child" className="rounded-xl">子ども用</TabsTrigger>
            <TabsTrigger value="parent" className="rounded-xl">保護者用</TabsTrigger>
          </TabsList>
          <div className="mt-4"/>
          <TabsContent value="child"><ChildScreen onStart={startPractice} /></TabsContent>
          <TabsContent value="parent"><ParentScreen /></TabsContent>
        </Tabs>
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-10 text-center space-y-3">
            <div className="text-xl font-semibold">はじめるにはログインしてください。</div>
            <div className="text-sm text-muted-foreground">モックのため、任意のメールでOKです。</div>
            <Button className="rounded-xl" onClick={()=>{ setIsLoggedIn(true); setAuthToken('demo-jwt'); }}><LogIn className="w-4 h-4 mr-1"/> ログイン</Button>
          </CardContent>
        </Card>
      )}

      <PracticePanel open={practiceOpen} onClose={()=>setPracticeOpen(false)} subject={practiceSubject} topic={practiceTopic} />

      <footer className="mt-10 text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4"/> 本UIはモックです。データはダミーで、実装時はAPI連携＆リアルタイム更新に置き換えます。</div>
      </footer>
    </motion.div>
  );
}


