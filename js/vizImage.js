/*******************************************************************************
* an image that's colored to the beat
*/
VizImage.prototype.generateGreyscaled = function(image) {
  this.width = image.width;
  this.height = image.height;

  this.bufferCv = document.createElement("canvas");
  this.bufferCv.width = this.width;
  this.bufferCv.height = this.height;
  var bufferCtx = this.bufferCv.getContext("2d");
  bufferCtx.clearRect(0, 0, this.width, this.height);
  bufferCtx.drawImage(image, 0, 0, this.width, this.height);

  var imageData = bufferCtx.getImageData(0, 0, this.width, this.height);
  // create temporary frame to be modified each draw call
  this.bufferImgData = bufferCtx.createImageData(this.width, this.height);
  this.greyscaled = [];

  // analyze each pixel
  for (var i = 0; i < this.width * this.height; i++) {
    var grey = Math.round(imageData.data[i*4]   * 0.2126 +
                          imageData.data[i*4+1] * 0.7152 +
                          imageData.data[i*4+2] * 0.0722);

    // fit to spectrum
    this.greyscaled.push(Math.round(constrain(grey, 0, 255) / 255 * bandCount));
    // set alpha, near-black parts are invisible
    this.bufferImgData.data[i*4+3] = (grey < 1) ? 0 : 255; 
  }
}

function VizImage() {
  this.dampen = true;
  this.hasVariants = false;

  this.generateGreyscaled(document.getElementById("image"));
  this.resize();
  this.hueOffset = 0;

}

VizImage.prototype.resize = function() {
  var sW = Math.floor(window.innerWidth / this.width);
  var sH = Math.floor(window.innerHeight / this.height);
  this.scale = Math.min(sW, sH);
  if (this.scale == 0) { this.scale = 1; }
  this.tX = Math.floor((window.innerWidth - (this.width * this.scale)) / 2);
  this.tY = Math.floor((window.innerHeight - (this.height * this.scale)) / 2);
}

VizImage.prototype.draw = function(spectrum) {
  ctx.save();
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.translate(this.tX, this.tY);
  this.hueOffset += 1;

  for (var i = 0; i < this.greyscaled.length; i++) {
    var frequency = this.greyscaled[i];
    var hue = Math.floor(spectrum[frequency] + this.hueOffset) % 360;
    var brightness = Math.sqrt((frequency / spectrum.length) * (spectrum[frequency] / fftSize)) * 100;
    brightness = constrain(Math.floor(brightness), 0, 99);
    var color = bigColorMap2[hue * 100 + brightness];
    this.bufferImgData.data[i*4]   = color[0];
    this.bufferImgData.data[i*4+1] = color[1];
    this.bufferImgData.data[i*4+2] = color[2];
  }

  var bufferCtx = this.bufferCv.getContext("2d");
  bufferCtx.putImageData(this.bufferImgData, 0, 0);
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(this.scale, this.scale);
  ctx.drawImage(this.bufferCv, 0, 0);
  ctx.restore();
}