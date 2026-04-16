/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media', // 根据系统设置的暗色模式
  theme: {
    extend: {
      colors: {
        // 自定义颜色变量用于暗色系支持
        primary: {
          dark: '#003366',
          gold: '#D4AF37',
        },
      },
    },
  },
  plugins: [],
};
