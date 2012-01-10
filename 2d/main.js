(function(dof, window, document){

var parameters = {};

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
}

$('#camera-id,#focal,#aperture,#distance-m,#distance-cm,#background-m,#background-cm').change(function () {
    collectParameters();
    saveParameters();
    update();
});

$(function () {
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
        parameters.focal = 135;
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
        parameters.distance_m = 10;
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
    if (typeof parameters.distance_cm === "undefined") {
        parameters.distance_cm = 5;
    }
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
    if (typeof parameters.background_cm === "undefined") {
        parameters.background_cm = 0;
    }
    html = [];
    for (var i = 0; i < 1; i += 0.05) {
        html.push('<option value="' + i + '"' +
            (i === +parameters.background_cm ? ' selected="selected"': '')
            + '>' + Math.round(i * 100) + '</option>');
    }
    $('#background-cm').html(html.join(''));
    
    update();
});

}(dof, window, document));