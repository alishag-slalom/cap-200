<script setup lang="ts">
defineProps<{
  label: string
  value: string
  description: string
}>()
</script>

<template>
  <v-card class="glass-card kpi-gradient pa-4 text-center" rounded="lg" flat>
    <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">{{ label }}</div>
    <div class="text-h4 font-weight-bold tabular-nums">{{ value }}</div>
    <div class="text-caption mt-1 text-medium-emphasis">{{ description }}</div>
  </v-card>
</template>
