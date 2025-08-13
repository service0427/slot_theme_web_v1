// Modern 테마 채팅 스타일 설정
export const modernChatStyles = {
  // ChatRoomList 스타일
  roomList: {
    container: 'space-y-1 p-2',
    roomItem: `
      p-3 rounded-xl cursor-pointer transition-all duration-200
      bg-white hover:bg-gradient-to-r hover:from-violet-50 hover:to-indigo-50
      border border-transparent hover:border-violet-200
      hover:shadow-md
    `,
    roomItemActive: `
      bg-gradient-to-r from-violet-100 to-indigo-100
      border-violet-300
      shadow-md
    `,
    roomName: 'font-semibold text-slate-800',
    roomMessage: 'text-sm text-slate-600 truncate',
    roomTime: 'text-xs text-slate-400',
    unreadBadge: 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs rounded-full px-2 py-0.5 font-medium',
    emptyState: 'text-center py-8 text-slate-400'
  },

  // ChatWindow 스타일
  window: {
    container: 'flex flex-col h-full bg-gradient-to-b from-slate-50 to-white',
    header: `
      bg-white
      border-b border-slate-200
      px-4 py-3
      shadow-sm
    `,
    headerTitle: 'text-lg font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent',
    headerStatus: 'text-sm text-slate-500',
    messagesContainer: 'flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50/50 to-white',
    inputContainer: `
      border-t border-slate-200
      bg-white
      p-4
      shadow-sm
    `
  },

  // ChatMessage 스타일  
  message: {
    userMessage: `
      ml-auto max-w-[70%]
      bg-gradient-to-r from-violet-500 to-indigo-500
      text-white
      rounded-2xl rounded-tr-sm
      p-3
      shadow-md
    `,
    operatorMessage: `
      mr-auto max-w-[70%]
      bg-white
      border border-slate-200
      rounded-2xl rounded-tl-sm
      p-3
      text-slate-700
      shadow-sm
    `,
    systemMessage: `
      mx-auto max-w-[80%]
      bg-gradient-to-r from-slate-100 to-slate-50
      border border-slate-200
      rounded-lg
      p-2
      text-center text-sm
      text-slate-500
    `,
    senderName: 'text-xs font-medium mb-1 opacity-80',
    messageContent: 'text-sm leading-relaxed',
    timestamp: 'text-xs mt-1 opacity-60'
  },

  // ChatInput 스타일
  input: {
    container: 'flex gap-2',
    textInput: `
      flex-1
      bg-white
      border border-slate-300
      rounded-xl
      px-4 py-2
      text-slate-700
      placeholder-slate-400
      focus:outline-none
      focus:border-violet-400
      focus:ring-2 focus:ring-violet-100
      transition-all duration-200
    `,
    sendButton: `
      px-5 py-2
      bg-gradient-to-r from-violet-500 to-indigo-500
      text-white
      font-medium
      rounded-xl
      hover:from-violet-600 hover:to-indigo-600
      active:scale-95
      transition-all duration-200
      shadow-md
    `,
    sendButtonDisabled: `
      opacity-50 cursor-not-allowed
      bg-gradient-to-r from-slate-300 to-slate-400
    `
  }
};