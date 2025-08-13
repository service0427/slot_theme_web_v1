// Luxury 테마 전체 설정 - 밝고 깨끗한 럭셔리
export const luxuryTheme = {
  // 색상 팔레트
  colors: {
    primary: {
      main: 'from-amber-400 to-yellow-400',
      light: 'from-amber-300 to-yellow-300',
      dark: 'from-amber-500 to-yellow-500',
      text: 'text-amber-700',
      textDark: 'text-amber-800',
      border: 'border-amber-300/50',
      bg: 'bg-gradient-to-r from-amber-50 to-yellow-50'
    },
    background: {
      main: 'from-white via-amber-50/30 to-white',
      card: 'from-white to-amber-50/20',
      overlay: 'from-white/95 to-amber-50/40'
    },
    text: {
      primary: 'text-gray-800',
      secondary: 'text-gray-600',
      muted: 'text-gray-400'
    },
    accent: {
      gold: 'from-amber-400 via-yellow-400 to-amber-400',
      rosegold: 'from-rose-300 via-pink-300 to-rose-300'
    }
  },

  // 공통 컴포넌트 스타일
  components: {
    card: `
      relative
      bg-gradient-to-br from-slate-900/90 to-slate-800/90
      rounded-2xl shadow-2xl p-6
      border border-amber-500/20
      backdrop-blur-xl
      transition-all duration-500
      hover:shadow-[0_20px_60px_rgba(251,191,36,0.3)]
      hover:-translate-y-1
    `,
    button: {
      primary: `
        px-6 py-3
        bg-gradient-to-r from-amber-500 to-amber-600
        text-slate-900 font-bold
        rounded-xl
        transition-all duration-300
        hover:from-amber-400 hover:to-amber-500
        hover:shadow-[0_10px_30px_rgba(251,191,36,0.4)]
        active:scale-95
        border border-amber-400/30
      `,
      secondary: `
        px-6 py-3
        bg-gradient-to-r from-slate-800 to-slate-700
        text-amber-100 font-semibold
        rounded-xl
        transition-all duration-300
        hover:from-slate-700 hover:to-slate-600
        hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]
        border border-amber-500/10
      `,
      danger: `
        px-6 py-3
        bg-gradient-to-r from-red-600/80 to-red-700/80
        text-white font-bold
        rounded-xl
        transition-all duration-300
        hover:from-red-500 hover:to-red-600
        hover:shadow-[0_10px_30px_rgba(239,68,68,0.4)]
        border border-red-400/30
      `
    },
    input: `
      w-full
      bg-slate-800/50
      border border-amber-500/20
      rounded-lg
      px-4 py-2
      text-amber-100
      placeholder-amber-200/30
      focus:outline-none
      focus:border-amber-500/50
      focus:bg-slate-700/50
      focus:shadow-[0_0_20px_rgba(251,191,36,0.2)]
      transition-all duration-200
    `,
    badge: {
      success: 'px-3 py-1 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-full text-xs font-bold border border-green-400/50',
      warning: 'px-3 py-1 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-full text-xs font-bold border border-amber-400/50',
      danger: 'px-3 py-1 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full text-xs font-bold border border-red-400/50',
      info: 'px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full text-xs font-bold border border-blue-400/50'
    },
    heading: {
      h1: 'text-4xl font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 bg-clip-text text-transparent',
      h2: 'text-3xl font-bold text-amber-100',
      h3: 'text-2xl font-semibold text-amber-100',
      h4: 'text-xl font-semibold text-amber-200'
    }
  },

  // 애니메이션 효과
  effects: {
    glow: 'drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]',
    hoverGlow: 'hover:drop-shadow-[0_0_40px_rgba(251,191,36,0.7)]',
    cardHover: 'hover:shadow-[0_20px_60px_rgba(251,191,36,0.3)] hover:-translate-y-2',
    buttonHover: 'hover:shadow-[0_10px_30px_rgba(251,191,36,0.4)] hover:-translate-y-1'
  },

  // 레이아웃 스타일
  layout: {
    page: 'min-h-screen bg-gradient-to-br from-black via-slate-900 to-black',
    container: 'max-w-7xl mx-auto px-6 py-8',
    section: 'bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl p-6 border border-amber-500/20 backdrop-blur-xl'
  }
};

// 스타일 유틸리티 함수
export const getLuxuryStyle = (component: string, variant?: string) => {
  if (variant && luxuryTheme.components[component]?.[variant]) {
    return luxuryTheme.components[component][variant];
  }
  return luxuryTheme.components[component] || '';
};