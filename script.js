
var customIcon = L.icon({
    iconUrl: 'img/location.png', // Replace with your icon URL
    iconSize: [40, 40], // Size of the icon
    iconAnchor: [20, 40], // Anchor point (center-bottom)
    popupAnchor: [0, -35] // Popup position
  });


var map = L.map('map', {preferCanvas: true}).setView([50.1, 16.688], 5);

map.whenReady(function() {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        var userLat = position.coords.latitude;
        var userLng = position.coords.longitude;
  
        // Set map view to user's location
        map.setView([userLat, userLng], 12);
  
        // Add a marker for the user's location
        L.marker([userLat, userLng], { icon: customIcon }).addTo(map)
          .bindPopup("Click on a coloured part of the map to get the exposure value.")
          .openPopup();
      },
      function(error) {
        console.error("Error getting location:", error.message);
      },
      { enableHighAccuracy: false, timeout: 20000 }
    );
  });

//base layers
var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
});

var darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    isBasemap: true
});

//base layers group to add to layer control later
var baseLayers = {
    "OpenStreetMap": osmLayer,
    "Dark Tiles": darkLayer
};

var geoServerUrl = 'https://geoserver2.irasetain.src.surf-hosted.nl/geoserver/wms';
var layerName1 = 'exposure_maps:output_db_test_NLCH300125_nodata';
var layerName2 = 'exposure_maps:nlch_hexgrid_500m_with_counts';

//add headers to request
L.TileLayer.CustomWMS = L.TileLayer.WMS.extend({
    createTile: function(coords, done) {
        var tile = document.createElement('img');
        var tileUrl = this.getTileUrl(coords);
        
        // Fetch tile with custom headers
        fetch(tileUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
                'X-Content-Type-Options': 'nosniff'
            }
        })
        .then(response => response.blob())
        .then(blob => {
            var url = URL.createObjectURL(blob);
            tile.onload = function() {
                done(null, tile);
            };
            tile.src = url;
        })
        .catch(err => {
            done(err);
        });

        return tile;
    }
});
//

//define wms layers
var wmsLayer1 = new L.TileLayer.CustomWMS(geoServerUrl, {
    layers: layerName1,
    format: 'image/png',
    transparent: true,
    attribution: ""
}).setOpacity(1);

///opacity slider logic for exposure layer map
var slider = document.getElementById("opacity-slider");
slider.addEventListener("input", function() {
    var opacityValue = parseFloat(slider.value);
    wmsLayer1.setOpacity(opacityValue);  
});

var wmsLayer2 = new L.TileLayer.CustomWMS(geoServerUrl, {
    layers: layerName2,
    format: 'image/png',
    transparent: true,
    attribution: "",
});


//track active layers
var activeLayers = new Set();  
map.on('layeradd', function(e) {
    activeLayers.add(e.layer);
});
map.on('layerremove', function(e) {
    activeLayers.delete(e.layer);
});

//add layers to map
darkLayer.addTo(map);
wmsLayer1.addTo(map); //exposure layer is on by default

function addLegend(layerName,legendPosition) {
    var legendUrl = geoServerUrl + '?service=WMS&version=1.3.0&request=GetLegendGraphic&layer=' + layerName + '&format=image/png';

    var legend = L.control({ position: legendPosition });
    
    legend.onAdd = function () {
        var div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += '<img src="' + legendUrl + '" alt="Legend"/>';
        return div;
    };

    legend.addTo(map);
}

//layer control
var layersControl = L.control.layers(baseLayers, { 
    "LTE_exposure": wmsLayer1, 
    "measurementCount_hexGrid": wmsLayer2,
}, { 
    collapsed: false,
}).addTo(map);

function addLegend(layerName, legendPosition) {
    var legendUrl = geoServerUrl + '?service=WMS&version=1.3.0&request=GetLegendGraphic&layer=' + layerName + '&format=image/png';

    var legend = L.control({ position: legendPosition });
    
    legend.onAdd = function () {
        var div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += '<img src="' + legendUrl + '" alt="Legend"/>';
        return div;
    };

    legend.addTo(map);
}

//add legends
addLegend(layerName1, 'bottomright');
addLegend(layerName2, 'bottomleft');


//click function to fetch data of active layer
map.on('click', function(e) {
    if (activeLayers.size > 0) {
        var point = map.latLngToContainerPoint(e.latlng);
        var x = Math.round(point.x);
        var y = Math.round(point.y);

        //console.log("Clicked at (x, y):", x, y); DEBUG

        //request data for active layer(skip basemaps)
        activeLayers.forEach(function(layer) {
            if (layer.options.isBasemap) {
                return;
            }

            var layerName = layer.options.layers;
            var bbox = map.getBounds().toBBoxString();

            var requestUrl = `${geoServerUrl}?service=WMS&version=1.1.1&request=GetFeatureInfo&layers=${layerName}&query_layers=${layerName}&INFO_FORMAT=application/json&x=${x}&y=${y}&SRS=EPSG:4326&WIDTH=${map.getSize().x}&HEIGHT=${map.getSize().y}&bbox=${bbox}&_=${Date.now()}`;

            fetch(requestUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('No network response');
                    }
                    return response.json();
                })
                .then(data => {
                    var popupContent = '';
                    
                    if (layerName === layerName1) {
                        var grayIndex = null;
                        if (data && data.features && data.features.length > 0) {
                            grayIndex = Math.round(data.features[0].properties.GRAY_INDEX * 10) / 10;
                        }
                        popupContent = `LTE EMF Exposure: ${grayIndex}V/m`;
                    } else if (layerName === layerName2) {
                        var pointCount = null;
                        if (data && data.features && data.features.length > 0) {
                            pointCount = data.features[0].properties.point_count;
                        }
                        popupContent = `Measurement Count: ${pointCount}`;
                    }

                    if (popupContent.includes("-3.4028234663852886e+38")) {
                        popupContent = "No data for selected location";
                    }
                    L.popup()
                        .setLatLng(e.latlng)
                        .setContent(popupContent)
                        .openOn(map);
                })
                .catch(error => {
                    // console.error('Fetch error:', error);
                });
        });
    }
});