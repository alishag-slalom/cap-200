<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ authenticated: [] }>()

const password = ref('')
const error = ref(false)
const PASSWORD_HASH = 'ac3d3322' // simple hash of "Capstone200!"

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return (hash >>> 0).toString(16)
}

function submit() {
  if (simpleHash(password.value) === PASSWORD_HASH) {
    sessionStorage.setItem('ops-auth', '1')
    emit('authenticated')
  } else {
    error.value = true
    password.value = ''
  }
}
</script>

<template>
  <v-container class="d-flex align-center justify-center" fluid style="min-height: 100vh">
    <v-card class="glass-card pa-12" rounded="lg" style="width: 100%; max-width: 420px">
      <div class="text-center" style="margin-bottom: 48px">
        <v-icon icon="mdi-truck-fast-outline" color="primary" size="48" style="margin-bottom: 20px" />
        <div class="text-h5 font-weight-bold">FastForward Logistics</div>
        <div class="text-body-2 text-medium-emphasis" style="margin-top: 8px">Operations Dashboard</div>
      </div>

      <v-form @submit.prevent="submit">
        <v-text-field
          v-model="password"
          label="Password"
          type="password"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          :error="error"
          :error-messages="error ? 'Incorrect password' : ''"
          autofocus
          class="login-password"
          @update:model-value="error = false"
        />
        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          class="font-weight-medium"
          style="margin-top: 32px"
        >
          Sign In
        </v-btn>
      </v-form>
    </v-card>
  </v-container>
</template>

<style>
.login-password .v-field__input {
  padding: 12px 16px;
}
</style>
