<script setup lang="ts">
defineProps<{
  label: string
  value: string
  trend: { icon: string; color: string; text: string } | null
  fallbackText: string
}>()
</script>

<template>
  <v-card class="glass-card kpi-gradient pa-4 text-center" rounded="lg" flat>
    <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">{{ label }}</div>
    <div class="text-h4 font-weight-bold tabular-nums">{{ value }}</div>
    <div
      class="text-caption mt-1 d-flex align-center justify-center ga-1"
      :class="trend ? trend.color : 'text-medium-emphasis'"
    >
      <v-icon v-if="trend" :icon="trend.icon" size="14" />
      <span>{{ trend ? trend.text : fallbackText }}</span>
    </div>
  </v-card>
</template>
