<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useTheme } from 'vuetify'
import { ref, computed } from 'vue'
import metricsData from '@/data/metrics.json'
import LoginGate from '@/components/LoginGate.vue'

const theme = useTheme()
const isDark = computed(() => theme.global.name.value === 'dark')
const isAuthenticated = ref(sessionStorage.getItem('ops-auth') === '1')

function toggleTheme() {
  theme.global.name.value = isDark.value ? 'light' : 'dark'
}

function logout() {
  sessionStorage.removeItem('ops-auth')
  isAuthenticated.value = false
}

const CURRENT_YEAR = '2025'

const monthOptions = [
  { title: 'All Months', value: 'all' },
  ...metricsData.months
    .filter((m) => m.month.startsWith(CURRENT_YEAR))
    .map((m) => ({ title: m.label, value: m.month })),
]

const selectedMonth = ref('all')
const compareYoY = ref(false)
</script>

<template>
  <v-app>
    <template v-if="!isAuthenticated">
      <LoginGate @authenticated="isAuthenticated = true" />
    </template>

    <template v-else>
    <v-app-bar elevation="0" class="glass-card px-4 px-md-6" style="border-bottom: 1px solid rgba(255,255,255,0.06)">
      <v-app-bar-title>
        <div class="d-flex align-center ga-2">
          <v-icon icon="mdi-truck-fast-outline" color="primary" />
          <span class="font-weight-bold">FastForward Logistics</span>
          <span class="text-caption text-medium-emphasis d-none d-sm-inline">— Operations Dashboard</span>
        </div>
      </v-app-bar-title>

      <template v-slot:append>
        <v-checkbox
          v-model="compareYoY"
          label="Compare to last year"
          density="compact"
          hide-details
          class="mr-2 flex-grow-0 d-none d-md-flex"
        />
        <v-select
          v-model="selectedMonth"
          :items="monthOptions"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 180px"
          class="mr-4"
        />
        <v-btn
          :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="text"
          @click="toggleTheme"
          size="small"
        />
        <v-btn
          icon="mdi-logout"
          variant="text"
          @click="logout"
          size="small"
          class="ml-2"
        />
      </template>
    </v-app-bar>

    <v-main>
      <RouterView :selected-month="selectedMonth" :compare-yo-y="compareYoY" />
    </v-main>
    </template>
  </v-app>
</template>

<style scoped>
</style>
