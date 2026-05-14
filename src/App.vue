<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useTheme } from 'vuetify'
import { ref, computed } from 'vue'
import metricsData from '@/data/metrics.json'

const theme = useTheme()
const isDark = computed(() => theme.global.name.value === 'dark')

function toggleTheme() {
  theme.global.name.value = isDark.value ? 'light' : 'dark'
}

const monthOptions = [
  { title: 'All Months', value: 'all' },
  ...metricsData.months.map((m) => ({ title: m.label, value: m.month })),
]

const selectedMonth = ref('all')
</script>

<template>
  <v-app>
    <v-app-bar elevation="0" class="glass-card px-4 px-md-6" style="border-bottom: 1px solid rgba(255,255,255,0.06)">
      <v-app-bar-title>
        <div class="d-flex align-center ga-2">
          <v-icon icon="mdi-truck-fast-outline" color="primary" />
          <span class="font-weight-bold">FastForward Logistics</span>
        </div>
      </v-app-bar-title>

      <template v-slot:append>
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
      </template>
    </v-app-bar>

    <v-main>
      <RouterView :selected-month="selectedMonth" />
    </v-main>
  </v-app>
</template>

<style scoped>
</style>
