<template>

  <div class="login-page">

    <div class="login-bg">

      <div class="login-orb login-orb-1" />

      <div class="login-orb login-orb-2" />

    </div>

    <div class="login-card">

      <div class="login-header">

        <div class="login-logo">锦</div>

        <h1 class="login-title">锦程会员电商系统</h1>

        <p class="login-subtitle">管理后台</p>

      </div>



      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleLogin">

        <el-form-item prop="username">

          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" size="large" />

        </el-form-item>

        <el-form-item prop="password">

          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" size="large" show-password />

        </el-form-item>

        <el-form-item>

          <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">

            登 录

          </el-button>

        </el-form-item>

      </el-form>



      <p class="login-footer">反重力人工智能工作室出品</p>

    </div>

  </div>

</template>



<script setup lang="ts">

import { ref, reactive } from 'vue'

import { useRouter } from 'vue-router'

import { useUserStore } from '@/store/user'

import { ElMessage } from 'element-plus'

import type { FormInstance } from 'element-plus'



const router = useRouter()

const userStore = useUserStore()

const formRef = ref<FormInstance>()

const loading = ref(false)



const form = reactive({ username: '', password: '' })

const rules = {

  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],

  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],

}



async function handleLogin() {

  await formRef.value?.validate()

  loading.value = true

  try {

    await userStore.login(form.username, form.password)

    ElMessage.success('登录成功')

    router.push('/')

  } catch (e: any) {

    ElMessage.error(e.message || '登录失败')

  } finally {

    loading.value = false

  }

}

</script>



<style scoped>

.login-page {

  min-height: 100vh;

  display: flex;

  align-items: center;

  justify-content: center;

  position: relative;

  overflow: hidden;

  background: linear-gradient(135deg, #1890ff 0%, #096dd9 50%, #0050b3 100%);

}



.login-bg {

  position: absolute;

  inset: 0;

  pointer-events: none;

}



.login-orb {

  position: absolute;

  border-radius: 50%;

  background: rgba(232, 67, 110, 0.08);

}



.login-orb-1 {

  width: 480px;

  height: 480px;

  top: -120px;

  right: -80px;

}



.login-orb-2 {

  width: 320px;

  height: 320px;

  bottom: -80px;

  left: -60px;

  background: rgba(123, 79, 212, 0.06);

}



.login-card {
  position: relative;
  z-index: 1;
  width: 400px;
  background: #fff;
  border-radius: 4px;
  padding: 40px 40px 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}



.login-header {

  text-align: center;

  margin-bottom: 36px;

}



.login-logo {

  width: 56px;

  height: 56px;

  margin: 0 auto 16px;

  background: linear-gradient(135deg, #409eff, #1890ff);

  border-radius: 14px;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 28px;

  font-weight: 800;

  color: #fff;

  letter-spacing: -1px;

}



.login-title {
  font-size: 22px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin: 0;
  letter-spacing: 1px;
}



.login-subtitle {

  font-size: 13px;

  color: #9CA3AF;

  margin: 10px 0 0;

}



.login-btn {

  width: 100%;

  height: 44px;

  font-size: 16px;

  font-weight: 600;

  letter-spacing: 4px;

  border-radius: 8px;

}



.login-footer {

  text-align: center;

  font-size: 12px;

  color: #D1D5DB;

  margin: 24px 0 0;

}

</style>

