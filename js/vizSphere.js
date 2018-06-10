/*******************************************************************************
* sphere with pillars coming out
*/
function VizSphere(variant) {
  this.dampen = true;
  this.hasVariants = true;
  this.variants = [[false], [true]];
  this.is3d = true;

  this.scene = new THREE.Scene();
  this.vary(variant);
  this.inc = 0.005;
  this.rotI = 0;

  var tines = 9;
  var tineGap = 15;
  var wings = 15;

  var j = 0;
  for (var i = 0; i < tines; i++) {
    var vAngle = deg2rad(tineGap * Math.floor((i + 1) / 2));
    if (i % 2 == 0) {
      vAngle *= -1;
    }
    for (var r = 0; r < wings; r++) {
      var c = 0x00ff00 - (0x1900 * j);
      var o = this.wire(new THREE.BoxGeometry(1, 0.1, 0.1), 1.2, c);
      o.rotation.y = Math.PI * 2 / wings * r;
      o.rotation.z = vAngle;
      o.originalColor = c;
      this.scene.add(o);
    }
    j++;
  }
  var o = this.wire(new THREE.SphereGeometry(1, 32, 16), 1.05, 0xaaffaa);
  this.scene.add(o);
}

VizSphere.prototype.resize = function() {
  this.camera = new THREE.PerspectiveCamera(75,
    window.innerWidth/window.innerHeight, 0.1, 1000);
}

VizSphere.prototype.vary = function(variant) {
  this.variant = variant;
  this.varyBrightness = this.variants[variant][0];

  if (!this.varyBrightness) {
    for (var i = 0; i < this.scene.children.length - 1; i++) {
      var bar = this.scene.children[i];
      bar.children[1].material.color.setHex(bar.originalColor);
    }
  }
}

VizSphere.prototype.draw = function(spectrum) {
  if (this.varyBrightness) {
    var sphere = this.scene.children[this.scene.children.length - 1];
    var bright = Math.round(constrain(average(spectrum) * 2, 16, 255));
    var c =  bright | ((bright / 2 + 128) << 8) | (bright << 16);
    sphere.children[1].material.color.setHex(c);
  }
  for (var i = 0; i < this.scene.children.length - 1; i++) {
    var intensity = spectrum[Math.floor(i/2)] / 255;
    var scaleFactor = 0.25 + 0.5 * intensity;
    var distance = 2 + scaleFactor * 1.2 / 2;
    var bar = this.scene.children[i];
    var angle = bar.rotation.y;
    var vAngle = bar.rotation.z;
    bar.scale.set(scaleFactor, 1, 1);
    bar.position.x = distance*(Math.cos(angle)*Math.cos(vAngle));
    bar.position.y = distance*(Math.sin(vAngle));
    bar.position.z = distance*(-1*Math.sin(angle)*Math.cos(vAngle));
    if (this.varyBrightness) {
      var c = 0x00ff00 * Math.max(0.2, intensity);
      bar.children[1].material.color.setHex(c);
    }
  }

  // rotate camera
  this.rotI += this.inc;
  this.camera.position.x = Math.sin(this.rotI) * 5;
  this.camera.position.z = Math.cos(this.rotI) * 5;
  this.camera.position.y = 0.5;
  this.camera.lookAt({x: 0, y: 0, z: 0})

  cv3d.render(this.scene, this.camera);
}

VizSphere.prototype.wireframeColor = function(color) {
  return new THREE.MeshBasicMaterial( { color: color, side: THREE.BackSide } );  
}

VizSphere.prototype.wire = function(geometry, scalar, color) {
  var object = new THREE.Object3D();
  var sub1 = new THREE.Mesh(geometry,
    new THREE.MeshBasicMaterial({ color: 0x000000 }));
  var sub2 = new THREE.Mesh(geometry, this.wireframeColor(color));
  sub2.scale.multiplyScalar(scalar);
  object.add(sub1);
  object.add(sub2);
  return object;
}