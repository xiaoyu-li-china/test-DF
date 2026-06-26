<template>
  <div class="forbidden">
    <div class="code">403</div>
    <h1>无访问权限</h1>
    <p>抱歉，您没有权限访问该页面。</p>
    <p>所需角色：{{ requiredRoles?.join('、') }}</p>
    <p>您的角色：{{ userRoles?.join('、') || '无' }}</p>
    <div class="actions">
      <router-link to="/">返回首页</router-link>
      <button @click="handleLogout">退出登录</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../store/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const requiredRoles = computed(() => route.query.roles?.split(',') || [])
const userRoles = computed(() => userStore.roles)

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.forbidden {
  padding: 60px 20px;
  text-align: center;
}
.code {
  font-size: 120px;
  font-weight: bold;
  color: #f56c6c;
  line-height: 1;
  margin-bottom: 20px;
}
h1 {
  font-size: 32px;
  margin-bottom: 10px;
  color: #333;
}
p {
  color: #666;
  margin: 10px 0;
}
.actions {
  margin-top: 30px;
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: center;
}
a {
  color: #42b983;
  text-decoration: none;
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
