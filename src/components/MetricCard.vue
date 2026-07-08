<script setup lang="ts">
defineProps<{
  label: string
  value: string
  trend: { icon: string; color: string; text: string; note?: string | null } | null
  fallbackText: string
  projected?: { value: string; tooltip: string } | null
  yoyText?: string | null
}>()
</script>

<template>
  <v-card class="glass-card kpi-gradient pa-4 text-center" rounded="lg" flat>
    <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">{{ label }}</div>
    <div class="text-h4 font-weight-bold tabular-nums">{{ value }}</div>

    <div class="d-flex align-center justify-center ga-1 mt-1">
      <div
        class="text-caption d-flex align-center justify-center ga-1"
        :class="trend ? trend.color : 'text-medium-emphasis'"
      >
        <v-icon v-if="trend" :icon="trend.icon" size="14" />
        <span>{{ trend ? trend.text : fallbackText }}</span>
      </div>
      <v-tooltip v-if="trend?.note" location="top" max-width="240">
        <template v-slot:activator="{ props: tooltipProps }">
          <v-icon v-bind="tooltipProps" icon="mdi-information-outline" size="12" class="text-medium-emphasis" />
        </template>
        {{ trend.note }}
      </v-tooltip>
    </div>

    <div v-if="yoyText" class="text-caption text-medium-emphasis mt-1">{{ yoyText }}</div>

    <v-tooltip v-if="projected" location="bottom" max-width="260">
      <template v-slot:activator="{ props: tooltipProps }">
        <v-chip v-bind="tooltipProps" size="x-small" variant="outlined" color="primary" class="mt-2 font-weight-medium">
          Projected: {{ projected.value }}
        </v-chip>
      </template>
      {{ projected.tooltip }}
    </v-tooltip>
  </v-card>
</template>
