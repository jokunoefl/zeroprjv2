import MockUI from './mock-ui';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      {/* 管理者画面へのリンク */}
      <div className="fixed top-4 right-4 z-50">
        <Link 
          href="/admin"
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium shadow-lg"
        >
          管理者画面
        </Link>
      </div>
      <MockUI />
    </main>
  );
}
