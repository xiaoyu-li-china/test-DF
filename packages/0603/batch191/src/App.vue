<template>
  <div class="app">
    <nav class="nav">
      <router-link to="/">首页</router-link>
      <router-link v-if="!userStore.isLoggedIn" to="/login">登录</router-link>
      <template v-else>
        <router-link to="/dashboard">Dashboard</router-link>
        <router-link to="/profile">个人中心</router-link>
        <span class="user-info">欢迎，{{ userStore.userInfo?.username }} ({{ userStore.roles.join(', ') }})</span>
      </template>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
import { useUserStore } from './store/user'

const userStore = useUserStore()
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.nav {
  background: #333;
  padding: 15px 20px;
  display: flex;
  gap: 20px;
  align-items: center;
}
.nav a {
  color: white;
  text-decoration: none;
}
.nav a.router-link-active {
  color: #42b983;
}
.user-info {
  margin-left: auto;
  color: #42b983;
}
</style>
