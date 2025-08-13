import React, { useState, useRef, useEffect } from 'react';

interface ChatInputThemeProps {
  containerClass?: string;
  formClass?: string;
  textareaClass?: string;
  buttonClass?: string;
  disabledButtonClass?: string;
  charCountClass?: string;
  helpTextClass?: string;
}

interface BaseChatInputProps {
  onSendMessage: (content: string) => Promise<boolean>;
  disabled?: boolean;
  placeholder?: string;
  theme?: ChatInputThemeProps;
}

export const BaseChatInput: React.FC<BaseChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = '메시지를 입력하세요...',
  theme = {}
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 기본 스타일
  const defaultTheme: ChatInputThemeProps = {
    containerClass: 'border-t bg-white p-4',
    formClass: 'flex items-end gap-2',
    textareaClass: 'w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed',
    buttonClass: 'px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors min-w-[60px] flex items-center justify-center',
    disabledButtonClass: 'disabled:bg-gray-300 disabled:cursor-not-allowed',
    charCountClass: 'absolute bottom-1 right-2 text-xs text-gray-400',
    helpTextClass: 'text-xs text-gray-500 mt-1'
  };

  // 테마 병합
  const mergedTheme = { ...defaultTheme, ...theme };

  // 텍스트 영역 높이 자동 조절
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending || disabled) {
      return;
    }

    setIsSending(true);
    
    try {
      const success = await onSendMessage(trimmedMessage);
      if (success) {
        setMessage('');
        // 포커스 다시 설정
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 0);
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  return (
    <div className={mergedTheme.containerClass}>
      <form onSubmit={handleSubmit} className={mergedTheme.formClass}>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSending}
            placeholder={placeholder}
            rows={1}
            className={mergedTheme.textareaClass}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          
          {/* 문자 수 표시 (선택사항) */}
          {message.length > 0 && (
            <div className={mergedTheme.charCountClass}>
              {message.length}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!message.trim() || isSending || disabled}
          className={`${mergedTheme.buttonClass} ${mergedTheme.disabledButtonClass}`}
          style={{ height: '40px' }}
        >
          {isSending ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="opacity-25"
              />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                className="opacity-75"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </form>
      
      <div className={mergedTheme.helpTextClass}>
        Shift + Enter로 줄바꿈, Enter로 전송
      </div>
    </div>
  );
};