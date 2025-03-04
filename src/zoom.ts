import { ChartInternal } from './core'
import CLASS from './class'

ChartInternal.prototype.initZoom = function() {
  var $$ = this,
    d3 = $$.d3,
    config = $$.config,
    startEvent

  $$.zoom = d3
    .zoom()
    .on('start', function(event) {
      if (config.zoom_type !== 'scroll') {
        return
      }

      var e = event.sourceEvent
      if (e && e.type === 'brush') {
        return
      }
      startEvent = e
      config.zoom_onzoomstart.call($$.api, e)
    })
    .on('zoom', function(event) {
      if (config.zoom_type !== 'scroll') {
        return
      }

      var e = event.sourceEvent
      if (e && e.type === 'brush') {
        return
      }

      $$.redrawForZoom()

      config.zoom_onzoom.call($$.api, $$.x.orgDomain())
    })
    .on('end', function(event) {
      if (config.zoom_type !== 'scroll') {
        return
      }

      var e = event.sourceEvent
      if (e && e.type === 'brush') {
        return
      }
      // if click, do nothing. otherwise, click interaction will be canceled.
      if (
        e &&
        startEvent.clientX === e.clientX &&
        startEvent.clientY === e.clientY
      ) {
        return
      }
      config.zoom_onzoomend.call($$.api, $$.x.orgDomain())
    })

  $$.zoom.updateDomain = function(event) {
    if (event && event.transform) {
      if (config.axis_rotated && config.zoom_type === 'scroll' && event.sourceEvent.type === 'mousemove') {
        // we're moving the mouse in a rotated chart with zoom = "scroll", so we need rescaleY (i.e. vertical)
        $$.x.domain(event.transform.rescaleY($$.subX).domain());
      } else {
        $$.x.domain(event.transform.rescaleX($$.subX).domain());
      }
    }
    return this
  }
  $$.zoom.updateExtent = function() {
    this.scaleExtent([1, Infinity])
      .translateExtent([
        [0, 0],
        [$$.width, $$.height]
      ])
      .extent([
        [0, 0],
        [$$.width, $$.height]
      ])
    return this
  }
  $$.zoom.update = function() {
    return this.updateExtent().updateDomain()
  }

  return $$.zoom.updateExtent()
}
ChartInternal.prototype.zoomTransform = function(range) {
  var $$ = this,
    s = [$$.x(range[0]), $$.x(range[1])]
  return $$.d3.zoomIdentity.scale($$.width / (s[1] - s[0])).translate(-s[0], 0)
}

ChartInternal.prototype.initDragZoom = function() {
  const $$ = this
  const d3 = $$.d3
  const config = $$.config
  const context = ($$.context = $$.svg)
  const brushXPos = $$.margin.left + 20.5
  const brushYPos = $$.margin.top + 0.5

  if (!(config.zoom_type === 'drag' && config.zoom_enabled)) {
    return
  }

  const getZoomedDomain = selection =>
    selection && selection.map(x => $$.x.invert(x))

  const brush = ($$.dragZoomBrush = d3
    .brushX()
    .on('start', (event) => {
      $$.api.unzoom()

      $$.svg.select('.' + CLASS.dragZoom).classed('disabled', false)

      config.zoom_onzoomstart.call($$.api, event.sourceEvent)
    })
    .on('brush', (event) => {
      config.zoom_onzoom.call($$.api, getZoomedDomain(event.selection))
    })
    .on('end', (event) => {
      if (event.selection == null) {
        return
      }

      const zoomedDomain = getZoomedDomain(event.selection)

      if (!config.zoom_disableDefaultBehavior) {
        $$.api.zoom(zoomedDomain)
      }

      $$.svg.select('.' + CLASS.dragZoom).classed('disabled', true)

      config.zoom_onzoomend.call($$.api, zoomedDomain)
    }))

  context
    .append('g')
    .classed(CLASS.dragZoom, true)
    .attr('clip-path', $$.clipPath)
    .attr('transform', 'translate(' + brushXPos + ',' + brushYPos + ')')
    .call(brush)
}

ChartInternal.prototype.getZoomDomain = function() {
  var $$ = this,
    config = $$.config,
    d3 = $$.d3,
    min = d3.min([$$.orgXDomain[0], config.zoom_x_min]),
    max = d3.max([$$.orgXDomain[1], config.zoom_x_max])
  return [min, max]
}
ChartInternal.prototype.redrawForZoom = function() {
  var $$ = this,
    d3 = $$.d3,
    config = $$.config,
    zoom = $$.zoom,
    x = $$.x
  if (!config.zoom_enabled) {
    return
  }
  if ($$.filterTargetsToShow($$.data.targets).length === 0) {
    return
  }

  zoom.update()

  if (config.zoom_disableDefaultBehavior) {
    return
  }

  if ($$.isCategorized() && x.orgDomain()[0] === $$.orgXDomain[0]) {
    x.domain([$$.orgXDomain[0] - 1e-10, x.orgDomain()[1]])
  }

  $$.redraw({
    withTransition: false,
    withY: config.zoom_rescale,
    withSubchart: false,
    withEventRect: false,
    withDimension: false
  })

  if (d3.event && d3.event.sourceEvent && d3.event.sourceEvent.type === 'mousemove') {
    $$.cancelClick = true
  }
}
