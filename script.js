// --------------------------------------------------------------------------------------
//
// This is how quick and dirty code looks like, if you're into linting and things, this you better
// leave now...
//
// --------------------------------------------------------------------------------------

// Global all the things/variables!

// all the great stuff is @possan's, @plamere just added the bits
// where we get/show artist images in addition to the cover art

// auth
var CLIENT_ID = '9b231038c93f49acafe0fcbcc8caff4f';
var SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state'
];
var accessToken;

// player state
var artistName = '';
var albumName = '';
var visibleAlbumImageURL = '';
var trackDuration = 180000;
var trackURI = '';
var trackPosition = 0;
var trackPlaying = false;
var trackName = '';
var imageList = [];
var curTrack = null;

var lastTrackPositionUpdate = 0;
var firstTime = 0;
var globalTime = 0;
var state = 'blank';
var stateStart = 0;

// misc ui
var closetimer = 0;
var fadeinTime = 10000;
var fadeoutTime = 4000;

// --------------------------------------------------------------------------------------
// Some polyfills
// --------------------------------------------------------------------------------------

window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(callback) {
           window.setTimeout(callback, 1000/60);
         };
})();

// --------------------------------------------------------------------------------------
// Network code
// --------------------------------------------------------------------------------------

function createRequest(method, url, onload) {
  var request = new XMLHttpRequest();
  request.open(method, url);
  if (method != 'GET') {
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
  }
  request.onerror = function () {};
  request.onload = onload.bind(this, request);
  return request;
}

function requestFile(filename, callback) {
  createRequest('GET', filename, function(request) {
    if (request.status >= 200 && request.status < 400) {
      callback(request.responseText);
    }
  }).send();
}

function createAuthorizedRequest(method, url, onload) {
  var request = createRequest(method, url, function(request) {
    if (request.status < 200 || request.status >= 400) {
      login();
    }

    onload(request);
  });
  request.setRequestHeader('Authorization', 'Bearer ' + accessToken);
  return request;
}

function _pollCurrentlyPlaying(callback) {
  createAuthorizedRequest(
    'GET',
    'https://api.spotify.com/v1/me/player/currently-playing',
    function(request) {
      if (request.status < 200 || request.status >= 400) {
        callback();
        return;
      }

      var data = JSON.parse(request.responseText);
      console.log('got data', data);
      if (data.item) {
        trackName = data.item.name;
        albumName = data.item.album.name;
        artistName = data.item.artists[0].name;
        setNowPlayingTrack(data.item);
        trackPosition = data.progress_ms;
        trackDuration = data.item.duration_ms;
        trackPlaying = data.is_playing
      }
      callback();
    }
  ).send();
}

var pollDebounce = 0;
function pollCurrentlyPlaying(delay) {
  if (pollDebounce) {
    clearTimeout(pollDebounce);
  }
  pollDebounce = setTimeout(
      _pollCurrentlyPlaying.bind(this, pollCurrentlyPlaying.bind(this)),
      delay || 5000);
}

function getUserInformation(callback) {
  createAuthorizedRequest('GET', 'https://api.spotify.com/v1/me', function(request) {
    if (request.status < 200 || request.status >= 400) {
      callback(null);
      return;
    }

    console.log('got data', request.responseText);
    var data = JSON.parse(request.responseText);
    callback(data);
  }).send();
}

function sendPlayCommand(payload) {
  createAuthorizedRequest('PUT', 'https://api.spotify.com/v1/me/player/play', function(request) {
    if (request.status >= 200 && request.status < 400) {
      console.log('play command response', request.responseText);
    }
    pollCurrentlyPlaying(1500);
  }).send(JSON.stringify(payload));
}

function fetchArtist(artist_uri, callback) {
  console.log("fetching artist", artist_uri);
  var aid = artist_uri.split(':')[2];
  createAuthorizedRequest('GET', 'https://api.spotify.com/v1/artists/' + aid, function(request) {
    if (request.status >= 200 && request.status < 400) {
      var data = JSON.parse(request.responseText);
      callback(data);
    }
  }).send();
}

function sendCommand(method, command, querystring) {
  console.log('COMMAND: ' + command);
  var url = 'https://api.spotify.com/v1/me/player/' + command + (querystring ? ('?' + querystring) : '');
  createAuthorizedRequest(method, url, function (request) {
    if (request.status >= 200 && request.status < 400) {
      console.log('commant response', request.responseText);
    }
    pollCurrentlyPlaying(1500);
  }).send();
}

function sendPlayContext(uri, offset) {
  sendPlayCommand({
    context_uri: uri,
    offset: {
      position: offset || 0
    }
  });
}

function tick() {
  requestAnimFrame(tick);
  
  var progress = -2.0;
  var stateTime = 0;

  var albumImageURL = getImageUrl();
  if (state == 'blank') {
    progress = -2.0;
    if (albumImageURL != visibleAlbumImageURL) {
      console.log('Album URI changed: ' + albumImageURL);
      visibleAlbumImageURL = albumImageURL;
      console.log('Got album image..');
      state = 'fadein';
      stateTime = 0.0;
      stateStart = globalTime;
    }
  } else if (state == 'fadein') {
    stateTime = globalTime - stateStart;
    progress = -2.0 + stateTime / (fadeinTime / 2);
    if (stateTime > fadeinTime) {
      console.log('Fade in done.');
      state = 'visible';
      stateTime = 0.0;
      stateStart = globalTime;
    }
  } else if (state == 'visible') {
    progress = 0.0;
    if (albumImageURL != visibleAlbumImageURL) {
      console.log('Fading out...');
      state = 'fadeout';
      stateTime = 0.0;
      stateStart = globalTime;
    }
  } else if (state == 'fadeout') {
    stateTime = globalTime - stateStart;
    progress = 0.0 + stateTime / (fadeoutTime / 2)
    if (stateTime > fadeoutTime) {
      console.log('Faded out.');
      state = 'blank';
      stateTime = 0.0;
      stateStart = globalTime;
    }
  }

  if (visibleAlbumImageURL && currentImage != visibleAlbumImageURL) {

    currentImage = visibleAlbumImageURL;

    var myImage = new Image(100, 200);
    myImage.onload = function() {
        var bg = document.getElementById('bg');
        var url = "url('"+visibleAlbumImageURL+"')";
        if (bg.style.backgroundImage != url) bg.style.backgroundImage = url;
    };
    myImage.src = visibleAlbumImageURL;
  }

  var timeNow = new Date().getTime();
  if (firstTime == 0) {
    firstTime = timeNow;
  }
  globalTime = timeNow - firstTime;
}

var currentImage = '';

// --------------------------------------------------------------------------------------
// DOM UI
// --------------------------------------------------------------------------------------

function updateTrackPosition() {
  var t = (new Date()).getTime();
  if (lastTrackPositionUpdate == 0) {
    lastTrackPositionUpdate = t;
  }

  var dt = t - lastTrackPositionUpdate;
  lastTrackPositionUpdate = t;

  if (trackPlaying) {
    trackPosition += dt;
  }

  var w = trackPosition * 100 / trackDuration;
  w = Math.max(Math.min(100, w), 0);
  document.getElementById('trackpositionfill').style.width = w + '%';
}

function hideLogin() {
  document.getElementById('biglogin').style.display = 'none';
}

function showLogin() {
  document.getElementById('biglogin').style.display = 'block';
}

function toast(title, subtitle) {
  document.getElementById('text').innerText = title || '';
  document.getElementById('text2').innerText = subtitle || '';
  document.getElementById('toast').className = 'toast visible';

  /*clearTimeout(closetimer);
  closetimer = setTimeout(function () {
    document.getElementById('toast').className = 'toast';
  }, 5000);*/
}

function setNowPlayingTrack(track) {
  var uri = track.uri;
  if (uri == trackURI) {
    return;
  }
  curTrack = track;
  imageList.length = 0;
  
  for (var i = 0; i < 1 /*track.album.images.length*/; i++) {
    imageList.push(track.album.images[i].url);
  }

  imageList.push('./img/default1.jpg');
  //imageList.push('./img/default2.jpg');
  //imageList.push('./img/default3.jpg');
  
  for (var i = 0; i < track.artists.length; i++) {
    fetchArtist(track.artists[i].uri, function(artist) {
      artist.images.forEach(function(image) {
          if (image.width >= 640) {
              imageList.push(image.url);
          }
      });
    });
  }

  trackURI = uri;
  toast(trackName, artistName + ' - ' + albumName);

  changeViz(currentViz + 1);
}

function msPerImage() {
    var imageDur = trackDuration;
    if (imageList.length > 0) {
        // plus one to wrap around to get back to the
        // album art
         imageDur = trackDuration / (imageList.length + 1);
    } 
    return Math.max(fadeinTime + fadeinTime + 3, imageDur);
}

function getImageUrl() {
    var tp = Math.max(0, trackPosition - fadeoutTime);
    if (curTrack && imageList.length > 0) {
        var idx = Math.floor(tp / msPerImage());
        idx = idx % imageList.length;
        return imageList[idx];
    }
    return null;
}

function login() {
  var redirect_uri = location.protocol + '//' + location.host + location.pathname;
  var url = 'https://accounts.spotify.com/authorize?client_id=' + CLIENT_ID +
            '&redirect_uri=' + encodeURIComponent(redirect_uri) +
            '&scope=' + SCOPES.join('%20') +
            '&response_type=token';
  console.log('login url', url);
  location.href = url;
}

function connect() {
  console.log('Connecting with access token: ' + accessToken);
  getUserInformation(function(userinfo) {
    if (!userinfo) {
      accessToken = '';
      showLogin();
      return;
    }

    hideLogin();
    toast('Hello ' + (userinfo.display_name || userinfo.id) + '!', 'Make sure you\'re playing something in Spotify!');
    pollCurrentlyPlaying(2000);
  });
}

function validateAuthentication() {
  console.log('location.hash', location.hash);
  var lochash = location.hash.substr(1);
  var newAccessToken = lochash.substr(lochash.indexOf('access_token=')).split('&')[0].split('=')[1];
  if (newAccessToken) {
    localStorage.setItem('access_token', newAccessToken);
    accessToken = newAccessToken;
  } else {
    accessToken = localStorage.getItem('access_token');
  }
  if (accessToken) {
    connect();
  } else {
    showLogin();
  }
}

function initUI() {
  document.getElementById('trackposition').addEventListener('mousedown', function(event) {
    var time = event.offsetX * trackDuration / document.body.offsetWidth;
    trackPosition = time;
    sendCommand('PUT', 'seek', 'position_ms='+Math.round(time));
  });

  setInterval(updateTrackPosition, 1000);
}

function initKeyboard() {
  window.addEventListener('keyup', function (event) {
    console.log('key up', event.keyCode);

    // left
    if (event.keyCode == 37) {
      sendCommand('POST', 'previous');
    }

    // right
    if (event.keyCode == 39) {
      sendCommand('POST', 'next');
    }

    // space
    if (event.keyCode == 32) {
      if (trackPlaying) {
        trackPlaying = false;
        sendCommand('PUT', 'pause');
      } else {
        trackPlaying = true;
        sendCommand('PUT', 'play');
      }
    }
  });
}

// --------------------------------------------------------------------------------------
// Bootstrapping
// --------------------------------------------------------------------------------------

function bootstrap() {
  initKeyboard();
  initUI();
  validateAuthentication();
  tick();
}

window.addEventListener('load', bootstrap);
