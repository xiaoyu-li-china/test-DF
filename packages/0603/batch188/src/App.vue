<template>
  <div class="min-h-screen transition-colors duration-300">
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            暗色模式演示
          </h1>
          <DarkModeToggle />
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          当前模式：{{ isDark ? '暗色模式 🌙' : '亮色模式 ☀️' }}
          <span v-if="followSystem" class="ml-2 text-sm font-normal text-blue-500 dark:text-blue-400">
            (跟随系统)
          </span>
        </h2>
        <p class="text-gray-600 dark:text-gray-300">
          开启"跟随系统"后，主题会自动响应系统设置变化。手动切换主题会自动关闭跟随系统。
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-300">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">卡片标题 1</h3>
          <p class="text-gray-600 dark:text-gray-300">
            这是一个示例卡片，展示暗色模式下的文本和背景颜色变化效果。
          </p>
          <button class="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors">
            了解更多
          </button>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-300">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">卡片标题 2</h3>
          <p class="text-gray-600 dark:text-gray-300">
            Tailwind CSS 的 dark: 前缀让暗色模式样式编写变得非常简单。
          </p>
          <button class="mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors">
            开始使用
          </button>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-300">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">卡片标题 3</h3>
          <p class="text-gray-600 dark:text-gray-300">
            使用 localStorage 持久化存储用户的主题偏好设置。
          </p>
          <button class="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors">
            查看文档
          </button>
        </div>
      </div>

      <div class="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-300">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">表单示例</h3>
        <form class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              用户名
            </label>
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入用户名"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              邮箱
            </label>
            <input
              type="email"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入邮箱"
            />
          </div>
          <button
            type="button"
            class="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            提交
          </button>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup>
import DarkModeToggle from './components/DarkModeToggle.vue'
import { useDarkMode } from './composables/useDarkMode'

const { isDark, followSystem } = useDarkMode()
</script>
