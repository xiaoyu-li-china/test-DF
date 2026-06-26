<script setup>
import { ref } from 'vue'
import LoginForm from './components/LoginForm.vue'
import CustomInput from './components/CustomInput.vue'

const valueA = ref('')
const valueB = ref('')

const handleUpdate = (val) => {
  valueB.value = val
}
</script>

<template>
  <div class="demo-container">
    <div class="demo-card">
      <h2 class="demo-title">v-model 双向绑定演示</h2>
      <p class="demo-desc">下面展示两种等价的绑定方式</p>

      <div class="demo-section">
        <h3 class="section-title">① 使用 v-model 语法糖</h3>
        <div class="code-block">
          <code>&lt;CustomInput v-model="valueA" /&gt;</code>
        </div>
        <CustomInput v-model="valueA" placeholder="请输入内容..." />
        <p class="display-text">当前值: <span>{{ valueA || '(空)' }}</span></p>
      </div>

      <div class="demo-section">
        <h3 class="section-title">② 使用 :modelValue + @update:modelValue</h3>
        <div class="code-block">
          <code>&lt;CustomInput :modelValue="valueB" @update:modelValue="handleUpdate" /&gt;</code>
        </div>
        <CustomInput
          :modelValue="valueB"
          @update:modelValue="handleUpdate"
          placeholder="请输入内容..."
        />
        <p class="display-text">当前值: <span>{{ valueB || '(空)' }}</span></p>
      </div>

      <div class="comparison-table">
        <h3 class="section-title">两者的区别</h3>
        <table>
          <thead>
            <tr>
              <th>特性</th>
              <th>v-model</th>
              <th>:modelValue + @update:modelValue</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>代码量</td>
              <td>简洁，一行搞定</td>
              <td>繁琐，需要写两行</td>
            </tr>
            <tr>
              <td>灵活性</td>
              <td>默认行为</td>
              <td>可在 update 回调中加入额外逻辑</td>
            </tr>
            <tr>
              <td>本质</td>
              <td>语法糖，编译器会展开成右边的写法</td>
              <td>底层实际执行的代码</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <LoginForm />
  </div>
</template>

<style scoped>
.demo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 600px;
}

.demo-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
}

.demo-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 8px;
  text-align: center;
}

.demo-desc {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  margin-bottom: 24px;
}

.demo-section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.code-block {
  background: #1a1a2e;
  color: #a5b4fc;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 13px;
  overflow-x: auto;
}

.code-block code {
  white-space: nowrap;
}

.display-text {
  margin-top: 12px;
  font-size: 14px;
  color: #374151;
}

.display-text span {
  font-weight: 600;
  color: #667eea;
}

.comparison-table {
  margin-top: 16px;
}

.comparison-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.comparison-table th,
.comparison-table td {
  padding: 10px 12px;
  text-align: left;
  border: 1px solid #e5e7eb;
}

.comparison-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.comparison-table td {
  color: #4b5563;
}
</style>
