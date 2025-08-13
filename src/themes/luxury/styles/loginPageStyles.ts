import { LoginPageStyles } from '@/components/base/BaseLoginPage';

// Luxury 테마의 LoginPage 스타일 설정  
export const luxuryLoginPageStyles: LoginPageStyles = {
  container: "bg-white/95 backdrop-blur-md p-10 rounded-2xl shadow-2xl border border-gold-200/30 relative overflow-hidden",
  title: "text-4xl font-bold text-center mb-10 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 bg-clip-text text-transparent drop-shadow-sm",
  errorMessage: "mb-6 p-4 bg-red-50/80 border border-red-200/50 text-red-800 rounded-xl backdrop-blur-sm",
  form: "space-y-8 relative z-10",
  inputGroup: "space-y-3",
  label: "block text-sm font-bold text-gray-800 uppercase tracking-wider",
  input: "w-full px-5 py-4 border-2 border-gray-300/50 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-200/30 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium",
  button: "w-full py-4 px-8 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white font-bold rounded-xl hover:from-amber-700 hover:via-yellow-700 hover:to-amber-800 transform hover:scale-[1.02] transition-all duration-300 shadow-xl hover:shadow-2xl border border-amber-500/30",
  loadingButton: "w-full py-4 px-8 bg-gray-400/80 text-white font-bold rounded-xl cursor-not-allowed opacity-60 backdrop-blur-sm"
};