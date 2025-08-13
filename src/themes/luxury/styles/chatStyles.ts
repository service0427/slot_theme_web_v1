// Luxury 테마 채팅 스타일 설정 - 밝고 깨끗한 럭셔리
export const luxuryChatStyles = {
  // ChatRoomList 스타일
  roomList: {
    container: 'space-y-2 p-3',
    roomItem: `
      p-4 rounded-xl cursor-pointer transition-all duration-300
      bg-white
      border border-amber-200/50
      hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50
      hover:border-amber-300
      hover:shadow-lg hover:shadow-amber-200/30
    `,
    roomItemActive: `
      bg-gradient-to-r from-amber-100 to-yellow-100
      border-amber-400
      shadow-lg shadow-amber-300/30
    `,
    roomName: 'font-bold text-gray-800 text-base',
    roomMessage: 'text-sm text-gray-600 truncate mt-1',
    roomTime: 'text-xs text-gray-400',
    unreadBadge: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-white text-xs rounded-full px-2.5 py-1 font-bold shadow-md',
    emptyState: 'text-center py-8 text-gray-400'
  },

  // ChatWindow 스타일
  window: {
    container: 'flex flex-col h-full bg-gradient-to-b from-white to-amber-50/10',
    header: `
      bg-white
      border-b border-amber-200
      px-5 py-4
      shadow-sm
    `,
    headerTitle: 'text-xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent',
    headerStatus: 'text-sm text-gray-500',
    messagesContainer: 'flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white to-amber-50/5',
    inputContainer: `
      border-t border-amber-200
      bg-white
      p-5
    `
  },

  // ChatMessage 스타일  
  message: {
    userMessage: `
      ml-auto max-w-[70%]
      bg-gradient-to-r from-amber-100 to-yellow-100
      border border-amber-300
      rounded-2xl rounded-tr-sm
      p-4
      text-gray-800
      shadow-md shadow-amber-200/30
    `,
    operatorMessage: `
      mr-auto max-w-[70%]
      bg-white
      border border-gray-200
      rounded-2xl rounded-tl-sm
      p-4
      text-gray-700
      shadow-sm
    `,
    systemMessage: `
      mx-auto max-w-[80%]
      bg-gradient-to-r from-gray-100 to-gray-50
      border border-gray-200
      rounded-xl
      p-3
      text-center text-sm
      text-gray-500
    `,
    senderName: 'text-xs font-bold mb-1.5 text-amber-600',
    messageContent: 'text-sm leading-relaxed',
    timestamp: 'text-xs mt-2 text-gray-400'
  },

  // ChatInput 스타일
  input: {
    container: 'flex gap-2',
    textInput: `
      flex-1
      bg-white
      border border-amber-300
      rounded-lg
      px-4 py-2
      text-gray-700
      placeholder-gray-400
      focus:outline-none
      focus:border-amber-400
      focus:ring-2 focus:ring-amber-100
      transition-all duration-200
    `,
    sendButton: `
      px-6 py-2
      bg-gradient-to-r from-amber-400 to-yellow-400
      text-white
      font-bold
      rounded-lg
      hover:from-amber-500 hover:to-yellow-500
      active:scale-95
      transition-all duration-200
      shadow-md shadow-amber-300/30
    `,
    sendButtonDisabled: `
      opacity-50 cursor-not-allowed
      bg-gradient-to-r from-gray-300 to-gray-400
    `
  }
};