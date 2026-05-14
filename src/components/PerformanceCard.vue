<script setup lang="ts">
defineProps<{
  title: string
  icon: string
  status: {
    color: string
    label: string
  }
  shipments: string
  onTimeRate: string
  exceptions: string | number
  avgTransitDays: string
  revenue: string
}>()
</script>

<template>
  <v-card class="glass-card pa-4" rounded="lg">
    <div class="d-flex align-center justify-space-between mb-6" style="min-height: 48px">
      <span class="text-subtitle-1 font-weight-bold" style="line-height: 2">{{ title }}</span>
      <v-chip
        size="x-small"
        :color="status.color"
        variant="flat"
        class="font-weight-medium"
      >
        <v-icon start size="12" class="mr-1" :icon="status.label === 'On Target' ? 'mdi-check-circle' : status.label === 'At Risk' ? 'mdi-alert' : 'mdi-close-circle'" />
        {{ status.label }}
      </v-chip>
    </div>

    <v-row dense>
      <v-col cols="6">
        <div class="text-caption text-medium-emphasis">Shipments</div>
        <div class="text-body-1 font-weight-medium tabular-nums">{{ shipments }}</div>
      </v-col>
      <v-col cols="6">
        <div class="text-caption text-medium-emphasis">On-Time</div>
        <div class="text-body-1 font-weight-medium tabular-nums">{{ onTimeRate }}</div>
      </v-col>
      <v-col cols="6">
        <div class="text-caption text-medium-emphasis">Exceptions</div>
        <div class="text-body-1 font-weight-medium tabular-nums">{{ exceptions }}</div>
      </v-col>
      <v-col cols="6">
        <div class="text-caption text-medium-emphasis">Avg Transit</div>
        <div class="text-body-1 font-weight-medium tabular-nums">{{ avgTransitDays }}</div>
      </v-col>
      <v-col cols="12">
        <div class="text-caption text-medium-emphasis">Revenue</div>
        <div class="text-body-1 font-weight-medium tabular-nums">{{ revenue }}</div>
      </v-col>
    </v-row>
  </v-card>
</template>
