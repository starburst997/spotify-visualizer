var cv;
var ctx;
var cv3d;

var visualizers = [];
var currentViz = 0;
var initialized = false;

// for graphics processing
var animationHandle;
var shortestSide, longestSide, hypotenuse;
var allRotate = 0;
var rotateAmount, centerRadius, bandWidth, heightMultiplier;
var bigColorMap = [];
var bigColorMap2 = [];

// for audio processing
var analyseInterval = 1000 / 30;
var analyseHandle;
var fftSize = 256;
// although the actual spectrum size is half the FFT size,
// the highest frequencies aren't really important here
var bandCount = Math.round(fftSize / 3);
var audioCtx;
var source;
var analyser;
var spectrum;
var lastVolumes = [];

/*******************************************************************************
* sets up mic/line-in input, and the application loop
*/
function setup() {
  navigator.getUserMedia = (navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia ||
                            navigator.msGetUserMedia);

  if (navigator.getUserMedia) {
    navigator.getUserMedia({video: false, audio: true},
      // success callback
      function(stream) {
        // initialize nodes
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();

        // set node properties and connect
        analyser.smoothingTimeConstant = 0.2;
        analyser.fftSize = fftSize;
        spectrum = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);

        // set up canvases and renderers
        cv = document.getElementById("canvas");
        cv3d = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true/*, preserveDrawingBuffer: true*/ });

        // set up visualizer list
        visualizers.push(new VizRadialArcs(0));
        visualizers.push(new VizRadialBars(0));
        visualizers.push(new VizFlyout(0));
        visualizers.push(new VizSunburst(0));
        visualizers.push(new VizBoxes(0));
        visualizers.push(new VizImage());
        visualizers.push(new VizSphere(0));
        visualizers.push(new VizMountain());
        visualizers.push(new VizSpikes());

        // misc setup
        for (var i = 0; i < bandCount; i++) { lastVolumes.push(0); }
        rotateAmount = (Math.PI * 2.0) / bandCount;
        generateColors();
        initialized = true;

        recalculateSizes();
        setInputListeners();
        audioHandle = setInterval(function() { analyse(); }, analyseInterval);
        animationHandle = requestAnimationFrame(visualize);
      },

      // error callback
      function(e) {
        console.log(e);
        alertError();
      }
    );
  } else {
    alertError();
  }
}

/*******************************************************************************
* converts the audio stream into spectrum data, called on an interval
*/
function analyse() {
  analyser.getByteFrequencyData(spectrum);
  // dampen falloff for some
  if (visualizers[currentViz].dampen == true) {
    for (var i = 0; i < spectrum.length; i++) {
      if (lastVolumes[i] > spectrum[i]) {
        spectrum[i] = (spectrum[i] + lastVolumes[i]) / 2;
      }
    }
  }
}

/*******************************************************************************
* called each audio frame, manages rendering of visualization
*/
var last = -1;
function visualize() {
  if (currentViz != last) {
      document.body.setAttribute("class", 'lastViz' + last + ' viz' + currentViz);
      last = currentViz;
  }

  animationHandle = requestAnimationFrame(visualize);
  visualizers[currentViz].draw(spectrum);
}

/*******************************************************************************
* varies the current visualization
*/
function vary() {
  if (visualizers[currentViz].hasVariants) {
    var variant = visualizers[currentViz].variant;
    variant++;
    if (variant >= visualizers[currentViz].variants.length) {
      variant = 0;
    }
    visualizers[currentViz].vary(variant);
    visualizers[currentViz].resize();
  }
}

/*******************************************************************************
* set key handler, and window resize handler
*/
function setInputListeners() {
  document.body.onkeyup = function(e) { 
    var ev = e || event;
    if (ev.keyCode >= 49 && ev.keyCode < 49 + visualizers.length) {
      currentViz = ev.keyCode - 49;
      recalculateSizes();
    } else if (ev.keyCode == 187 || ev.keyCode == 61) {
      vary();
    }
    //console.log(ev.keyCode);
  }
  document.body.onclick = function() {
    //document.getElementById('bg').style.backgroundImage = "url('img/bg"+(currentViz % 2)+".jpg')";
    changeViz(currentViz + 1);
  }
  window.onresize = function() { recalculateSizes(); };

  // Change every 2min
  /*setInterval(function() {
    changeViz(currentViz + 1);
  }, 2 * 60 * 1000);*/
}

function changeViz(viz) {
 
    var is3d = visualizers[currentViz].is3d;
    var current = document.getElementById(is3d ? 'canvas3d' : 'canvas');
    currentViz = viz % visualizers.length;
    
    var transition = document.getElementById('transition');
    var destCtx = transition.getContext('2d');
    
    if (is3d) {
        /*destCtx.clearRect(0,0,transition.width, transition.height);

        var gl = cv3d.getContext();
        var width = cv3d.domElement.width;
        var height = cv3d.domElement.height;

        var size = width * height * 4;
        var pixels = new Uint8Array(size);
        var image = destCtx.createImageData(width, height);

        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        for (var i = 0; i < size; i++) {
            image.data[i] = pixels[i];
        }

        destCtx.putImageData(image, 0, 0);*/

        destCtx.clearRect(0,0,transition.width, transition.height);
        destCtx.drawImage(current, 0, 0);

    } else {
        destCtx.clearRect(0,0,transition.width, transition.height);
        destCtx.drawImage(current, 0, 0);
    }
    
    if (visualizers[currentViz].is3d) {
        document.getElementById("canvas").className = "hidden";
        document.getElementById("canvas3d").className = "";
    } else {
        document.getElementById("canvas3d").className = "hidden";
        document.getElementById("canvas").className = "";
    }

    current = document.getElementById(visualizers[currentViz].is3d ? 'canvas3d' : 'canvas');

    transition.style.opacity = 1.0;    
    current.style.opacity = 0.0;
    
    var transitionInterval;
    transitionInterval = setInterval(function() {
        transition.style.opacity = parseFloat(transition.style.opacity) - 0.01;
        current.style.opacity = parseFloat(current.style.opacity) + 0.01;
        if (transition.style.opacity <= 0) {
            clearInterval(transitionInterval);
        }
    }, 1/60 * 1000);
    
    visualizers[currentViz].resize();
}

/*******************************************************************************
* various utility functions
*/
function alertError() {
  alert("Unable to start visualization. Make sure you're using Chrome, " +
    "Firefox, or Edge with a microphone set up, and that you allow the page to "
    + "access the microphone.");
}

function generateColors() {
  for (var hue = 0; hue < 360; hue++) {
    for (var brightness = 0; brightness < 100; brightness++) {
      var color = HSVtoRGB(hue / 360, 1, brightness / 100, true, false);
      bigColorMap.push(color);
      var color2 = HSVtoRGB(hue / 360, 1, brightness / 100, false, true);
      bigColorMap2.push(color2);
    }
  }
}

function recalculateSizes() {
  if (initialized) {
    var w = window.innerWidth;
    var h = window.innerHeight;
  
    // switch between 2D/3D canvases
    cv3d.setSize(w, h);
    cv.width = w;
    cv.height = h;
    ctx = cv.getContext("2d");
    
    var transition = document.getElementById('transition');
    transition.width = w;
    transition.height = h;
    transition.style.width  = w + 'px';
    transition.style.height = h + 'px';

    shortestSide = Math.min(w, h);
    longestSide = Math.max(w, h);
    hypotenuse = Math.sqrt(w * w + h * h);
    centerRadius = 85.0 / 800 * shortestSide;
    heightMultiplier = 1.0 / 800 * shortestSide;
    bandWidth = Math.PI * 2 * centerRadius / bandCount;
    visualizers[currentViz].resize();
  }
}

function constrain(input, min, max) {
  if (input < min) {
    input = min;
  } else if (input > max) {
    input = max;
  }
  return input;
}

function average(array) {
    var sum = 0; 
    for (var i = 0; i < array.length; i++) {
        sum += array[i];
    }
    return sum / array.length;
}

// TODO: fix this function
function reduceBuckets(input, size) {
  var output = [];
  var increment = input.length / size;
  for (var i = 0; i < size; i++) {
    var band = 0;
    var lower = increment * i;
    var lowerI = Math.floor(lower);
    var higher = increment * (i + 1)
    var higherI = Math.ceil(higher)
    for (var j = lowerI; j < higherI; j++) {
      if (i == lowerI) {
        band += (1-(lower - lowerI)) * input[i];
      }
      else if (i == higherI - 1) {
        band += (1-(higherI - higher)) * input[i];
      }
      else {
        band += input[i];
      }
    }
    band /= increment;
    output.push(band);
  }
  return output;
}

// http://stackoverflow.com/a/5624139
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

// http://stackoverflow.com/a/17243070
function HSVtoRGB(h, s, v, hex, separate) {
    var r, g, b, i, f, p, q, t;
    if (h && s === undefined && v === undefined) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    r = Math.floor(r * 255);
    g = Math.floor(g * 255);
    b = Math.floor(b * 255);
    if (hex) {
      return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
    } else if (separate) {
      return [r, g, b];
    } else {
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
}

function deg2rad(angle) {
  return angle * Math.PI / 180;
}