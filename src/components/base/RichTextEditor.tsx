import { useRef, useMemo, useCallback } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = '내용을 입력하세요...',
  height = '400px' 
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);

  // 이미지 업로드 핸들러
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
        const siteUrl = import.meta.env.VITE_SITE_URL || 'http://localhost:8001';
        const response = await fetch(`${apiUrl}/upload/image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          const quill = quillRef.current?.getEditor();
          const range = quill?.getSelection();
          
          if (range) {
            // 이미지 URL을 절대 경로로 변환
            const imageUrl = result.data.url.startsWith('http') 
              ? result.data.url 
              : `${siteUrl}${result.data.url}`;
            quill?.insertEmbed(range.index, 'image', imageUrl);
          }
        } else {
          alert('이미지 업로드에 실패했습니다.');
        }
      } catch (error) {
        console.error('Image upload error:', error);
        alert('이미지 업로드 중 오류가 발생했습니다.');
      }
    };
  };

  // Quill 모듈 설정
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), []);

  // Quill 포맷 설정
  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'align',
    'list', 'bullet', 'indent',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  return (
    <div className="rich-text-editor" style={{ 
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        style={{ height }}
      />
      <style>{`
        .rich-text-editor .ql-editor {
          max-height: ${height};
          overflow-y: auto;
        }
        .rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 10px 0;
        }
        .rich-text-editor .ql-container {
          font-size: 14px;
        }
        .rich-text-editor .ql-editor {
          min-height: 200px;
        }
      `}</style>
    </div>
  );
}