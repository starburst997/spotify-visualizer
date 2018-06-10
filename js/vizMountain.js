/*******************************************************************************
* 
*/
function VizMountain() {
  this.dampen = true;
  this.hasVariants = false;
  this.is3d = true;

  this.inc = 0.005;
  this.rotI = 0;
  this.hueOffset = 1;
  this.scene = new THREE.Scene();

  var wallLength = 20;
  var candidates = [];
  for (var i = 0; i < wallLength * wallLength; i++) {
    candidates.push(i);
  }

  this.parent = new THREE.Mesh();

  var centerOffset = wallLength / 2;
  var radiusStep = 0.1;
  var arcStep = 0.5;
  var r = 0;
  var a = 0;
  var x = 0;
  var y = 0;
  var i = 0;
  while (candidates.length > 0) {
    // prevent improbable infinite loop
    if (r > wallLength * 1.5) {
      break;
    }
    if (a > Math.PI * 2) {
      a -= (Math.PI * 2);
      r += radiusStep;
    } else {
      a += arcStep;
    }
    x = Math.round(Math.cos(a) * r + centerOffset - 0.5);
    y = Math.round(Math.sin(a) * r + centerOffset - 0.5);
    if (x >= 0 && x < wallLength && y >= 0 && y < wallLength) {
      i = x + y * wallLength;
      var index = candidates.indexOf(i);
      if (index > -1) {
        candidates.splice(index, 1);
        var o = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshBasicMaterial({ color: 0xffffff }));
        o.position.x = (x - centerOffset) * 1 + 0.5;
        o.position.y = (y - centerOffset) * 1 + 0.5;
        this.parent.add(o);
      }
    }
  }

  this.parent.rotation.x = Math.PI / -2;
  this.scene.add(this.parent);
}

VizMountain.prototype.resize = function() {
  this.camera = new THREE.PerspectiveCamera(75,
    window.innerWidth/window.innerHeight, 0.1, 1000);
}

VizMountain.prototype.draw = function(spectrum) {
  for (var i = 0; i < this.parent.children.length; i++) {
    var intensity = spectrum[Math.floor(i / 4)] / 255;
    var bar = this.parent.children[i];
    var scale = Math.pow(Math.max(0.01, intensity), 2) * 2;
    bar.scale.set(1, 1, scale);
    bar.position.z = scale / 2;
    var hue = Math.floor(i / 3 + this.hueOffset) % 360;
    var c = bigColorMap[hue * 100 + Math.floor(intensity * 99)]
    bar.material.color.setStyle(c);
    bar.material.transparent = true;
    bar.material.opacity = intensity;
  }

  // rotate camera
  this.rotI += this.inc;
  this.camera.position.x = Math.cos(this.rotI) * 14;
  this.camera.position.z = Math.sin(this.rotI) * 14;
  this.camera.position.y = 6;
  this.camera.lookAt({x: 0, y: 0, z: 0})

  this.hueOffset++;
  cv3d.render(this.scene, this.camera);
}