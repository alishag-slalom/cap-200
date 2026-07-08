<script setup lang="ts">
defineProps<{
  title: string
  icon: string
  status: {
    color: string
    label: string
  }
  projection?: {
    color: string
    label: string
  } | null
  shipments: string
  onTimeRate: string
  exceptions: string | number
  avgTransitDays: string
  revenue: string
}>()

function statusIcon(label: string, outline: boolean) {
  if (label === 'On Target') return outline ? 'mdi-check-circle-outline' : 'mdi-check-circle'
  if (label === 'At Risk') return outline ? 'mdi-alert-outline' : 'mdi-alert'
  return outline ? 'mdi-close-circle-outline' : 'mdi-close-circle'
}
</script>

<template>
  <v-card class="glass-card pa-4" rounded="lg">
    <div class="d-flex align-center justify-space-between" style="min-height: 48px">
      <span class="text-subtitle-1 font-weight-bold" style="line-height: 2">{{ title }}</span>
      <v-chip
        size="x-small"
        :color="status.color"
        variant="flat"
        class="font-weight-medium"
      >
        <v-icon start size="12" class="mr-1" :icon="statusIcon(status.label, false)" />
        {{ status.label }}
      </v-chip>
    </div>

    <div v-if="projection" class="d-flex justify-end mb-2">
      <v-chip size="x-small" :color="projection.color" variant="outlined" class="font-weight-medium">
        <v-icon start size="10" class="mr-1" :icon="statusIcon(projection.label, true)" />
        Projected: {{ projection.label }}
      </v-chip>
    </div>
    <div v-else style="height: 24px" class="mb-2"></div>

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
