import { LoginPageStyles } from '@/components/base/BaseLoginPage';

// Modern 테마의 LoginPage 스타일 설정
export const modernLoginPageStyles: LoginPageStyles = {
  container: "bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-white/20",
  title: "text-3xl font-bold text-center mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent",
  errorMessage: "mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg",
  form: "space-y-6",
  inputGroup: "space-y-2",
  label: "block text-sm font-semibold text-gray-700",
  input: "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200",
  button: "w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg",
  loadingButton: "w-full py-3 px-6 bg-gray-400 text-white font-semibold rounded-lg cursor-not-allowed opacity-70"
};