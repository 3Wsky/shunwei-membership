<template>
  <div class="trend-chart">
    <div ref="chartRef" class="trend-canvas"></div>
    <div v-if="!ready" class="chart-placeholder">
      <el-skeleton animated :rows="4" />
    </div>
    <div v-else-if="empty" class="chart-empty">暂无趋势数据</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  labels: string[]
  granted: number[]
  consumed: number[]
}>()

const chartRef = ref<HTMLElement | null>(null)
const ready = ref(false)
const empty = ref(false)

type EchartsCore = typeof import('echarts/core')
type EChartsInstance = import('echarts/core').ECharts

let echartsModule: EchartsCore | null = null
let chart: EChartsInstance | null = null
let loadPromise: Promise<EchartsCore> | null = null

async function loadEcharts() {
  if (echartsModule) return echartsModule
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const [core, charts, components, renderers] = await Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers')
    ])
    core.use([
      charts.LineChart,
      components.GridComponent,
      components.TooltipComponent,
      components.LegendComponent,
      renderers.CanvasRenderer
    ])
    echartsModule = core
    return core
  })()

  return loadPromise
}

async function render() {
  if (!chartRef.value) return
  const echarts = await loadEcharts()
  // The element may have been unmounted while echarts was loading async
  // (e.g. during the page-fade route transition).
  if (!chartRef.value) return
  ready.value = true
  if (!chart) chart = echarts.init(chartRef.value)

  empty.value = !(props.granted.some((v) => v > 0) || props.consumed.some((v) => v > 0))

  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['积分新增', '积分消耗'], bottom: 0 },
    grid: { left: 48, right: 24, top: 24, bottom: 48 },
    xAxis: { type: 'category', data: props.labels, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [
      {
        name: '积分新增',
        type: 'line',
        smooth: true,
        data: props.granted,
        itemStyle: { color: '#FF8C42' },
        areaStyle: { color: 'rgba(255, 140, 66, 0.15)' }
      },
      {
        name: '积分消耗',
        type: 'line',
        smooth: true,
        data: props.consumed,
        lineStyle: { type: 'dashed' },
        itemStyle: { color: '#7B4FD4' }
      }
    ]
  })
}

function handleResize() {
  chart?.resize()
}

function safeRender() {
  render().catch((e) => {
    if (import.meta.env.DEV) console.warn('[IntegralTrendChart] render skipped:', e)
  })
}

watch(() => [props.labels, props.granted, props.consumed], () => { safeRender() }, { deep: true })

onMounted(() => {
  safeRender()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.trend-chart {
  width: 100%;
  height: 320px;
  position: relative;
}
.trend-canvas {
  width: 100%;
  height: 100%;
}
.chart-placeholder {
  position: absolute;
  inset: 0;
  padding: 24px 48px;
  box-sizing: border-box;
}
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #9ca3af;
  pointer-events: none;
}
</style>
