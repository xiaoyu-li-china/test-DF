<script setup lang="ts">
const imageList = [
  { id: 1, url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop', title: '山脉风景' },
  { id: 2, url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop', title: '森林小径' },
  { id: 3, url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&h=600&fit=crop', title: '湖畔倒影' },
  { id: 4, url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&h=600&fit=crop', title: '瀑布景观' },
  { id: 5, url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop', title: '湖光山色' },
  { id: 6, url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop', title: '晨雾山谷' },
  { id: 7, url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop', title: '草原日落' },
  { id: 8, url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop', title: '阳光森林' },
  { id: 9, url: 'https://invalid-url-test-error.com/image.jpg', title: '加载失败示例' }
]

const customPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTBmMmZlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzAzYjZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPueZu+WcqOegbOWFqS4uLTwvdGV4dD48L3N2Zz4='

const customFallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmVmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2RjMjYyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0i5Zu+5bqm5aSr6LSt5pWw5paw5aSn5a2mPC90ZXh0Pjwvc3ZnPg=='

const invalidUrl = 'https://invalid-url-test-error.com/bad-image.jpg'
</script>

<template>
  <div class="container">
    <header>
      <h1>Vue 3 图片懒加载指令 v-lazy</h1>
      <p class="subtitle">基于 Intersection Observer 实现，滚动页面查看效果</p>
    </header>

    <section class="demo-section">
      <h2>基础用法</h2>
      <p class="desc"><code>v-lazy="imageUrl"</code> — 传入图片地址字符串，使用默认占位图和 fallback 图</p>
      <div class="image-grid">
        <div v-for="item in imageList.slice(0, 3)" :key="item.id" class="image-card">
          <img v-lazy="item.url" :alt="item.title" />
          <p>{{ item.title }}</p>
        </div>
      </div>
    </section>

    <section class="demo-section">
      <h2>自定义占位图和 Fallback 图</h2>
      <p class="desc">通过对象参数配置 <code>src</code>、<code>placeholder</code> 和 <code>fallback</code></p>
      <div class="image-grid">
        <div v-for="item in imageList.slice(3, 6)" :key="item.id" class="image-card">
          <img
            v-lazy="{
              src: item.url,
              placeholder: customPlaceholder,
              fallback: customFallback
            }"
            :alt="item.title"
          />
          <p>{{ item.title }}</p>
        </div>
        <div class="image-card">
          <img
            v-lazy="{
              src: invalidUrl,
              placeholder: customPlaceholder,
              fallback: customFallback
            }"
            alt="错误示例"
          />
          <p>加载失败示例（自定义 fallback）</p>
        </div>
      </div>
    </section>

    <section class="demo-section">
      <h2>自定义 Observer 配置</h2>
      <p class="desc">配置 <code>rootMargin</code> 和 <code>threshold</code> 控制加载时机</p>
      <div class="image-grid">
        <div v-for="item in imageList.slice(6, 8)" :key="item.id" class="image-card">
          <img
            v-lazy="{
              src: item.url,
              rootMargin: '200px',
              threshold: 0.2
            }"
            :alt="item.title"
          />
          <p>{{ item.title }}</p>
        </div>
      </div>
    </section>

    <section class="demo-section">
      <h2>预加载功能（Preload）</h2>
      <p class="desc"><code>v-lazy:preload="imageUrl"</code> 或 <code>v-lazy="{ src, preload: 150 }"</code> — 提前加载</p>
      <div class="image-grid">
        <div class="image-card">
          <img
            v-lazy:preload="'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=600&fit=crop'"
            alt="预加载示例"
          />
          <p>参数方式：v-lazy:preload（默认 100px）</p>
        </div>
        <div class="image-card">
          <img
            v-lazy="{
              src: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800&h=600&fit=crop',
              preload: 200
            }"
            alt="自定义预加载距离"
          />
          <p>对象方式：preload: 200px</p>
        </div>
      </div>
    </section>

    <section class="demo-section">
      <h2>加载中文字提示</h2>
      <p class="desc"><code>loadingText</code> — 自定义占位图显示加载文字</p>
      <div class="image-grid">
        <div class="image-card">
          <img
            v-lazy="{
              src: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop',
              loadingText: '图片加载中...'
            }"
            alt="加载中文字示例"
          />
          <p>loadingText: "图片加载中..."</p>
        </div>
        <div class="image-card">
          <img
            v-lazy:preload="{
              src: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&h=600&fit=crop',
              loadingText: 'Loading...',
              preload: 150
            }"
            alt="预加载+文字"
          />
          <p>preload + loadingText 组合</p>
        </div>
      </div>
    </section>

    <footer>
      <p>打开浏览器开发者工具 → Network 面板，观察图片请求时机</p>
    </footer>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

header {
  text-align: center;
  margin-bottom: 60px;
}

h1 {
  font-size: 2.5rem;
  color: #1a202c;
  margin-bottom: 12px;
}

.subtitle {
  font-size: 1.1rem;
  color: #718096;
}

.demo-section {
  margin-bottom: 80px;
}

.demo-section h2 {
  font-size: 1.5rem;
  color: #2d3748;
  margin-bottom: 8px;
}

.desc {
  color: #718096;
  margin-bottom: 24px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.9rem;
}

.desc code {
  background: #f7fafc;
  padding: 2px 6px;
  border-radius: 4px;
  color: #e53e3e;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.image-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.image-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
}

.image-card img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
  transition: opacity 0.5s ease;
}

.image-card p {
  padding: 16px;
  margin: 0;
  text-align: center;
  color: #4a5568;
  font-weight: 500;
}

footer {
  text-align: center;
  padding: 40px 0;
  color: #a0aec0;
  font-size: 0.9rem;
}
</style>
