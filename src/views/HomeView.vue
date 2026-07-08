<script setup lang="ts">
import { computed, ref } from 'vue'
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
import rawMetricsData from '@/data/metrics.json'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{ selectedMonth: string; compareYoY: boolean }>()
const theme = useTheme()
const isDark = computed(() => theme.global.name.value === 'dark')

// ─── Data helpers ───
type RegionKey = 'Northeast' | 'Southeast' | 'Central' | 'West'
const regions: RegionKey[] = ['Northeast', 'Southeast', 'Central', 'West']

const EXCEPTION_TYPES = [
  'Weather Delay',
  'Carrier No-Show',
  'Damaged Freight',
  'Customs Hold',
  'Equipment Failure',
  'Missed Connection',
] as const
type ExceptionType = (typeof EXCEPTION_TYPES)[number]

const exceptionTypeColors: Record<ExceptionType, string> = {
  'Weather Delay': '#1A6EFF',
  'Carrier No-Show': '#7FB0FF',
  'Damaged Freight': '#8B5CF6',
  'Customs Hold': '#C4B5FD',
  'Equipment Failure': '#38BDF8',
  'Missed Connection': '#A5E1FB',
}

interface RegionMonthData {
  shipments: number
  onTimeRate: number
  exceptions: number
  exceptionsByType: Record<ExceptionType, number>
  avgTransitDays: number
  revenue: number
  byMode: Record<'TL' | 'LTL' | 'Expedited', { shipments: number; revenue: number }>
}

interface MonthData {
  month: string
  label: string
  monthStatus: 'actual' | 'in-progress'
  daysElapsed?: number
  daysInMonth?: number
  regions: Record<RegionKey, RegionMonthData>
}

const metricsData = rawMetricsData as unknown as { months: MonthData[]; exceptions: any[] }

const CURRENT_YEAR = '2025'

// Only 2025 is browsable via the month picker — 2024 exists solely to power
// the year-over-year overlay (see BRIEF.md).
const currentYearMonths = computed(() => metricsData.months.filter((m) => m.month.startsWith(CURRENT_YEAR)))

function findPriorYearMonth(monthKey: string): MonthData | null {
  const [year, mm] = monthKey.split('-')
  const priorKey = `${Number(year) - 1}-${mm}`
  return metricsData.months.find((m) => m.month === priorKey) ?? null
}

const filteredMonths = computed(() => {
  if (props.selectedMonth === 'all') return currentYearMonths.value
  return currentYearMonths.value.filter((m) => m.month === props.selectedMonth)
})

const previousMonth = computed(() => {
  if (props.selectedMonth === 'all') return null
  const idx = currentYearMonths.value.findIndex((m) => m.month === props.selectedMonth)
  return idx > 0 ? currentYearMonths.value[idx - 1] : null
})

// ─── Month-in-progress / projection ───
const inProgressMonth = computed(() => currentYearMonths.value.find((m) => m.monthStatus === 'in-progress') ?? null)
const isInProgressSelected = computed(
  () => props.selectedMonth !== 'all' && inProgressMonth.value?.month === props.selectedMonth,
)

// Simple linear pace — a decision-support read, not a statistical forecast.
function projectedCount(monthToDateValue: number): number {
  const ip = inProgressMonth.value
  if (!ip || !ip.daysElapsed || !ip.daysInMonth) return monthToDateValue
  return Math.round((monthToDateValue / ip.daysElapsed) * ip.daysInMonth)
}

function isCountMetric(key: string) {
  return key === 'shipments' || key === 'exceptions'
}

// For the in-progress month, count metrics compare against their projection
// rather than the raw month-to-date number, which would always look
// artificially low against a full prior month.
function comparisonValue(current: number, key: string) {
  if (isInProgressSelected.value && isCountMetric(key)) return projectedCount(current)
  return current
}

function kpiProjection(current: number, key: 'shipments' | 'onTimeRate' | 'exceptions' | 'avgTransitDays') {
  const ip = inProgressMonth.value
  if (!isInProgressSelected.value || !ip || !ip.daysElapsed || !ip.daysInMonth) return null
  const isCount = isCountMetric(key)
  const projected = isCount ? projectedCount(current) : current
  const valueText =
    key === 'onTimeRate' ? projected.toFixed(1) + '%' : key === 'avgTransitDays' ? projected.toFixed(1) : formatNumber(projected)
  const tooltip = isCount
    ? `Month-to-date: ${formatNumber(current)} through day ${ip.daysElapsed} of ${ip.daysInMonth} → paced to ${formatNumber(projected)} for the full month.`
    : `Based on the first ${ip.daysElapsed} of ${ip.daysInMonth} days this month — a rate doesn't need scaling.`
  return { value: valueText, tooltip }
}

function sumAcrossRegions(months: MonthData[], key: 'shipments' | 'exceptions' | 'revenue') {
  return months.reduce((total, m) => {
    return total + regions.reduce((rTotal, r) => rTotal + m.regions[r][key], 0)
  }, 0)
}

function avgAcrossRegions(months: MonthData[], key: 'onTimeRate' | 'avgTransitDays') {
  let sum = 0
  let count = 0
  months.forEach((m) => {
    regions.forEach((r) => {
      sum += m.regions[r][key]
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

// ─── KPI trend vs prior month ───
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

// "All" has no prior year to compare, and January has no prior month — both
// are a neutral no-indicator state rather than a trend arrow (see BRIEF.md).
function trendInfo(current: number, key: string, invertGood = false) {
  if (props.selectedMonth === 'all' || !previousMonth.value) return null
  const compCurrent = comparisonValue(current, key)
  const pct = trendPct(compCurrent, key)
  if (pct == null) return null
  const isPositive = pct > 0
  const good = invertGood ? !isPositive : isPositive
  const ip = inProgressMonth.value
  const note =
    isInProgressSelected.value && isCountMetric(key) && ip
      ? `Compared using this month's full-month projection (day ${ip.daysElapsed} of ${ip.daysInMonth}), since the month is still in progress.`
      : null
  return {
    icon: pct === 0 ? 'mdi-minus' : isPositive ? 'mdi-arrow-up' : 'mdi-arrow-down',
    color: pct === 0 ? 'text-medium-emphasis' : good ? 'text-success' : 'text-error',
    text: `${Math.abs(pct).toFixed(1)}% vs prior month`,
    note,
  }
}

function noTrendFallback(allFallback: string) {
  return props.selectedMonth === 'all' ? allFallback : 'No prior month to compare'
}

// ─── YoY delta (optional, alongside the month-over-month arrow) ───
function yoyText(current: number, key: 'shipments' | 'onTimeRate' | 'exceptions' | 'avgTransitDays') {
  if (!props.compareYoY || props.selectedMonth === 'all') return null
  const priorMonth = findPriorYearMonth(props.selectedMonth)
  if (!priorMonth) return null
  const priorValue =
    key === 'onTimeRate' || key === 'avgTransitDays' ? avgAcrossRegions([priorMonth], key) : sumAcrossRegions([priorMonth], key)
  if (!priorValue) return null
  const compCurrent = comparisonValue(current, key)
  const pct = ((compCurrent - priorValue) / priorValue) * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}% vs same month last year`
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
    return { region, shipments, onTimeRate: avgOnTime, exceptions, avgTransitDays: avgTransit, revenue, hasData: count > 0 }
  })
})

// Guards against a malformed or missing metrics.json so the dashboard fails
// visibly instead of silently rendering blank/zeroed-out cards (see BRIEF.md).
const dataError = computed(() => {
  return !metricsData || !Array.isArray(metricsData.months) || metricsData.months.length === 0
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

// Rate metrics aren't paced — the projection is the month-to-date rate
// itself, using the same thresholds/labels as the current-status chip.
function regionProjection(rd: { onTimeRate: number }) {
  if (!isInProgressSelected.value) return null
  return { color: statusColor(rd.onTimeRate), label: statusLabel(rd.onTimeRate) }
}

// ─── Charts ───
const chartLabels = computed(() => {
  if (props.selectedMonth === 'all') return currentYearMonths.value.map((m) => m.label.substring(0, 3))
  return filteredMonths.value.map((m) => m.label)
})

const chartMonths = computed(() => {
  if (props.selectedMonth === 'all') return currentYearMonths.value
  return filteredMonths.value
})

const tooltipStyle = computed(() => ({
  backgroundColor: isDark.value ? '#1E293B' : '#FFFFFF',
  titleColor: isDark.value ? '#E2E8F0' : '#1E293B',
  bodyColor: isDark.value ? '#CBD5E1' : '#475569',
  borderColor: isDark.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 8,
}))

const barChartData = computed(() => {
  const tlData = chartMonths.value.map((m) => regions.reduce((s, r) => s + m.regions[r].byMode.TL.shipments, 0))
  const ltlData = chartMonths.value.map((m) => regions.reduce((s, r) => s + m.regions[r].byMode.LTL.shipments, 0))
  const expData = chartMonths.value.map((m) => regions.reduce((s, r) => s + m.regions[r].byMode.Expedited.shipments, 0))
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
    tooltip: tooltipStyle.value,
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
  const datasets: any[] = [
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
  ]
  if (props.compareYoY) {
    const priorData = chartMonths.value.map((m) => {
      const pm = findPriorYearMonth(m.month)
      if (!pm) return null
      const sum = regions.reduce((s, r) => s + pm.regions[r].onTimeRate, 0)
      return +(sum / regions.length).toFixed(1)
    })
    datasets.push({
      label: 'On-Time % (Last Year)',
      data: priorData,
      borderColor: isDark.value ? '#94A3B8' : '#64748B',
      borderDash: [4, 3],
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: isDark.value ? '#94A3B8' : '#64748B',
    })
  }
  return { labels: chartLabels.value, datasets }
})

const lineChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { position: 'bottom' as const, labels: { color: isDark.value ? '#94A3B8' : '#64748B', usePointStyle: true, pointStyle: 'circle', padding: 16 } },
    tooltip: {
      ...tooltipStyle.value,
      callbacks: {
        label: (ctx: any) => {
          if (ctx.dataset.label === 'Target (95%)') return 'Target: 95%'
          if (ctx.dataset.label === 'On-Time % (Last Year)') return `Last Year: ${ctx.parsed.y}%`
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

// ─── Exception type breakdown chart ───
const exceptionChartMode = ref<'byMonth' | 'byType'>('byMonth')

function sumExceptionType(months: MonthData[], type: ExceptionType) {
  return months.reduce((tot, m) => tot + regions.reduce((s, r) => s + m.regions[r].exceptionsByType[type], 0), 0)
}

const exceptionByMonthData = computed(() => {
  const datasets: any[] = EXCEPTION_TYPES.map((type) => ({
    label: type,
    data: chartMonths.value.map((m) => regions.reduce((s, r) => s + m.regions[r].exceptionsByType[type], 0)),
    backgroundColor: exceptionTypeColors[type],
    stack: 'types',
    borderRadius: 3,
  }))
  if (props.compareYoY) {
    const priorTotals = chartMonths.value.map((m) => {
      const pm = findPriorYearMonth(m.month)
      return pm ? EXCEPTION_TYPES.reduce((tot, type) => tot + sumExceptionType([pm], type), 0) : null
    })
    datasets.push({
      type: 'line',
      label: 'Total Exceptions (Last Year)',
      data: priorTotals,
      borderColor: isDark.value ? '#94A3B8' : '#64748B',
      borderDash: [6, 4],
      backgroundColor: 'transparent',
      pointRadius: 3,
      fill: false,
      tension: 0.3,
      order: -1,
    })
  }
  return { labels: chartLabels.value, datasets }
})

const exceptionByTypeData = computed(() => {
  const totals = EXCEPTION_TYPES.map((type) => ({ type, value: sumExceptionType(chartMonths.value, type) }))
  totals.sort((a, b) => b.value - a.value) // Pareto order — highest-volume type first
  const labels = totals.map((t) => t.type)
  const colors = totals.map((t) => exceptionTypeColors[t.type])
  const datasets: any[] = [{ label: 'This Period', data: totals.map((t) => t.value), backgroundColor: colors, borderRadius: 4 }]
  if (props.compareYoY) {
    const priorValues = totals.map((t) => {
      const priorMonths = chartMonths.value.map((m) => findPriorYearMonth(m.month)).filter((m): m is MonthData => m != null)
      return sumExceptionType(priorMonths, t.type)
    })
    datasets.push({
      label: 'Same Period Last Year',
      data: priorValues,
      backgroundColor: colors.map((c) => c + '55'),
      borderColor: colors,
      borderWidth: 2,
      borderDash: [6, 4],
      borderRadius: 4,
    })
  }
  return { labels, datasets }
})

const exceptionByMonthOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { position: 'bottom' as const, labels: { color: isDark.value ? '#94A3B8' : '#64748B', usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 11 } } },
    tooltip: tooltipStyle.value,
  },
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { color: isDark.value ? '#64748B' : '#94A3B8' } },
    y: { stacked: true, grid: { color: isDark.value ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }, ticks: { color: isDark.value ? '#64748B' : '#94A3B8' } },
  },
}))

const exceptionByTypeOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: props.compareYoY, position: 'bottom' as const, labels: { color: isDark.value ? '#94A3B8' : '#64748B', usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 11 } } },
    tooltip: tooltipStyle.value,
  },
  scales: {
    x: { grid: { color: isDark.value ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }, ticks: { color: isDark.value ? '#64748B' : '#94A3B8' } },
    y: { grid: { display: false }, ticks: { color: isDark.value ? '#64748B' : '#94A3B8' } },
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
    <v-alert
      v-if="dataError"
      type="error"
      variant="tonal"
      title="Unable to load dashboard data"
      text="metrics.json is missing or malformed. Check src/data/metrics.json."
    />

    <template v-else>
    <!-- KPI Summary Cards -->
    <v-row class="mb-8">
      <v-col cols="12" sm="6" lg="3">
        <MetricCard
          label="Total Shipments"
          :value="formatNumber(totalShipments)"
          :trend="trendInfo(totalShipments, 'shipments')"
          :fallback-text="noTrendFallback('Full year total')"
          :projected="kpiProjection(totalShipments, 'shipments')"
          :yoy-text="yoyText(totalShipments, 'shipments')"
        />
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <MetricCard
          label="On-Time Delivery"
          :value="onTimeRate.toFixed(1) + '%'"
          :trend="trendInfo(onTimeRate, 'onTimeRate')"
          :fallback-text="noTrendFallback('Full year average')"
          :projected="kpiProjection(onTimeRate, 'onTimeRate')"
          :yoy-text="yoyText(onTimeRate, 'onTimeRate')"
        />
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <MetricCard
          label="Exception Events"
          :value="formatNumber(openExceptions)"
          :trend="trendInfo(openExceptions, 'exceptions', true)"
          :fallback-text="noTrendFallback('Full year total')"
          :projected="kpiProjection(openExceptions, 'exceptions')"
          :yoy-text="yoyText(openExceptions, 'exceptions')"
        />
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <MetricCard
          label="Avg. Transit Days"
          :value="avgTransitDays.toFixed(1)"
          :trend="trendInfo(avgTransitDays, 'avgTransitDays', true)"
          :fallback-text="noTrendFallback('Full year average')"
          :projected="kpiProjection(avgTransitDays, 'avgTransitDays')"
          :yoy-text="yoyText(avgTransitDays, 'avgTransitDays')"
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

      <v-col cols="12" md="6">
        <v-card class="glass-card pa-4" rounded="lg">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-7">
            <div class="text-h5 font-weight-bold">Exception Events by {{ exceptionChartMode === 'byMonth' ? 'Month' : 'Type' }}</div>
            <v-btn-toggle v-model="exceptionChartMode" density="compact" mandatory color="primary" variant="outlined">
              <v-btn value="byMonth" size="small">By Month</v-btn>
              <v-btn value="byType" size="small">By Type</v-btn>
            </v-btn-toggle>
          </div>
          <div style="height: 300px">
            <Bar
              v-if="exceptionChartMode === 'byMonth'"
              :data="exceptionByMonthData"
              :options="exceptionByMonthOptions"
            />
            <Bar v-else :data="exceptionByTypeData" :options="exceptionByTypeOptions" />
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
          v-if="rd.hasData"
          :title="rd.region"
          :icon="regionIcons[rd.region] ?? 'mdi-map-marker'"
          :status="{ color: statusColor(rd.onTimeRate), label: statusLabel(rd.onTimeRate) }"
          :projection="regionProjection(rd)"
          :shipments="formatNumber(rd.shipments)"
          :on-time-rate="rd.onTimeRate.toFixed(1) + '%'"
          :exceptions="rd.exceptions"
          :avg-transit-days="rd.avgTransitDays.toFixed(1) + ' days'"
          :revenue="formatCurrency(rd.revenue)"
        />
        <v-card
          v-else
          class="glass-card pa-4 d-flex flex-column align-center justify-center text-center"
          rounded="lg"
          style="min-height: 220px"
        >
          <v-icon icon="mdi-database-off-outline" size="32" class="mb-2 text-medium-emphasis" />
          <div class="text-subtitle-1 font-weight-bold">{{ rd.region }}</div>
          <div class="text-caption text-medium-emphasis">No data for this period</div>
        </v-card>
      </v-col>
    </v-row>

    <div style="height: 24px"></div>

    <!-- Exceptions Table -->
    <div class="text-h5 font-weight-bold mb-1">Open Exceptions</div>
    <div class="text-caption text-medium-emphasis mb-9">
      Currently unresolved shipment events — older exceptions are resolved and roll off this list, so months further in the past may show none.
    </div>
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
    </template>
  </v-container>
</template>

<style>
.exceptions-table tr:hover td {
  background-color: rgba(26, 110, 255, 0.06);
  transition: background-color 150ms ease;
}
</style>
