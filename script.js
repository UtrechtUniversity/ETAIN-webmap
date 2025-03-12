// change layout of noheader request = true
function checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('noheader') === 'true') {
        document.getElementById('top-bar').style.display = 'none';
        document.getElementById('map').style.height='100vh'
        document.querySelector('.slider-container').style.top = '130px';
    }
    if (params.get('rsrp') === 'true') {
        var rsrp = true
    }
    else {
        var rsrp = false
    }
    return rsrp
}
const rsrp = checkURLParams();
window.onload = checkURLParams;

//load custom location icon
var customIcon = L.icon({
    iconUrl: 'img/location.png',
    iconSize: [40, 40], 
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
  });

  ///opacity slider logic for exposure layer map
var slider = document.getElementById("opacity-slider");
slider.addEventListener("input", function() {
    var opacityValue = parseFloat(slider.value);
    wmsLayer1.setOpacity(opacityValue);  
});

