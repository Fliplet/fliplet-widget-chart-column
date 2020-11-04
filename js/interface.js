var defaultChartHeight = {
  sm: '400px',
  md: '500px'
};
var defaultData = {
  dataSourceQuery: undefined,
  chartHeightSm: defaultChartHeight.sm,
  chartHeightMd: defaultChartHeight.md,
  showDataLegend: true,
  showDataValues: true,
  yAxisTitle: '',
  xAxisTitle: '',
  showTotalEntries: false,
  autoRefresh: false
};
var data = $.extend(defaultData, Fliplet.Widget.getData());

if (!data.dataSourceQuery && (data.dataSourceId || data.dataSourceColumn)) {
  // Migrate from pre-dataSourceQuery configuration
  data.dataSourceQuery = {
    dataSourceId: data.dataSourceId,
    columns: {
      column: data.dataSourceColumn
    },
    selectedModeIdx: 1
  };
}

var dsQueryData = {
  settings: {
    dataSourceLabel: 'Select a data source',
    modesDescription: 'How do you want your data to be plotted?',
    modes: [
      {
        label: 'Plot my data as it is',
        filters: false,
        columns: [
          {
            key: 'category',
            label: 'Select the column with the categories',
            type: 'single'
          },
          {
            key: 'value',
            label: 'Select the column with the values',
            type: 'single'
          }
        ]
      },
      {
        label: 'Summarize my data',
        filters: false,
        columns: [
          {
            key: 'column',
            label: 'Select a column',
            type: 'single'
          }
        ]
      }
    ]
  },
  accessRules: [
    {
      allow: 'all',
      enabled: true,
      type: [
        'select'
      ]
    }
  ],
  result: data.dataSourceQuery
};

var $dataSortOrder = $('#select-data-sort-order');

var dsQueryProvider = Fliplet.Widget.open('com.fliplet.data-source-query', {
  selector: '.data-source-query',
  data: dsQueryData,
  onEvent: function (event, data) {
    if (event === 'mode-changed') {
      switch (data.value) {
        case 0:
        default:
          $('.column-sort-order').addClass('hidden');
          break;
        case 1:
          $('.column-sort-order').removeClass('hidden');
          break;
      }
      return true; // Stop propagation up to studio or parent components
    }
  }
});

// Ensure chart heights have a correct default & units
function validateChartHeight(val, size) {
  if (typeof val !== 'string') {
    val = val.toString() || '';
  }

  if (!val) {
    // Set empty values to the default
    val = defaultChartHeight[size];
  }

  if (parseFloat(val) <= 0) {
    val = '0px';
  }

  if (/^\d+$/.test(val)) {
    // Value contains only numbers
    val = val + 'px';
  }

  return val;
}

function validateForm() {
  // Validate chart height
  $('#chart_height_sm').val(validateChartHeight($('#chart_height_sm').val()), 'sm');
  $('#chart_height_md').val(validateChartHeight($('#chart_height_md').val()), 'md');
}

function attachObservers() {
  dsQueryProvider.then(function(result){
    validateForm();
    
    Fliplet.Widget.save({
      // dataSourceId: parseInt($dataSource.val(), 10),
      // dataSourceColumn: $dataColumns.val(),
      dataSourceQuery: result.data,
      dataSortOrder: $dataSortOrder.find(':selected').val(),
      chartHeightSm: $('#chart_height_sm').val(),
      chartHeightMd: $('#chart_height_md').val(),
      showDataLegend: $('#show_data_legend').is(':checked'),
      showDataValues: $('#show_data_values').is(':checked'),
      yAxisTitle: $('#y_axis_title').val(),
      xAxisTitle: $('#x_axis_title').val(),
      showTotalEntries: $('#show_total_entries').is(':checked'),
      autoRefresh: $('#auto_refresh').is(':checked')
    }).then(function () {
      Fliplet.Widget.complete();
      Fliplet.Studio.emit('reload-page-preview');
    });
  });

  // Fired from Fliplet Studio when the external save button is clicked
  Fliplet.Widget.onSaveRequest(function () {
    dsQueryProvider.forwardSaveRequest();
  });
}

attachObservers();

// LOAD CHART SETTINGS
if (data) {
  $('#chart_height_sm').val(data.chartHeightSm);
  $('#chart_height_md').val(data.chartHeightMd);
  $('#show_data_legend').prop('checked', data.showDataLegend);
  $('#show_data_values').prop('checked', data.showDataValues);
  $('#y_axis_title').val(data.yAxisTitle);
  $('#x_axis_title').val(data.xAxisTitle);
  $('#show_total_entries').prop('checked', data.showTotalEntries);
  $('#auto_refresh').prop('checked', data.autoRefresh);
  if (data.dataSourceQuery && data.dataSourceQuery.selectedModeIdx === 1) {
    $('.column-sort-order').removeClass('hidden');
  }
  if (data.dataSortOrder) {
    $('#select-data-sort-order').val(data.dataSortOrder);
  }
}
