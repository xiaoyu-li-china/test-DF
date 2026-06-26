<template>
  <BoardView />
</template>

<script setup lang="ts">
import BoardView from './views/BoardView.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background: #0f1319;
}

#app {
  width: 100%;
  height: 100%;
}
</style>
