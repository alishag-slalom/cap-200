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
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="glass-card pa-8" rounded="lg">
          <div class="text-center mb-6">
            <v-icon icon="mdi-truck-fast-outline" color="primary" size="48" class="mb-4" />
            <div class="text-h5 font-weight-bold">FastForward Logistics</div>
            <div class="text-body-2 text-medium-emphasis mt-1">Operations Dashboard</div>
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
              @update:model-value="error = false"
            />
            <v-btn
              type="submit"
              color="primary"
              block
              size="large"
              class="mt-4 font-weight-medium"
            >
              Sign In
            </v-btn>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
