<template>
  <div class="profile">
    <h1>个人中心</h1>
    <p>这是一个受保护的页面，只有登录用户才能访问。</p>
    <div class="user-info">
      <p><strong>用户名：</strong>{{ userStore.userInfo?.username }}</p>
      <p><strong>Token：</strong>{{ userStore.token }}</p>
    </div>
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
.profile {
  padding: 20px;
}
.user-info {
  margin: 20px 0;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
}
button {
  padding: 10px 20px;
  background: #f56c6c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
