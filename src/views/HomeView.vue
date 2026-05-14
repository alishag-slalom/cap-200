<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from 'vuetify'
import { Bar, Line } from 'vue-chartjs'
import MetricCard from '@/components/MetricCard.vue'
import PerformanceCard from '@/components/PerformanceCard.vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import metricsData from '@/data/metrics.json'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{ selectedMonth: string }>()
const theme = useTheme()
const isDark = computed(() => theme.global.name.value === 'dark')

// ─── Data helpers ───
type RegionKey = 'Northeast' | 'Southeast' | 'Central' | 'West'
const regions: RegionKey[] = ['Northeast', 'Southeast', 'Central', 'West']

const filteredMonths = computed(() => {
  if (props.selectedMonth === 'all') return metricsData.months
  return metricsData.months.filter((m) => m.month === props.selectedMonth)
})

const previousMonth = computed(() => {
  if (props.selectedMonth === 'all') return null
  const idx = metricsData.months.findIndex((m) => m.month === props.selectedMonth)
  return idx > 0 ? metricsData.months[idx - 1] : null
})

function sumAcrossRegions(months: typeof metricsData.months, key: 'shipments' | 'exceptions' | 'revenue') {
  return months.reduce((total, m) => {
    return total + regions.reduce((rTotal, r) => rTotal + (m.regions[r] as any)[key], 0)
  }, 0)
}

function avgAcrossRegions(months: typeof metricsData.months, key: 'onTimeRate' | 'avgTransitDays') {
  let sum = 0
  let count = 0
  months.forEach((m) => {
    regions.forEach((r) => {
      sum += (m.regions[r] as any)[key]
      count++
    })
  })
  return count > 0 ? sum / count : 0
}

// ─── KPI values ───
const totalShipments = computed(() => sumAcrossRegions(filteredMonths.value, 'shipments'))
const onTimeRate = computed(() => avgAcrossRegions(filteredMonths.value, 'onTimeRate'))
const openExceptions = computed(() => sumAcrossRegions(filteredMonths.value, 'exceptions'))
const avgTransitDays = computed(() => avgAcrossRegions(filteredMonths.value, 'avgTransitDays'))

// ─── KPI descriptions ───
function kpiDescription(current: number, key: string, fallback: string, invertGood = false) {
  const pct = trendPct(current, key)
  if (pct == null) return fallback
  const dir = pct > 0 ? '↑' : pct < 0 ? '↓' : '—'
  return `${dir} ${Math.abs(pct).toFixed(1)}% vs prior month`
}

// ─── KPI trend vs prior ───
function getPriorKpi(key: string) {
  if (props.selectedMonth === 'all' || !previousMonth.value) return null
  const pm = [previousMonth.value]
  if (key === 'shipments') return sumAcrossRegions(pm, 'shipments')
  if (key === 'exceptions') return sumAcrossRegions(pm, 'exceptions')
  if (key === 'onTimeRate') return avgAcrossRegions(pm, 'onTimeRate')
  if (key === 'avgTransitDays') return avgAcrossRegions(pm, 'avgTransitDays')
  return null
}

function trendPct(current: number, key: string) {
  const prior = getPriorKpi(key)
  if (prior == null || prior === 0) return null
  return ((current - prior) / prior) * 100
}

function trendIcon(pct: number | null, invertGood = false) {
  if (pct == null) return ''
  if (pct > 0) return invertGood ? 'mdi-arrow-up' : 'mdi-arrow-up'
  if (pct < 0) return invertGood ? 'mdi-arrow-down' : 'mdi-arrow-down'
  return 'mdi-minus'
}

function trendColor(pct: number | null, invertGood = false) {
  if (pct == null) return 'text-medium-emphasis'
  const isPositive = pct > 0
  const good = invertGood ? !isPositive : isPositive
  return good ? 'text-success' : 'text-error'
}

// ─── Regional data ───
const regionalData = computed(() => {
  return regions.map((region) => {
    let shipments = 0
    let onTime = 0
    let exceptions = 0
    let transit = 0
    let revenue = 0
    let count = 0
    filteredMonths.value.forEach((m) => {
      const r = m.regions[region]
      shipments += r.shipments
      onTime += r.onTimeRate
      exceptions += r.exceptions
      transit += r.avgTransitDays
      revenue += r.revenue
      count++
    })
    const avgOnTime = count > 0 ? onTime / count : 0
    const avgTransit = count > 0 ? transit / count : 0
    return { region, shipments, onTimeRate: avgOnTime, exceptions, avgTransitDays: avgTransit, revenue }
  })
})

function statusColor(rate: number) {
  if (rate >= 95) return '#1DB87A'
  if (rate >= 92) return '#F5A623'
  return '#E03B3B'
}

function statusLabel(rate: number) {
  if (rate >= 95) return 'On Target'
  if (rate >= 92) return 'At Risk'
  return 'Below Target'
}

// ─── Charts ───
const chartLabels = computed(() => {
  if (props.selectedMonth === 'all') return metricsData.months.map((m) => m.label.substring(0, 3))
  return filteredMonths.value.map((m) => m.label)
})

const chartMonths = computed(() => {
  if (props.selectedMonth === 'all') return metricsData.months
  return filteredMonths.value
})

const barChartData = computed(() => {
  const tlData = chartMonths.value.map((m) =>
    regions.reduce((s, r) => s + m.regions[r].byMode.TL.shipments, 0)
  )
  const ltlData = chartMonths.value.map((m) =>
    regions.reduce((s, r) => s + m.regions[r].byMode.LTL.shipments, 0)
  )
  const expData = chartMonths.value.map((m) =>
    regions.reduce((s, r) => s + m.regions[r].byMode.Expedited.shipments, 0)
  )
  return {
    labels: chartLabels.value,
    datasets: [
      { label: 'Truckload', data: tlData, backgroundColor: '#1A6EFF', borderRadius: 4 },
      { label: 'LTL', data: ltlData, backgroundColor: '#8B5CF6', borderRadius: 4 },
      { label: 'Expedited', data: expData, backgroundColor: '#38BDF8', borderRadius: 4 },
    ],
  }
})

const barChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { color: isDark.value ? '#94A3B8' : '#64748B', usePointStyle: true, pointStyle: 'circle', padding: 16 } },
    tooltip: {
      backgroundColor: isDark.value ? '#1E293B' : '#FFFFFF',
      titleColor: isDark.value ? '#E2E8F0' : '#1E293B',
      bodyColor: isDark.value ? '#CBD5E1' : '#475569',
      borderColor: isDark.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { color: isDark.value ? '#64748B' : '#94A3B8' } },
    y: { stacked: true, grid: { color: isDark.value ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }, ticks: { color: isDark.value ? '#64748B' : '#94A3B8' } },
  },
}))

const lineChartData = computed(() => {
  const rateData = chartMonths.value.map((m) => {
    const sum = regions.reduce((s, r) => s + m.regions[r].onTimeRate, 0)
    return +(sum / regions.length).toFixed(1)
  })
  const targetData = chartMonths.value.map(() => 95)
  return {
    labels: chartLabels.value,
    datasets: [
      {
        label: 'On-Time %',
        data: rateData,
        borderColor: '#1A6EFF',
        backgroundColor: isDark.value ? 'rgba(26,110,255,0.1)' : 'rgba(26,110,255,0.06)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#1A6EFF',
      },
      {
        label: 'Target (95%)',
        data: targetData,
        borderColor: '#E03B3B',
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0,
      },
    ],
  }
})

const lineChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { color: isDark.value ? '#94A3B8' : '#64748B', usePointStyle: true, pointStyle: 'circle', padding: 16 } },
    tooltip: {
      backgroundColor: isDark.value ? '#1E293B' : '#FFFFFF',
      titleColor: isDark.value ? '#E2E8F0' : '#1E293B',
      bodyColor: isDark.value ? '#CBD5E1' : '#475569',
      borderColor: isDark.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: any) => {
          if (ctx.dataset.label === 'Target (95%)') return 'Target: 95%'
          return `On-Time: ${ctx.parsed.y}%`
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: isDark.value ? '#64748B' : '#94A3B8' } },
    y: { min: 85, max: 100, grid: { color: isDark.value ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }, ticks: { color: isDark.value ? '#64748B' : '#94A3B8', callback: (v: any) => v + '%' } },
  },
}))

// ─── Exceptions table ───
const priorityOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 }

const filteredExceptions = computed(() => {
  let excs = metricsData.exceptions
  if (props.selectedMonth !== 'all') {
    excs = excs.filter((e) => e.month === props.selectedMonth)
  }
  return [...excs].sort((a, b) => {
    const pDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
    if (pDiff !== 0) return pDiff
    return b.ageDays - a.ageDays
  })
})

const exceptionHeaders = [
  { title: 'ID', key: 'id', sortable: true },
  { title: 'Region', key: 'region', sortable: true },
  { title: 'Mode', key: 'mode', sortable: true },
  { title: 'Type', key: 'type', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Priority', key: 'priority', sortable: true },
  { title: 'Age (days)', key: 'ageDays', sortable: true },
]

function priorityColor(priority: string) {
  if (priority === 'High') return 'error'
  if (priority === 'Medium') return 'warning'
  return 'default'
}

function formatNumber(n: number) {
  return n.toLocaleString('en-US')
}

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const regionIcons: Record<string, string> = {
  Northeast: 'mdi-compass-outline',
  Southeast: 'mdi-white-balance-sunny',
  Central: 'mdi-barn',
  West: 'mdi-mountain',
}
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6">
    <!-- KPI Summary Cards -->
    <v-row class="mb-8">
      <v-col cols="12" sm="6" lg="3">
        <MetricCard
          label="Total Shipments"
          :value="formatNumber(totalShipments)"
          :description="kpiDescription(totalShipments, 'shipments', 'Full year total')"
        />
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <MetricCard
          label="On-Time Delivery"
          :value="onTimeRate.toFixed(1) + '%'"
          :description="kpiDescription(onTimeRate, 'onTimeRate', 'Full year average')"
        />
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <MetricCard
          label="Open Exceptions"
          :value="formatNumber(openExceptions)"
          :description="kpiDescription(openExceptions, 'exceptions', 'Full year total', true)"
        />
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <MetricCard
          label="Avg. Transit Days"
          :value="avgTransitDays.toFixed(1)"
          :description="kpiDescription(avgTransitDays, 'avgTransitDays', 'Full year average', true)"
        />
      </v-col>
    </v-row>

    <div style="height: 24px"></div>

    <!-- Charts Row -->
    <v-row class="mb-2">
      <v-col cols="12" md="6">
        <v-card class="glass-card pa-4" rounded="lg">
          <div class="text-h5 font-weight-bold mb-7">Monthly Shipment Volume by Mode</div>
          <div style="height: 300px">
            <Bar :data="barChartData" :options="barChartOptions" />
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="glass-card pa-4" rounded="lg">
          <div class="text-h5 font-weight-bold mb-7">On-Time Delivery Rate</div>
          <div style="height: 300px">
            <Line :data="lineChartData" :options="lineChartOptions" />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <div style="height: 24px"></div>

    <!-- Regional Performance Grid -->
    <div class="text-h5 font-weight-bold mb-7">Regional Performance</div>
    <v-row class="mb-2">
      <v-col v-for="rd in regionalData" :key="rd.region" cols="12" sm="6" lg="3">
        <PerformanceCard
          :title="rd.region"
          :icon="regionIcons[rd.region] ?? 'mdi-map-marker'"
          :status="{ color: statusColor(rd.onTimeRate), label: statusLabel(rd.onTimeRate) }"
          :shipments="formatNumber(rd.shipments)"
          :on-time-rate="rd.onTimeRate.toFixed(1) + '%'"
          :exceptions="rd.exceptions"
          :avg-transit-days="rd.avgTransitDays.toFixed(1) + ' days'"
          :revenue="formatCurrency(rd.revenue)"
        />
      </v-col>
    </v-row>

    <div style="height: 24px"></div>

    <!-- Exceptions Table -->
    <div class="text-h5 font-weight-bold mb-10">Open Exceptions</div>
    <v-card class="glass-card" rounded="lg">
      <v-data-table
        :headers="exceptionHeaders"
        :items="filteredExceptions"
        :items-per-page="10"
        density="comfortable"
        class="bg-transparent exceptions-table"
        :sort-by="[{ key: 'priority', order: 'desc' }, { key: 'ageDays', order: 'desc' }]"
        hover
      >
        <template v-slot:item.priority="{ item }">
          <v-chip size="small" :color="priorityColor(item.priority)" variant="tonal" class="font-weight-medium">
            {{ item.priority }}
          </v-chip>
        </template>
        <template v-slot:item.ageDays="{ item }">
          <span class="tabular-nums">{{ item.ageDays }}d</span>
        </template>
        <template v-slot:no-data>
          <div class="text-center pa-6 text-medium-emphasis">
            <v-icon icon="mdi-check-circle-outline" size="32" class="mb-2" />
            <div>No open exceptions for this period</div>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<style>
.exceptions-table tr:hover td {
  background-color: rgba(26, 110, 255, 0.06);
  transition: background-color 150ms ease;
}
</style>
