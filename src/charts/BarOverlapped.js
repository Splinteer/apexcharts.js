import CoreUtils from '../modules/CoreUtils'
import Bar from './Bar'
import Graphics from '../modules/Graphics'
import Utils from '../utils/Utils'
import BarStacked from './BarStacked'

/**
 * ApexCharts BarOverlapped Class responsible for drawing both Stacked Columns and Bars.
 *
 * @module BarOverlapped
 * The whole calculation for stacked bar/column is different from normal bar/column,
 * hence it makes sense to derive a new class for it extending most of the props of Parent Bar
 **/

class BarOverlapped extends BarStacked {
  reorderedValues = {}

  draw(series, seriesIndex) {
    let w = this.w
    this.graphics = new Graphics(this.ctx)
    this.bar = new Bar(this.ctx, this.xyRatios)

    const coreUtils = new CoreUtils(this.ctx, w)
    series = coreUtils.getLogSeries(series)
    this.yRatio = coreUtils.getLogYRatios(this.yRatio)

    this.barHelpers.initVariables(series)

    if (w.config.chart.stackType === '100%') {
      series = w.globals.seriesPercent.slice()
    }

    this.series = series

    this.totalItems = 0

    this.prevY = [] // y position on chart
    this.prevX = [] // x position on chart
    this.prevYF = [] // y position including shapes on chart
    this.prevXF = [] // x position including shapes on chart
    this.prevYVal = [] // y values (series[i][j]) in columns
    this.prevXVal = [] // x values (series[i][j]) in bars

    this.xArrj = [] // xj indicates x position on graph in bars
    this.xArrjF = [] // xjF indicates bar's x position + roundedShape's positions in bars
    this.xArrjVal = [] // x val means the actual series's y values in horizontal/bars
    this.yArrj = [] // yj indicates y position on graph in columns
    this.yArrjF = [] // yjF indicates bar's y position + roundedShape's positions in columns
    this.yArrjVal = [] // y val means the actual series's y values in columns

    for (let sl = 0; sl < series.length; sl++) {
      if (series[sl].length > 0) {
        this.totalItems += series[sl].length
      }
    }

    let ret = this.graphics.group({
      class: 'apexcharts-bar-series apexcharts-plot-series'
    })

    let x = 0
    let y = 0

    this.setReorderedValues()

    Object.keys(this.reorderedValues).forEach((j) => {
      Object.values(this.reorderedValues[j]).forEach((value, i) => {
        const { index } = value
        const nextValue = this.reorderedValues[j][i + 1]?.data

        this.addSerie(ret, j, index, x, y, seriesIndex, nextValue)
      })
    })

    return ret
  }

  addSerie(ret, j, i, x, y, seriesIndex, nextValue) {
    const w = this.w
    let xDivision // xDivision is the GRIDWIDTH divided by number of datapoints (columns)
    let yDivision // yDivision is the GRIDHEIGHT divided by number of datapoints (bars)
    let zeroH // zeroH is the baseline where 0 meets y axis
    let zeroW // zeroW is the baseline where 0 meets x axis

    let xArrValues = []
    let yArrValues = []

    let realIndex = w.globals.comboCharts ? seriesIndex[i] : i

    if (this.yRatio.length > 1) {
      this.yaxisIndex = realIndex
    }

    this.isReversed =
      w.config.yaxis[this.yaxisIndex] &&
      w.config.yaxis[this.yaxisIndex].reversed

    // el to which series will be drawn
    let elSeries = this.graphics.group({
      class: `apexcharts-series`,
      seriesName: Utils.escapeString(w.globals.seriesNames[realIndex]),
      rel: i + 1,
      'data:realIndex': realIndex
    })
    this.ctx.series.addCollapsedClassToSeries(elSeries, realIndex)

    // eldatalabels
    let elDataLabelsWrap = this.graphics.group({
      class: 'apexcharts-datalabels',
      'data:realIndex': realIndex
    })

    let elGoalsMarkers = this.graphics.group({
      class: 'apexcharts-bar-goals-markers',
      style: `pointer-events: none`
    })

    let barHeight = 0
    let barWidth = 0

    let initPositions = this.initialPositions(
      x,
      y,
      xDivision,
      yDivision,
      zeroH,
      zeroW
    )
    y = initPositions.y
    barHeight = initPositions.barHeight
    yDivision = initPositions.yDivision
    zeroW = initPositions.zeroW

    x = initPositions.x
    barWidth = initPositions.barWidth
    xDivision = initPositions.xDivision
    zeroH = initPositions.zeroH

    this.yArrj = []
    this.yArrjF = []
    this.yArrjVal = []
    this.xArrj = []
    this.xArrjF = []
    this.xArrjVal = []

    if (this.prevY.length === 1 && this.prevY[0].every((val) => isNaN(val))) {
      // make this.prevY[0] all zeroH
      this.prevY[0] = this.prevY[0].map((val) => zeroH)
      // make this.prevYF[0] all 0
      this.prevYF[0] = this.prevYF[0].map((val) => 0)
    }

    // push all x val arrays into main xArr
    w.globals.seriesXvalues[realIndex] = xArrValues
    w.globals.seriesYvalues[realIndex] = yArrValues

    // push all current y values array to main PrevY Array
    this.prevY.push(this.yArrj)
    this.prevYF.push(this.yArrjF)
    this.prevYVal.push(this.yArrjVal)
    this.prevX.push(this.xArrj)
    this.prevXF.push(this.xArrjF)
    this.prevXVal.push(this.xArrjVal)

    elSeries = this.getRenderSeries(
      i,
      j,
      realIndex,
      i,
      x,
      y,
      elSeries,
      xDivision,
      barWidth,
      zeroH,
      barHeight,
      elGoalsMarkers,
      xArrValues,
      yArrValues,
      this.series,
      elDataLabelsWrap,
      zeroW,
      yDivision,
      nextValue
    )

    ret.add(elSeries)
  }

  setReorderedValues() {
    for (let j = 0; j < this.w.globals.dataPoints; j++) {
      const orderedValues = []
      for (let i = 0, bc = 0; i < this.series.length; i++, bc++) {
        orderedValues.push({ index: i, data: this.series[i][j] })
      }
      orderedValues.sort((a, b) => (a.data > b.data ? -1 : 1))

      this.reorderedValues[j] = orderedValues
    }
  }

  getRenderSeries(
    i,
    j,
    realIndex,
    bc,
    x,
    y,
    elSeries,
    xDivision,
    barWidth,
    zeroH,
    barHeight,
    elGoalsMarkers,
    xArrValues,
    yArrValues,
    series,
    elDataLabelsWrap,
    zeroW,
    yDivision,
    nextValue
  ) {
    const strokeWidth = this.barHelpers.getStrokeWidth(i, j, realIndex)
    const commonPathOpts = {
      indexes: { i, j, realIndex, bc },
      strokeWidth,
      x,
      y,
      elSeries
    }
    let paths = null
    if (this.isHorizontal) {
      paths = this.drawStackedBarPaths({
        ...commonPathOpts,
        zeroW,
        barHeight,
        yDivision
      })
      barWidth = this.series[i][j] / this.invertedYRatio
    } else {
      paths = this.drawStackedColumnPaths({
        ...commonPathOpts,
        xDivision,
        barWidth,
        zeroH
      })
      barHeight = this.series[i][j] / this.yRatio[this.yaxisIndex]
    }

    const barGoalLine = this.barHelpers.drawGoalLine({
      barXPosition: paths.barXPosition,
      barYPosition: paths.barYPosition,
      goalX: paths.goalX,
      goalY: paths.goalY,
      barHeight,
      barWidth
    })

    if (barGoalLine) {
      elGoalsMarkers.add(barGoalLine)
    }

    y = paths.y
    x = paths.x

    xArrValues.push(x)
    yArrValues.push(y)

    let pathFill = this.barHelpers.getPathFillColor(series, i, j, realIndex)

    // this allow to center the datalabel based on the showed part of the element
    if (nextValue) {
      // Since values are ordered descending, the next value is the next biggest value
      // So since they are all on the same y axis we get the size of the next element to only get the size of the showed part
      if (this.isHorizontal) {
        const nextBarWidth = nextValue / this.invertedYRatio
        barWidth -= nextBarWidth
      } else {
        const nextBarHeight = nextValue / this.yRatio[this.yaxisIndex]
        barHeight -= nextBarHeight
      }
    }

    return this.renderSeries({
      realIndex,
      pathFill,
      j,
      i,
      pathFrom: paths.pathFrom,
      pathTo: paths.pathTo,
      strokeWidth,
      elSeries,
      x,
      y,
      series,
      barHeight,
      barWidth,
      elDataLabelsWrap,
      elGoalsMarkers,
      type: 'bar',
      visibleSeries: 0
    })
  }
}

export default BarOverlapped
