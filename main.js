(function(dof, window, document){

var container, info, form,

    camera, scene, renderer, projector,

    cube, photo_camera, photo_lenses, target, camera_line, cameraGroup, man,

    height = window.innerHeight,
	width  = window.innerWidth,

    cameraPosition = {x: 0, y: 0, z: 0},

    camera_radius,

    dof_materials = [],
    photo_camera_materials = [],
    man_material = new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture( 'textures/man.png' ) } ),

    controls;

for ( var i = 0; i < 6; i ++ ) {
    dof_materials.push( [ new THREE.MeshBasicMaterial( { color: 0x111122 * i, opacity: 0.5 } ) ] );
    photo_camera_materials.push( [ new THREE.MeshBasicMaterial( { color: 0x111111 * (i + 4)} ) ] );
}

var DEFAULT_DISTANCE = 3,
    DEFAULT_UNITS = 1,
    DEFAULT_RENDERER = 'CanvasRenderer';

function $(selector){
    return document.querySelector(selector);
}

function update() {
    var frame_params = dof.calculate(
        getDistance(),
        $('#camera_id').value,
        +$('#f_stop').value,
        +$('#focal_length').value,
        DEFAULT_UNITS,
        $('#is_portrait').checked
    );
    cameraPosition.y = +$('#camera_height').value;
    cameraPosition.x = +$('#camera_left').value;
    buildScene(frame_params, scene);
    camera_radius = Math.max(getDistance() * 2, 5, frame_params.df);
}

function buildScene(frame_params, scene) {
    if (cameraGroup) {
        scene.remove(cameraGroup);
    }

    var is_portrait = $('#is_portrait').checked;

    cameraGroup = new THREE.Mesh(new THREE.CubeGeometry(), new THREE.MeshBasicMaterial({color: 0xe0e0e0, opacity: 0}));
    cameraGroup.position = cameraPosition;

    cube = new THREE.Mesh( new THREE.CubeGeometry( frame_params.fw, frame_params.fh, frame_params.dt, 1, 1, 1, dof_materials ), new THREE.MeshFaceMaterial() );
    cube.position.z = frame_params.s - frame_params.dn - frame_params.dt / 2;
    //cube.overdraw = true;
    cameraGroup.add( cube );

    target = new THREE.Mesh( new THREE.CubeGeometry( frame_params.fw * 0.99, frame_params.fh * 0.99, 0.001, 1, 1, 1, dof_materials ), new THREE.MeshFaceMaterial() );
    //target.overdraw = true;
    cameraGroup.add(target);

    photo_camera = new THREE.Mesh( new THREE.CubeGeometry( 0.3, 0.2, 0.1, 1, 1, 1, photo_camera_materials ), new THREE.MeshFaceMaterial() );
    //photo_camera.overdraw = true;
    photo_camera.position.z = frame_params.s;
    if (is_portrait) {
        photo_camera.rotation.z = Math.PI / 2;
    }
    cameraGroup.add(photo_camera);

    photo_lenses = new THREE.Mesh( new THREE.CubeGeometry( 0.1, 0.1, 0.2, 1, 1, 1, photo_camera_materials ), new THREE.MeshFaceMaterial() );
    //photo_lenses.overdraw = true;
    photo_lenses.position.z = -0.15;
    photo_lenses.name = 'camera';

    photo_camera.add(photo_lenses);

    camera_line = new THREE.Mesh( new THREE.CubeGeometry( 0.01, 0.01, frame_params.s - 0.2, 1, 1, 1), new THREE.MeshBasicMaterial( { color: 0x555555, opacity: 0.5 } ) );
    camera_line.position.z -= frame_params.s / 2 + 0.15;
    camera_line.name = 'camera';

    photo_camera.add(camera_line);

    scene.add(cameraGroup);

    man = new THREE.Mesh( new THREE.CubeGeometry( 0.60, 1.8, 0.001, 1, 1, 1, man_material ), new THREE.MeshFaceMaterial() );
    man.name = "man";
    scene.add(man);

    info.innerHTML = 'DoF&nbsp;'
        + (Math.round(frame_params.dt * 100) / 100) + 'm('
        + (Math.round(frame_params.dn * 100) / 100) + 'm &harr; '
        + (Math.round(frame_params.df * 100) / 100) + 'm) Hf&nbsp;' +
        + (Math.round(frame_params.hf * 100) / 100) + 'm Frame&nbsp;'
        + (Math.round(frame_params.fw * 100) / 100) + '×'
        + (Math.round(frame_params.fh * 100) / 100) +'m';
}

function renderForm() {
    // form
    var html = ['<div><label><span>Camera</span> <select id="camera_id">'];
    for (var camera_id in dof.SENSOR_SIZES) {
        if (camera_id === '$')  {
            continue;
        }
        html.push('<option value="' + camera_id + '">' + camera_id + '</option>');
    }
    html.push('</select></label>');

    html.push('</div><div><label><span>Focal</span> ');

    html.push('<select id="focal_length">');
    for (var focal_length in dof.FOCAL_LENGTHS) {
        if (focal_length === '$')  {
            continue;
        }
        html.push('<option value="' + dof.FOCAL_LENGTHS[focal_length] + '"' +
            (dof.FOCAL_LENGTHS['$'] === dof.FOCAL_LENGTHS[focal_length] ? ' selected="selected"': '')
            + '>' + focal_length + '</option>');
    }
    html.push('</select></label> ');

    html.push('</div>');
    html.push('<div>');

    html.push('<label><span>Aperture</span> <select id="f_stop">');
    for (var f_stop in dof.F_STOPS) {
        if (f_stop === '$')  {
            continue;
        }
        html.push('<option value="' + dof.F_STOPS[f_stop] + '"' +
            (dof.F_STOPS['$'] === dof.F_STOPS[f_stop] ? ' selected="selected"': '')
            + '>' + f_stop + '</option>');
    }
    html.push('</select></label>');

    html.push('</div>');
    html.push('<div>');

    html.push(' <label><span>Distance</span> <select id="distance_m">');
    for (var i = 0; i < 100; i += 1) {
        html.push('<option value="' + i + '"' +
            (i === DEFAULT_DISTANCE ? ' selected="selected"': '')
            + '>' + i + 'm</option>');
    }
    html.push('</select></label>');

    html.push('<label> <select id="distance_cm">');
    for (var i = 0; i < 1; i+=0.01) {
        html.push('<option value="' + i + '">' + Math.round(i * 100) + 'cm</option>');
    }
    html.push('</select></label>');

    html.push('</div>');
    html.push('<div>');

    html.push('<label><span>Portrait</span> <input type="checkbox" id="is_portrait"/></label>');

    html.push('</div>');
    html.push('<div>');

    html.push(' <label><span>Cam.H</span> <select id="camera_height">');
    for (var i = 2; i >= -2; i -= 0.1) {
        i = Math.round(i * 10) / 10;
        html.push('<option value="' + i + '"' +
            (i === 0 ? ' selected="selected"': '')
            + '>' + i + 'm</option>');
    }
    html.push('</select></label>');

    html.push(' <label>Cam.L <select id="camera_left">');
    for (var i = 2; i >= -2; i -= 0.1) {
        i = Math.round(i * 10) / 10;
        html.push('<option value="' + i + '"' +
            (i === 0 ? ' selected="selected"': '')
            + '>' + i + 'm</option>');
    }
    html.push('</select></label>');

    html.push('</div>');

    form = $('#form');
    form.innerHTML = html.join('');

    var targets = form.querySelectorAll('select, input');

    for (var i = 0; i < targets.length; i++) {
        targets[i].addEventListener('change', update, false);
        targets[i].addEventListener('keypress', update, false);
        targets[i].addEventListener('keyup', update, false);
    }
}

function getDistance() {
    return +$('#distance_m').value + +$('#distance_cm').value;
}

function init() {

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    info = $('#dof');

    renderForm();
    var frame_params = dof.calculate(
        getDistance(),
        $('#camera_id').value,
        +$('#f_stop').value,
        +$('#focal_length').value,
        DEFAULT_UNITS,
        $('#is_portrait').checked
    );

    camera_radius = Math.max(getDistance() * 2, 5, frame_params.df);

    camera = new THREE.PerspectiveCamera( 50, width / height, 1, 1000 );
    camera.position.z = camera_radius;
    camera.position.x = camera_radius;
    camera.position.y = camera_radius;
    camera.lookAt({x: 0, y: 0, z: 0});

    scene = new THREE.Scene();
    projector = new THREE.Projector();

    buildScene(frame_params, scene);

    renderer = new THREE[DEFAULT_RENDERER]();
    renderer.setSize( width, height );

    container.appendChild( renderer.domElement );

    controls = new THREE.TrackballControls(camera, renderer.domElement);

    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.2;

    controls.noZoom = false;
    controls.noPan = false;

    controls.staticMoving = false;
    controls.dynamicDampingFactor = 0.3;

    controls.minDistance = camera_radius * 0.1;
    controls.maxDistance = camera_radius * 100;

    controls.keys = [ 65, 83, 68 ];

    window.addEventListener('resize', resize, false);

    $('#form_wrapper').addEventListener('click', function (event) {
        event.stopPropagation();
    }, false);

    document.addEventListener('click', function () {
        $('#form_wrapper').style.display = 'none';
    }, false);

    $('#close').addEventListener('click', function () {
        $('#form_wrapper').style.display = 'none';
    }, false);

    $('#camera_view').addEventListener('click', function (event) {
        camera.position.x = photo_camera.position.x;
        camera.position.y = photo_camera.position.y;
        camera.position.z = photo_camera.position.z;

        camera.lookAt(cube.position);

        event.stopPropagation();
    }, false);

    $('#toggle').addEventListener('click', function (event) {
        $('#form_wrapper').style.display = '';
        event.stopPropagation();
    }, false);
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;

    renderer.setSize( width, height );

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    controls.screen.width = width;
    controls.screen.height = height;

    camera.radius = ( width + height ) / 4;
}

function animate() {
    requestAnimationFrame( animate );

    render();
}

function render() {
    controls.update();
    renderer.clear();
    renderer.render(scene, camera);
}

init();
animate();

}(dof, window, document));