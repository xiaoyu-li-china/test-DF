<template>
  <div class="home">
    <h1>首页</h1>
    <p>这是一个公开页面，无需登录即可访问。</p>
    <div class="nav-links">
      <router-link to="/dashboard">前往 Dashboard（需要登录）</router-link>
      <router-link to="/profile">前往 Profile（需要登录）</router-link>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.home {
  padding: 20px;
}
.nav-links {
  margin-top: 20px;
  display: flex;
  gap: 20px;
}
a {
  color: #42b983;
  text-decoration: none;
}
</style>
