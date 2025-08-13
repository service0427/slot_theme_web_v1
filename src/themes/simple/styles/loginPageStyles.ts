import { LoginPageStyles } from '@/components/base/BaseLoginPage';

// Simple 테마의 LoginPage 스타일 설정 - 깔끔하고 현대적인 디자인
export const simpleLoginPageStyles: LoginPageStyles = {
  container: "min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4",
  title: "text-3xl font-bold text-center mb-8 text-gray-800",
  errorMessage: "mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl shadow-sm",
  form: "bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/60 space-y-6 w-full max-w-md",
  inputGroup: "space-y-2",
  label: "block text-sm font-semibold text-gray-700",
  input: "w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/90 placeholder-gray-400",
  button: "w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]",
  loadingButton: "w-full py-3 px-4 bg-gray-400 text-white font-semibold rounded-xl cursor-not-allowed opacity-75"
};