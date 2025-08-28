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

async function fetchGeoJsonDate() {
    const url = 'https://geoserver-dgk-prd-etain.apps.cl01.cp.its.uu.nl/geoserver/exposure_maps/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=exposure_maps%3Ametadata&maxFeatures=50&outputFormat=application%2Fjson';
  
    try {
      const response = await fetch(url);
      const data = await response.json();
  
      if (data.features && data.features.length > 0) {
        const date = data.features[0].properties.date;
        console.log('Date:', date);
        return date; // Use this wherever needed on your site
      } else {
        console.error('No features found in the GeoJSON');
      }
    } catch (error) {
      console.error('Error fetching GeoJSON:', error);
    }
  }
  

fetchGeoJsonDate().then(date => {

document.getElementById('date').innerHTML = `Maps updated weekly; <br> Last update ${date}`;
});
