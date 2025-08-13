import { BaseAdminDashboardPage } from '@/components/base/BaseAdminDashboardPage';

export function AdminDashboardPage() {
  // Luxury 테마의 스타일 정의 - 밝고 깨끗한 럭셔리
  const luxuryStyles = {
    container: "p-8 bg-gradient-to-br from-white via-amber-50/20 to-white min-h-screen relative overflow-hidden",
    header: {
      title: "text-5xl font-bold mb-4 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 bg-clip-text text-transparent",
      description: "text-gray-600 text-xl tracking-wide"
    },
    grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8",
    card: {
      container: `
        relative
        bg-white
        rounded-2xl shadow-lg p-8
        hover:shadow-xl hover:shadow-amber-200/30
        transition-all duration-500 transform hover:-translate-y-2
        border border-amber-200/50
        overflow-hidden
      `,
      iconContainer: "p-4 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 shadow-md border border-amber-200",
      badge: "px-4 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full text-xs font-bold shadow-md",
      title: "text-xl font-bold mb-3 text-gray-800",
      description: "text-gray-600 text-sm leading-relaxed"
    },
    quickActions: {
      container: `
        mt-12
        bg-white
        rounded-2xl p-8
        border border-amber-200/50
        shadow-lg
      `,
      title: "text-2xl font-bold mb-6 text-gray-800",
      buttonsContainer: "flex flex-wrap gap-4",
      button: `
        px-6 py-3
        bg-gradient-to-r from-amber-400 to-yellow-400
        text-white font-bold
        rounded-xl
        transition-all duration-300
        hover:from-amber-500 hover:to-yellow-500
        hover:shadow-lg hover:shadow-amber-300/40
        hover:-translate-y-1
      `
    }
  };

  return <BaseAdminDashboardPage styles={luxuryStyles} />;
}