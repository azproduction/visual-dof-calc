(function(dof, window, document){

var parameters = {}, $chart, $chart2, $chart3, plot, plot2, plot3;

var DELTA_MAX = 2.2;
var DELTA_MIN = 0.4;

function round2gidits(value) {
    return Math.round(value * 100) / 100;
}

function loadParameters() {
    try {
        if (localStorage && localStorage['parameters']) {
            parameters = JSON.parse(localStorage['parameters']);
        }
    } catch (e) {}
}

function saveParameters() {
    try {
        if (localStorage) {
             localStorage['parameters'] = JSON.stringify(parameters);
        }
    } catch (e) {}
}

function collectParameters() {
    parameters.camera_id = $('#camera-id').val();
    parameters.focal = $('#focal').val();
    parameters.aperture = $('#aperture').val();
    parameters.distance_m = $('#distance-m').val();
    parameters.distance_cm = $('#distance-cm').val();
    parameters.background_m = $('#background-m').val();
    parameters.background_cm = $('#background-cm').val();
}

function setupChart() {
    $chart = $("#chart");
    $chart2 = $("#chart-2");
    $chart3 = $("#chart-3");
    var options = {
        series: {
            lines: { show: true }
        },
        crosshair: { mode: "x" },
        yaxes: [
            {},
            {
                alignTicksWithAxis: 0,
                position: "left",
                color: "#00f"
            },
            {
                alignTicksWithAxis: 0,
                position: "right",
                color: "#f00"
            }
        ],
        xaxes: {},
        zoom: {
          interactive: true,
          trigger: "dblclick"
        },

        pan: {
          interactive: true,
          cursor: "move",      // CSS mouse cursor value used when dragging, e.g. "pointer"
          frameRate: 20
        },
        grid: { hoverable: true, autoHighlight: false },
        shadowSize: 0
    };

    plot = $.plot($chart, [], options);
    plot2 = $.plot($chart2, [], options);
    plot3 = $.plot($chart3, [], options);

    var updateLegendTimeout = null;
    var latestPosition = null;

    function updateLegend($chart, plot) {
        updateLegendTimeout = null;
        var legends = $chart.find('.legendLabel');

        var pos = latestPosition;

        var axes = plot.getAxes();
        if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max ||
            pos.y < axes.yaxis.min || pos.y > axes.yaxis.max)
            return;

        var i, j, dataset = plot.getData();
        for (i = 0; i < dataset.length; ++i) {
            var series = dataset[i];

            // find the nearest points, x-wise
            for (j = 0; j < series.data.length; ++j)
                if (series.data[j][0] > pos.x)
                    break;

            // now interpolate
            var y, p1 = series.data[j - 1], p2 = series.data[j];
            if (p1 == null && p2 && p2[1])
                y = p2[1];
            else if (p2 == null && p1 && p1[1])
                y = p1[1];
            else if (p1 && p2)
                y = p1[1] + (p2[1] - p1[1]) * (pos.x - p1[0]) / (p2[0] - p1[0]);

            legends.eq(i).text(series.label.replace(/=.*/, "= " + (y || 0).toFixed(2) + 'm'));
        }
    }

    $chart.bind("plothover",  function (event, pos, item) {
        latestPosition = pos;
        if (!updateLegendTimeout)
            updateLegendTimeout = setTimeout(function () {
                updateLegend($chart, plot);
            }, 50);
    });

    $chart2.bind("plothover",  function (event, pos, item) {
        latestPosition = pos;
        if (!updateLegendTimeout)
            updateLegendTimeout = setTimeout(function () {
                updateLegend($chart2, plot2);
            }, 50);
    });

    $chart3.bind("plothover",  function (event, pos, item) {
        latestPosition = pos;
        if (!updateLegendTimeout)
            updateLegendTimeout = setTimeout(function () {
                updateLegend($chart3, plot3);
            }, 50);
    });
}

function update() {
    var frame_params = dof.calculate(
        +parameters.distance_m + +parameters.distance_cm,
        parameters.camera_id,
        +parameters.aperture,
        +parameters.focal,
        1,
        false,
        +parameters.background_m + +parameters.background_cm
    );
    
    $('#frame-bp').text(round2gidits(frame_params.bp));
    $('#frame-dt').text(round2gidits(frame_params.dt));
    $('#frame-fw').text(round2gidits(frame_params.fw));
    $('#frame-fh').text(round2gidits(frame_params.fh));

    $('#frame-dn').text(round2gidits(frame_params.dt * frame_params.pdn / 100));
    $('#frame-df').text(round2gidits(frame_params.dt * frame_params.pdf / 100));

    var x = [], y = [], distance = [], data, chart_params, z = [], b = [];
    for (var aperture = 1; aperture < 22; aperture += 0.1) {
        chart_params = dof.calculate(
            +parameters.distance_m + +parameters.distance_cm,
            parameters.camera_id,
            aperture,
            +parameters.focal,
            1,
            false,
            +parameters.background_m + +parameters.background_cm
        );
        if (chart_params.dn < frame_params.dn * DELTA_MIN || chart_params.df < frame_params.df * DELTA_MIN) {
            continue;
        }
        x.push([aperture, chart_params.dn]);
        y.push([aperture, chart_params.df]);
        z.push([aperture, chart_params.dt]);
        b.push([aperture, chart_params.bp]);
        distance.push([aperture, +parameters.distance_m + +parameters.distance_cm]);
        if (chart_params.dn > frame_params.dn * DELTA_MAX || chart_params.df > frame_params.df * DELTA_MAX) {
            break;
        }
    }

    data = makeData('a', x, y, z, b, distance);

    plot.setData(data);
    plot.setupGrid();
    plot.draw();

    x = [];
    y = [];
    distance = [];
    z = [];
    b = [];
    for (var target = 1; target < 30; target += 0.5) {
        chart_params = dof.calculate(
            target,
            parameters.camera_id,
            +parameters.aperture,
            +parameters.focal,
            1,
            false,
            +parameters.background_m + +parameters.background_cm
        );
        if (chart_params.dn < frame_params.dn * DELTA_MIN || chart_params.df < frame_params.df * DELTA_MIN) {
            continue;
        }
        x.push([target, chart_params.dn]);
        y.push([target, chart_params.df]);
        z.push([target, chart_params.dt]);
        b.push([target, chart_params.bp]);
        distance.push([target, target]);
        if (chart_params.dn > frame_params.dn * DELTA_MAX || chart_params.df > frame_params.df * DELTA_MAX) {
            break;
        }
    }

    data = makeData('d', x, y, z, b, distance);

    plot2.setData(data);
    plot2.setupGrid();
    plot2.draw();

    x = [];
    y = [];
    distance = [];
    z = [];
    b = [];
    for (var focal = +parameters.focal - 50; focal <= +parameters.focal + 50; focal += 5) {
        chart_params = dof.calculate(
            +parameters.distance_m + +parameters.distance_cm,
            parameters.camera_id,
            +parameters.aperture,
            focal,
            1,
            false,
            +parameters.background_m + +parameters.background_cm
        );
        x.push([focal, chart_params.dn]);
        y.push([focal, chart_params.df]);
        z.push([focal, chart_params.dt]);
        b.push([focal, chart_params.bp]);
        distance.push([focal, +parameters.distance_m + +parameters.distance_cm]);
    }

    data = makeData('f', x, y, z, b, distance);

    plot3.setData(data);
    plot3.setupGrid();
    plot3.draw();
}

function makeData(argumentName, x, y, z, b, distance) {
    return [{ data: x, id: 'dof_near', label: "dof_near(" + argumentName + ") = -0.00", color: "#555"},
            { data: y, id: 'dof_far', label: "dof_far(" + argumentName + ") = -0.00", color: "#555", fillBetween: 'dof_near', lines: { show: true, fill: 0.2 }},
            { data: distance, label: "distance = -0.00", color: "#555", lines: {lineWidth: 1, show: true} },
            { data: b, label: "bokeh(" + argumentName + ") = -0.00", color: "#55f", yaxis: 2 },
            { data: z, label: "dof(" + argumentName + ") = -0.00", color: "#f22", yaxis: 3  } ];
}

$(function () {

    $('#camera-id,#focal,#aperture,#distance-m,#distance-cm,#background-m,#background-cm').change(function () {
        collectParameters();
        saveParameters();
        update();
    });

    loadParameters();
    // Render form
    var html, step;
    
    // Cameras
    html = [];
    for (var camera_id in dof.SENSOR_SIZES) {
        if (camera_id === '$')  {
            continue;
        }
        html.push('<option value="' + camera_id + '"' +
            (parameters.camera_id === camera_id ? ' selected="selected"': '')
            + '>' + camera_id + '</option>');
    }
    $('#camera-id').html(html.join(''));

    // Focal
    if (typeof parameters.focal === "undefined") {
        parameters.focal = 50;
    }
    html = [];
    for (var focal_length in dof.FOCAL_LENGTHS) {
        if (focal_length === '$')  {
            continue;
        }
        html.push('<option value="' + dof.FOCAL_LENGTHS[focal_length] + '"' +
            (+parameters.focal === dof.FOCAL_LENGTHS[focal_length] ? ' selected="selected"': '')
            + '>' + dof.FOCAL_LENGTHS[focal_length] + '</option>');
    }
    $('#focal').html(html.join(''));

    // Aperture
    if (typeof parameters.aperture === "undefined") {
        parameters.aperture = 4;
    }
    html = [];
    for (var f_stop in dof.F_STOPS) {
        if (f_stop === '$')  {
            continue;
        }
        html.push('<option value="' + dof.F_STOPS[f_stop] + '"' +
            (+parameters.aperture === dof.F_STOPS[f_stop] ? ' selected="selected"': '')
            + '>' + f_stop.replace('f/', '') + '</option>');
    }
    $('#aperture').html(html.join(''));

    // Distance m
    if (typeof parameters.distance_m === "undefined") {
        parameters.distance_m = 5;
    }
    html = [];
    step = 1;
    for (var i = 0; i <= 500; i += step) {
        html.push('<option value="' + i + '"' +
            (i === +parameters.distance_m ? ' selected="selected"': '')
            + '>' + i + '</option>');
        if (i === 30) {
            step = 5;
        }

        if (i === 100) {
            step = 20;
        }
    }
    $('#distance-m').html(html.join(''));

    // Distance cm
    html = [];
    for (var i = 0; i < 1; i += 0.05) {
        html.push('<option value="' + i + '"' +
            (i === +parameters.distance_cm ? ' selected="selected"': '')
            + '>' + Math.round(i * 100) + '</option>');
    }
    $('#distance-cm').html(html.join(''));

    // background m
    if (typeof parameters.background_m === "undefined") {
        parameters.background_m = 1e6;
    }
    html = [];
    step = 1;
    html.push('<option value="' + 1e6 + '"' +
            (1e6 === +parameters.background_m ? ' selected="selected"': '')
            + '>Inf.</option>');
    for (var i = 0; i <= 500; i += step) {
        html.push('<option value="' + i + '"' +
            (i === +parameters.background_m ? ' selected="selected"': '')
            + '>' + i + '</option>');
        if (i === 30) {
            step = 5;
        }

        if (i === 100) {
            step = 20;
        }
    }
    $('#background-m').html(html.join(''));

    // background cm
    html = [];
    for (var i = 0; i < 1; i += 0.05) {
        html.push('<option value="' + i + '"' +
            (i === +parameters.background_cm ? ' selected="selected"': '')
            + '>' + Math.round(i * 100) + '</option>');
    }
    $('#background-cm').html(html.join(''));

    setupChart();

    update();
});

}(dof, window, document));