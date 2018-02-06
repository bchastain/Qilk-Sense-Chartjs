var visualize = function($element, layout, _this, chartjsUtils) {
  var id  = layout.qInfo.qId + "_chartjs_stacked_bar";
  if(window.layout) {
    window.layout[id] = layout;
  } else {
    window.layout = {};
    window.layout[id] = layout;
  }

  var width_height = chartjsUtils.calculateMargin($element, layout);
  var width = width_height[0], height = width_height[1];

  //$element.empty();
  $element.html('<canvas id="' + id + '" width="' + width + '" height="'+ height + '"></canvas>');

  var palette = [];
  if (layout.colors == "auto") {
    palette = chartjsUtils.defineColorPalette(layout.color_selection);
  } else {
    palette = layout.custom_colors.split("-");
  }

  var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;

  var result_set = chartjsUtils.flattenData(qMatrix);
  var flatten_data = result_set[0];
  var dim2_unique_values = result_set[1];
  var dim2_unique_elem_nums = result_set[2];

  // Sort by Alphabetic order
  if (layout.sort) {
    dim2_unique_values.sort()
  }

  //Group by dimension1
  var data_grouped_by_dim1 = _.groupBy(flatten_data, 'dim1')

  //Create a container for formatted_data_array
  var formatted_data_array = [];
  formatted_data_array["dim1"] = [];
  formatted_data_array["dim1_elem"] = [];

  // Initialize arrays for dimension values
   formatted_data_array = chartjsUtils.initializeArrayWithZero(_.size(data_grouped_by_dim1), dim2_unique_values, formatted_data_array);

  // Store hypercube data to formatted_data_array
  formatted_data_array = chartjsUtils.storeHypercubeDataToArray(data_grouped_by_dim1, formatted_data_array);

  // Culculate cumulative sum when cumulative switch is on
  if (layout.cumulative) {
    formatted_data_array = chartjsUtils.addCumulativeValuesOnTwoDimensions(dim2_unique_values, formatted_data_array);
  }

  var dim1_totals = Array.apply(null,{length: formatted_data_array[dim2_unique_values[0]].length}).map(function() { return 0; });
  if (layout.normalized) {
    for (var i=0; i<dim2_unique_values.length; i++ ) {
      for (var j=0; j<dim1_totals.length; j++) {
        dim1_totals[j] += formatted_data_array[dim2_unique_values[i]][j];
      }
    }
  }

  // Create datasets for Chart.js rendering
  var datasets = [];
  for(var i=0; i<dim2_unique_values.length; i++ ) {
    var subdata = [];
    var color_id = i;
    if (layout.colors == "auto" && layout.color_selection == "twelve") {
      color_id = i % 12
    } else if (layout.colors == "auto" && layout.color_selection == "one-handred") {
      color_id = i % 100
    } else if (layout.colors == "custom") {
      color_id = i % palette.length
    } else {}
    subdata.label = dim2_unique_values[i];
    subdata.backgroundColor = "rgba(" + palette[color_id] + "," + layout.opacity + ")";
    subdata.data = formatted_data_array[dim2_unique_values[i]];
    subdata.orig_data = subdata.data;
    if (layout.normalized) {
      subdata.data = formatted_data_array[dim2_unique_values[i]].map(function(ele, idx) { return ele/dim1_totals[idx]; })
    }
    datasets.push(subdata);
  }

  var chart_data = {
      labels: formatted_data_array["dim1"],
      datasets: datasets
  };

  var ctx = document.getElementById(id);
  var myStackedBar = new Chart(ctx, {
      type: 'bar',
      data: chart_data,
      options: {
          title:{
              display: layout.title_switch,
              text: layout.title
          },
          legend: {
            display: (layout.legend_position == "hide") ? false : true,
            position: layout.legend_position,
            onClick: function(evt, legendItem) {
              var values = [];
              var dim = 1;
              if(dim2_unique_elem_nums[legendItem.text]<0) {
                //do nothing
              } else {
                values.push(dim2_unique_elem_nums[legendItem.text]);
                _this.selectValues(dim, values, true);
              }
            }
          },
          tooltips: {
              mode: 'label'
          },
          responsive: true,
          scales: {
              xAxes: [{
                  stacked: true,
                  scaleLabel: {
                    display: layout.datalabel_switch,
                    labelString: layout.qHyperCube.qDimensionInfo[0].qFallbackTitle
                  }
              }],
              yAxes: [{
                  stacked: true,
                  scaleLabel: {
                    display: layout.datalabel_switch,
                    labelString: layout.qHyperCube.qMeasureInfo[0].qFallbackTitle
                  },
                  ticks: {
                    beginAtZero: layout.begin_at_zero_switch,
                    callback: function(value, index, values) {
                      if (layout.normalized) {
                        return chartjsUtils.formatMeasure(value, layout, 0, true);
                      }
                      return chartjsUtils.formatMeasure(value, layout, 0);
                    }
                  }
              }]
          },
          tooltips: {
              mode: 'label',
              callbacks: {
                  label: function(tooltipItems, data) {
                      if ((layout.hidezero && tooltipItems.yLabel > 0) || !layout.hidezero) {
                        if (layout.tooltippct) {
                          return data.datasets[tooltipItems.datasetIndex].label +': ' + chartjsUtils.formatMeasure(tooltipItems.yLabel, layout, 0) + ' (' + (100*tooltipItems.yLabel/tooltipItems.yTotal).toFixed(1) + '%)';
                        } else {
                          return data.datasets[tooltipItems.datasetIndex].label +': ' + chartjsUtils.formatMeasure(tooltipItems.yLabel, layout, 0);
                        }
                        
                      }
                  }
              }
          },
          events: ["mousemove", "mouseout", "click", "touchstart", "touchmove", "touchend"],
          onClick: function(evt) {
            var activePoints = this.getElementsAtEvent(evt);
            if(activePoints.length > 0) {
              chartjsUtils.makeSelectionsOnDataPoints(formatted_data_array["dim1_elem"][activePoints[0]._index], _this);
            }
          }
      }
  });
}
