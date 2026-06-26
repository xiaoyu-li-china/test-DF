<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p>这是一个受保护的页面，只有登录用户才能访问。</p>
    <p>当前登录用户：{{ userStore.userInfo?.username }}</p>
    <p>Token：{{ userStore.token }}</p>
    <button @click="handleLogout">退出登录</button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'

const router = useRouter()
const userStore = useUserStore()

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.dashboard {
  padding: 20px;
}
button {
  margin-top: 20px;
  padding: 10px 20px;
  background: #f56c6c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
