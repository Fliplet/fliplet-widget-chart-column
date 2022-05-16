(function() {
  window.ui = window.ui || {};
  ui.flipletCharts = ui.flipletCharts || {};

  Fliplet.Chart = Fliplet.Widget.Namespace('chart');

  function init() {
    Fliplet.Widget.instance('chart-column-1-1-0', function(data) {
      var chartId = data.id;
      var themeInstance = Fliplet.Themes.Current.getInstance();
      var themeValues = Object.assign({}, themeInstance.data.values);

      _.forEach(themeInstance.data.widgetInstances, function(widgetProp) {
        if (chartId === widgetProp.id) {
          Object.assign(themeValues, widgetProp.values);
        }
      });

      var $container = $(this);
      var inheritColor1 = true;
      var inheritColor2 = true;
      var refreshTimeout = 5000;
      var refreshTimer;
      var defaultColors = [
        '#00abd1', '#ed9119', '#7D4B79', '#F05865', '#36344C',
        '#474975', '#8D8EA6', '#FF5722', '#009688', '#E91E63'
      ];
      var deviceType = getDeviceType();
      var deviceColors = {
        Mobile: [],
        Tablet: [],
        Desktop: []
      };
      var chartInstance;

      var chartReady;
      var chartPromise = new Promise(function(resolve) {
        chartReady = resolve;
      });

      function sortData() {
        var sortMethod = 'alphabetical';
        var sortOrder = 'asc';

        if (data.dataSortOrder) {
          sortMethod = data.dataSortOrder.split('_')[0];
          sortOrder = data.dataSortOrder.split('_')[1];
        }

        var objArr = [];

        for (var i = 0, l = data.columns.length; i < l; i++) {
          objArr.push({
            column: data.columns[i],
            value: (data.values[i] !== undefined ? data.values[i] : 0)
          });
        }

        switch (sortMethod) {
          case 'alphabetical':
            objArr.sort(function(a, b) {
              var keyA = a.column;
              var keyB = b.column;

              // Compare the 2 dates
              if (keyA < keyB) return (sortOrder === 'asc' ? -1 : 1);
              if (keyA > keyB) return (sortOrder === 'asc' ? 1 : -1);

              return 0;
            });
            break;
          case 'timestamp':
            objArr.sort(function(a, b) {
              var keyA = moment(a.column);
              var keyB = moment(b.column);

              // Compare the 2 dates
              if (keyA.isBefore(keyB)) return (sortOrder === 'asc' ? -1 : 1);
              if (keyA.isAfter(keyB)) return (sortOrder === 'asc' ? 1 : -1);

              return 0;
            });
            break;
          case 'value':
          default:
            objArr.sort(function(a, b) {
              var valueA = a.value;
              var valueB = b.value;

              // Compare the 2 dates
              if (valueA < valueB) return (sortOrder === 'asc' ? -1 : 1);
              if (valueA > valueB) return (sortOrder === 'asc' ? 1 : -1);

              return 0;
            });
            break;
        }

        data.columns = [];
        data.values = [];

        for (i = 0, l = objArr.length; i < l; i++) {
          var column = sortMethod === 'timestamp'
            ? TD(objArr[i].column, { format: 'l' }) || objArr[i].column
            : objArr[i].column;

          data.columns.push(column);
          data.values.push(objArr[i].value);
        }
      }

      function refreshData() {
        if (typeof data.dataSourceQuery !== 'object') {
          data.columns = ['A', 'B', 'C'];
          data.values = [3, 1, 2];
          data.totalEntries = 6;

          return Promise.resolve();
        }

        // beforeQueryChart is deprecated
        return Fliplet.Hooks.run('beforeQueryChart', data.dataSourceQuery)
          .then(function() {
            return Fliplet.Hooks.run('beforeChartQuery', {
              config: data,
              id: data.id,
              uuid: data.uuid,
              type: 'column'
            });
          })
          .then(function() {
            if (_.isFunction(data.getData)) {
              var response = data.getData();

              if (!(response instanceof Promise)) {
                return Promise.resolve(response);
              }

              return response;
            }

            return Fliplet.DataSources.fetchWithOptions(data.dataSourceQuery);
          })
          .then(function(result) {
            // afterQueryChart is deprecated
            return Fliplet.Hooks.run('afterQueryChart', result)
              .then(function() {
                return Fliplet.Hooks.run('afterChartQuery', {
                  config: data,
                  id: data.id,
                  uuid: data.uuid,
                  type: 'column',
                  records: result
                });
              })
              .then(function() {
                data.entries = [];
                data.columns = [];
                data.values = [];
                data.totalEntries = 0;

                if (!result.dataSource.columns.length) {
                  return Promise.resolve();
                }

                switch (data.dataSourceQuery.selectedModeIdx) {
                  case 0:
                  default:
                    // Plot the data as is
                    data.name = data.dataSourceQuery.columns.value;
                    result.dataSourceEntries.forEach(function(row, i) {
                      if (!row[data.dataSourceQuery.columns.category] && !row[data.dataSourceQuery.columns.value]) {
                        return;
                      }

                      data.columns.push(row[data.dataSourceQuery.columns.category] || T('widgets.charts.column.category', { count: i + 1 }));
                      data.values.push(parseInt(row[data.dataSourceQuery.columns.value], 10) || 0);
                      data.totalEntries++;
                    });
                    break;
                  case 1:
                    // Summarize data
                    data.name = T('widgets.charts.column.title', { name: data.dataSourceQuery.columns.column });
                    result.dataSourceEntries.forEach(function(row) {
                      var value = row[data.dataSourceQuery.columns.column];

                      if (Array.isArray(value)) {
                        // Value is an array
                        value.forEach(function(elem) {
                          if (typeof elem === 'string') {
                            elem = $.trim(elem);
                          }

                          if (!elem) {
                            return;
                          }

                          data.entries.push(elem);

                          if (data.columns.indexOf(elem) === -1) {
                            data.columns.push(elem);
                            data.values[data.columns.indexOf(elem)] = 1;
                          } else {
                            data.values[data.columns.indexOf(elem)]++;
                          }
                        });
                      } else {
                        // Value is not an array
                        if (typeof value === 'string') {
                          value = $.trim(value);
                        }

                        if (!value) {
                          return;
                        }

                        data.entries.push(value);

                        if ( data.columns.indexOf(value) === -1 ) {
                          data.columns.push(value);
                          data.values[data.columns.indexOf(value)] = 1;
                        } else {
                          data.values[data.columns.indexOf(value)]++;
                        }
                      }
                    });

                    return Fliplet.Hooks.run('afterChartSummary', {
                      config: data,
                      id: data.id,
                      uuid: data.uuid,
                      type: 'column',
                      records: result
                    }).then(function() {
                      sortData();

                      // SAVES THE TOTAL NUMBER OF ROW/ENTRIES
                      data.totalEntries = _.sum(data.values);
                    });
                }

                return Promise.resolve();
              });
          })
          .catch(function(error) {
            return Promise.reject(error);
          });
      }

      function refreshChartInfo() {
        // Update total count
        $container.find('.total').html(TN(data.totalEntries));
        // Update last updated time
        $container.find('.updatedAt').html(TD(new Date(), { format: 'LTS' }));
      }

      function refreshChart() {
        // Retrieve chart object
        var chart = ui.flipletCharts[chartId];

        if (!chart) {
          return drawChart();
        }

        // Update x-axis categories
        chart.xAxis[0].categories = data.columns;
        // Update values
        chart.series[0].setData(data.values);
        refreshChartInfo();

        return Promise.resolve(chart);
      }

      function refresh() {
        if (refreshTimer) {
          clearTimeout(refreshTimer);
          refreshTimer = null;
        }

        return refreshData().then(function() {
          if (data.autoRefresh) {
            setRefreshTimer();
          }

          return refreshChart();
        }).catch(function(err) {
          if (data.autoRefresh) {
            setRefreshTimer();
          }

          return Promise.reject(err);
        });
      }

      function setRefreshTimer() {
        if (refreshTimer) {
          clearTimeout(refreshTimer);
        }

        refreshTimer = setTimeout(refresh, refreshTimeout);
      }

      function getThemeColor(colorKey) {
        return (themeValues && themeValues.hasOwnProperty(colorKey)) ? themeValues[colorKey] : Fliplet.Themes.Current.get(colorKey);
      }

      function getDeviceType() {
        if (Modernizr.mobile) {
          return '';
        } else if (Modernizr.tablet) {
          return 'Tablet';
        }

        return 'Desktop';
      }

      Fliplet.Studio.onEvent(function(event) {
        var eventDetail = event.detail;

        if (eventDetail && eventDetail.type === 'savingNewStyles') {
          if (eventDetail.widgetId && eventDetail.widgetId !== chartId) {
            return;
          }

          setThemeValues(eventDetail.data);
        }

        if (eventDetail && eventDetail.type === 'colorChange') {
          if (eventDetail.widgetId && eventDetail.widgetId !== chartId) {
            return;
          }

          var widgetColors = getWidgetColors(themeInstance.data.widgetInstances);

          if (!eventDetail.widgetMode && widgetColors[eventDetail.name + deviceType]) {
            return;
          }

          var colorIndex = null;

          switch (eventDetail.label) {
            case 'Highlight color':
              if (inheritColor1) {
                colorIndex = 0;
              }

              break;
            case 'Secondary color':
              if (inheritColor2) {
                colorIndex = 1;
              }

              break;
            case 'Chart color 1':
              inheritColor1 = false;

              break;
            case 'Chart color 2':
              inheritColor2 = false;

              break;
            default:
              break;
          }

          if (colorIndex === null) {
            var labelIndex = eventDetail.label.match(/[0-9]{1,2}/);

            if (labelIndex === null) {
              return;
            }

            colorIndex = labelIndex[0] - 1;
          }

          updateColors(colorIndex, eventDetail.color);
        }
      });

      // Set new colors for chart
      function setThemeValues(themeData) {
        themeInstance.data.values = themeData.values;
        themeInstance.data.widgetInstances = themeData.widgetInstances;

        var themeValue = themeInstance.data.values;
        var widgetValue = getWidgetColors(themeInstance.data.widgetInstances);

        themeValues = Object.assign(themeValue, widgetValue);

        var newColors = getColors();

        chartInstance.update({
          colors: newColors
        });
      }

      function getWidgetColors(widgets) {
        var widgetColors = {};

        if (!widgets) {
          return widgetColors;
        }

        widgets.forEach(function(widget) {
          if (widget.id === chartId) {
            Object.assign(widgetColors, widget.values);
          }
        });

        return widgetColors;
      }

      // Updates color for current device
      function updateColors(index, color) {
        var colors = getColors();

        colors[index] = color;
        chartInstance.update({
          colors: colors
        });
      }

      // Get color for current device
      function getColor(key, device) {
        if (!device) {
          return (themeValues && themeValues.hasOwnProperty(key)) && themeValues[key];
        }

        var color;

        if (themeValues && themeValues.hasOwnProperty(key + device)) {
          color = themeValues[key + device];
        } else if (device === 'Tablet') {
          color = 'inherit-mobile';
        } else {
          color = 'inherit-tablet';
        }

        if (color === 'inherit-tablet') {
          return getColor(key, 'Tablet');
        } else if (color === 'inherit-mobile') {
          return getColor(key, '');
        }

        return color;
      }

      // Generate colors for current device
      function generateColors() {
        var colors = defaultColors.slice();

        if (!Fliplet.Themes) {
          return colors;
        }

        colors.forEach(function(defaultColor, index) {
          var colorKey = 'chartColor' + (index + 1);
          var color = getColor(colorKey, deviceType) || defaultColor;

          colors[index] = color;
          inheritColor1 = colorKey !== 'chartColor1';
          inheritColor2 = colorKey !== 'chartColor2';

          if (colorKey === 'chartColor1' && inheritColor1) {
            colors[index] = getThemeColor('highlightColor') || color;
          } else if (colorKey === 'chartColor2' && inheritColor2) {
            colors[index] = getThemeColor('secondaryColor') || color;
          }
        });

        return colors;
      }

      // Get colors for device
      function getColors() {
        var device = deviceType ? deviceType : 'Mobile';

        deviceColors[device] = generateColors();

        return deviceColors[device];
      }

      function drawChart() {
        return new Promise(function(resolve, reject) {
          var chartColors = getColors();

          var chartOpt = {
            chart: {
              type: 'column',
              zoomType: 'xy',
              renderTo: $container.find('.chart-container')[0],
              style: {
                fontFamily: (Fliplet.Themes && Fliplet.Themes.Current.get('bodyFontFamily')) || 'sans-serif'
              },
              events: {
                load: function() {
                  refreshChartInfo();

                  if (data.autoRefresh) {
                    setRefreshTimer();
                  }
                },
                render: function() {
                  ui.flipletCharts[chartId] = this;
                  Fliplet.Hooks.run('afterChartRender', {
                    chart: ui.flipletCharts[chartId],
                    chartOptions: chartOpt,
                    id: data.id,
                    uuid: data.uuid,
                    type: 'column',
                    config: data
                  });
                  resolve(this);
                }
              }
            },
            colors: chartColors,
            title: {
              text: ''
            },
            subtitle: {
              text: ''
            },
            xAxis: {
              categories: data.columns,
              title: {
                text: data.xAxisTitle,
                enabled: data.xAxisTitle !== ''
              },
              crosshair: true,
              gridLineWidth: 0
            },
            yAxis: {
              min: 0,
              title: {
                text: data.yAxisTitle,
                enabled: data.yAxisTitle !== ''
              },
              labels: {
                enabled: false
              },
              gridLineWidth: 0
            },
            navigation: {
              buttonOptions: {
                enabled: false
              }
            },
            tooltip: {
              enabled: !data.showDataValues,
              headerFormat: '<b>{point.key}</b><br>',
              pointFormatter: function() {
                return [
                  '<span style="color:' + this.series.color + ';padding:0;border:none">',
                  T('widgets.charts.column.seriesName', { name: this.series.name }),
                  '</span>',
                  TN(this.y)
                ].join('');
              },
              shared: true,
              useHTML: true
            },
            plotOptions: {
              column: {
                pointPadding: 0.2,
                borderWidth: 0
              }
            },
            series: [{
              name: data.name,
              data: data.values,
              colorByPoint: true,
              dataLabels: {
                enabled: data.showDataValues,
                color: '#333333',
                align: 'center',
                formatter: function() {
                  return TN(this.y);
                }
              },
              events: {
                click: function() {
                  Fliplet.Analytics.trackEvent({
                    category: 'chart',
                    action: 'data_point_interact',
                    label: 'column'
                  });
                },
                legendItemClick: function() {
                  Fliplet.Analytics.trackEvent({
                    category: 'chart',
                    action: 'legend_filter',
                    label: 'column'
                  });
                }
              }
            }],
            legend: {
              enabled: data.showDataLegend,
              itemStyle: {
                width: '100%'
              }
            },
            credits: {
              enabled: false
            }
          };

          // Create and save chart object
          Fliplet.Hooks.run('beforeChartRender', {
            chartOptions: chartOpt,
            id: data.id,
            uuid: data.uuid,
            type: 'column',
            config: data
          }).then(function() {
            try {
              chartInstance = new Highcharts.Chart(chartOpt);
            } catch (e) {
              return Promise.reject(e);
            }
          }).catch(reject);
        });
      }

      var debouncedRedrawChart = _.debounce(function() {
        var colors = getColors();

        updateColors(colors);
      }, 100);

      $(window).on('resize', function() {
        deviceType = getDeviceType();
        debouncedRedrawChart();
      });

      $(this).translate();

      if (Fliplet.Env.get('interact')) {
        // TinyMCE removes <style> tags, so we've used a <script> tag instead,
        // which will be appended to <body> to apply the styles
        $($(this).find('.chart-styles').detach().html()).appendTo('body');
      } else {
        $(this).find('.chart-styles').remove();
      }

      Fliplet().then(refreshData).then(drawChart).catch(function(error) {
        console.error(error);
        setRefreshTimer();
      });

      Fliplet.Chart.add(chartPromise);

      chartReady({
        name: data.chartName,
        type: 'column',
        refresh: refresh
      });
    });
  }

  var debounceLoad = _.debounce(init, 500, { leading: true });

  Fliplet.Studio.onEvent(function(event) {
    if (event.detail.event === 'reload-widget-instance') {
      debounceLoad();
    }
  });

  init();
})();
