(function(dof, window, document){

var container, info, form,

    camera, scene, renderer, projector,

    cube, photo_camera, photo_lenses, target, camera_line, cameraGroup, man,

    mouseX = 45,
    mouseY = 45,

    mouseXOnMouseDown = 45,
    mouseYOnMouseDown = 45,

    windowHalfX = window.innerWidth / 2,
    windowHalfY = window.innerHeight / 2,

    is_dragging = false,
    cameraPosition = {x: 0, y: 0, z: 0},
    selected_object = null,
    camera_radius,

    dof_materials = [],
    photo_camera_materials = [],
    man_material = new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture( 'textures/man.png' ) } );;

for ( var i = 0; i < 6; i ++ ) {
    dof_materials.push( [ new THREE.MeshBasicMaterial( { color: 0x111122 * i, opacity: 0.5 } ) ] );
    photo_camera_materials.push( [ new THREE.MeshBasicMaterial( { color: 0x111111 * (i + 4)} ) ] );
}

var DEFAULT_DISTANCE = 3,
    DEFAULT_UNITS = 1,
    DEFAULT_RENDERER = 'CanvasRenderer',
    ARROW_SHIFT = 5;

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

    info.innerHTML = 'DoF '
        + (Math.round(frame_params.dt * 100) / 100) + 'm('
        + (Math.round(frame_params.dn * 100) / 100) + 'm &harr; '
        + (Math.round(frame_params.df * 100) / 100) + 'm) Hf ' +
        + (Math.round(frame_params.hf * 100) / 100) + 'm Frame '
        + (Math.round(frame_params.fw * 100) / 100) + '×'
        + (Math.round(frame_params.fh * 100) / 100) +'m';
}

function renderForm() {
    // form
    var html = ['<div><span>Camera</span> <select id="camera_id">'];
    for (var camera_id in dof.SENSOR_SIZES) {
        if (camera_id === '$')  {
            continue;
        }
        html.push('<option value="' + camera_id + '">' + camera_id + '</option>');
    }
    html.push('</select>');

    html.push('</div><div><span>Lenses</span> ');

    html.push('<select id="focal_length">');
    for (var focal_length in dof.FOCAL_LENGTHS) {
        if (focal_length === '$')  {
            continue;
        }
        html.push('<option value="' + dof.FOCAL_LENGTHS[focal_length] + '"' +
            (dof.FOCAL_LENGTHS['$'] === dof.FOCAL_LENGTHS[focal_length] ? ' selected="selected"': '')
            + '>' + focal_length + '</option>');
    }
    html.push('</select> ');

    html.push('<select id="f_stop">');
    for (var f_stop in dof.F_STOPS) {
        if (f_stop === '$')  {
            continue;
        }
        html.push('<option value="' + dof.F_STOPS[f_stop] + '"' +
            (dof.F_STOPS['$'] === dof.F_STOPS[f_stop] ? ' selected="selected"': '')
            + '>' + f_stop + '</option>');
    }
    html.push('</select>');

    html.push(' @ <select id="distance_m">');
    for (var i = 0; i < 100; i += 1) {
        html.push('<option value="' + i + '"' +
            (i === DEFAULT_DISTANCE ? ' selected="selected"': '')
            + '>' + i + 'm</option>');
    }
    html.push('</select>');

    html.push(' <select id="distance_cm">');
    for (var i = 0; i < 1; i+=0.01) {
        html.push('<option value="' + i + '">' + Math.round(i * 100) + 'cm</option>');
    }
    html.push('</select></div>');

    html.push('<div><label>Portrait <input type="checkbox" id="is_portrait"/></label>');

    html.push(' Cam.H <select id="camera_height">');
    for (var i = 2; i >= -2; i -= 0.1) {
        i = Math.round(i * 10) / 10;
        html.push('<option value="' + i + '"' +
            (i === 0 ? ' selected="selected"': '')
            + '>' + i + 'm</option>');
    }
    html.push('</select>');

    html.push(' Cam.L <select id="camera_left">');
    for (var i = 2; i >= -2; i -= 0.1) {
        i = Math.round(i * 10) / 10;
        html.push('<option value="' + i + '"' +
            (i === 0 ? ' selected="selected"': '')
            + '>' + i + 'm</option>');
    }
    html.push('</select>');

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

    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 1000 );
    camera_radius = Math.max(getDistance() * 2, 5, frame_params.df);
    camera.lookAt({x: 0, y: 0, z: 0});

    scene = new THREE.Scene();
    projector = new THREE.Projector();

    buildScene(frame_params, scene);

    renderer = new THREE[DEFAULT_RENDERER]();
    renderer.setSize( window.innerWidth, window.innerHeight );

    container.appendChild( renderer.domElement );

    //toggle(true);
    document.addEventListener('mousedown', function(event){
        toggle(true);
        is_dragging = true;
        mouseXOnMouseDown = event.clientX;
        mouseYOnMouseDown = event.clientY;
    }, false);

    document.addEventListener('mouseup', function(){
        toggle(false);
        is_dragging = false;
    }, false);

    function scrollHandler(event) {
        if (event.target.nodeName.match(/option|input|select|button|textarea/i)) {
            return;
        }
        var delta = event.wheelDelta ? event.wheelDelta / 120 : -event.detail / 3;
        camera_radius -= delta;
        if (camera_radius < 0) {
            camera_radius = 0;
        }
    }

    function uniformClickHandler (event){
        var vector = new THREE.Vector3( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5 );
        projector.unprojectVector( vector, camera );

        var ray = new THREE.Ray( camera.position, vector.subSelf( camera.position ).normalize() );

        var intersects = ray.intersectObjects(scene.objects);
        // selected_object
        selected_object = null;
        for (var i = 0; i < intersects.length; i++) {
            if (intersects[i].object.name) {
                selected_object = intersects[i].object.name;
                break;
            }
        }
    }

    function arrowHandler(event) {
        if (event.target.nodeName.match(/option|input|select|button|textarea/i)) {
            return;
        }
        switch (event.keyCode) {
            case 37:
                event.preventDefault();
                mouseX += ARROW_SHIFT;
                break;
            case 39:
                event.preventDefault();
                mouseX -= ARROW_SHIFT;
                break;
            case 38:
                event.preventDefault();
                mouseY += ARROW_SHIFT;
                break;
            case 40:
                event.preventDefault();
                mouseY -= ARROW_SHIFT;
                break;
        }
    }

    document.addEventListener('DOMMouseScroll', scrollHandler, false);
    document.addEventListener('mousewheel', scrollHandler, false);
    document.addEventListener('click', uniformClickHandler, false);
    document.addEventListener('keydown', arrowHandler, false);
}

function toggle (enable) {
    document[enable ? 'addEventListener': 'removeEventListener']( 'mousemove', onDocumentMouseMove, false );
    document[enable ? 'addEventListener': 'removeEventListener']( 'touchstart', onDocumentTouchStart, false );
    document[enable ? 'addEventListener': 'removeEventListener']( 'touchmove', onDocumentTouchMove, false );
}

function onDocumentMouseMove( event ) {
    mouseX += (event.clientX - mouseXOnMouseDown) / 50;
    mouseY += (event.clientY - mouseYOnMouseDown) / 50;
}

function onDocumentTouchStart( event ) {

    if ( event.touches.length == 1 ) {

        event.preventDefault();

        mouseX = event.touches[ 0 ].pageX - windowHalfX;
        mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

}

function onDocumentTouchMove( event ) {

    if ( event.touches.length == 1 ) {

        event.preventDefault();

        mouseX = event.touches[ 0 ].pageX - windowHalfX;
        mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

}

function animate() {
    requestAnimationFrame( animate );

    render();
}

function render() {
    camera.position.x = Math.sin(mouseX * (Math.PI / 180)) * camera_radius;
    camera.position.y = Math.cos(mouseY * (Math.PI / 180)) * camera_radius;
    camera.position.z = Math.cos(mouseX * (Math.PI / 180)) * camera_radius;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
}


init();
animate();

}(dof, window, document));