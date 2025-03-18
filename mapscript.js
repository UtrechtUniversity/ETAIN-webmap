var map = L.map('map', { preferCanvas: true }).setView([50.1, 16.688], 5);

map.locate({ setView: true, maxZoom: 12, enableHighAccuracy: true, timeout: 10000, watch: true });

var userMarker; // Store the marker reference

map.on('locationfound', function(e) {
    if (!userMarker) {
        // Create the marker for the first time
        userMarker = L.marker(e.latlng, { icon: customIcon }).addTo(map)
            .bindPopup("Click on a coloured part of the map to get the exposure value.");
    } else {
        // Update marker position on subsequent location updates
        userMarker.setLatLng(e.latlng);
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const layerControl = document.querySelector(".leaflet-control-layers");

    // Create a separate div for the toggle button
    const buttonWrapper = document.createElement("div");
    buttonWrapper.classList.add("layer-toggle-wrapper");

    // Create the toggle button
    const toggleButton = document.createElement("button");
    toggleButton.innerText = ">>";  // Initial text
    toggleButton.classList.add("layer-toggle-button");

    // Attach event listener to toggle visibility
    toggleButton.addEventListener("click", function () {
        // Toggle the 'collapsed' class on the layer control
        layerControl.classList.toggle("collapsed");

        // Change the button text based on the collapsed state
        if (layerControl.classList.contains("collapsed")) {
            toggleButton.innerText = "<<";  // Change text when collapsed
            buttonWrapper.style.left = `${controlPosition.left + controlPosition.width + -50}px`; // Move right when collapsed
        } else {
            toggleButton.innerText = ">>";  // Change text when expanded
            buttonWrapper.style.left = `${controlPosition.left + controlPosition.width + -215}px`; // Original position when expanded
        }
    });

    // Append the button to the wrapper
    buttonWrapper.appendChild(toggleButton);

    // Add the wrapper to the map container or body (depending on where you want it)
    document.body.appendChild(buttonWrapper);

    // Position the button relative to the layer control
    const controlPosition = layerControl.getBoundingClientRect();
    buttonWrapper.style.position = "absolute";
    buttonWrapper.style.top = `${controlPosition.top + 3}px`; // Adjust the offset as needed
    buttonWrapper.style.left = `${controlPosition.left + controlPosition.width + -215}px`; // Initial position
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
    "Dark Background": darkLayer
};

//overlay layers
var geoServerUrl = 'https://geoserver2.irasetain.src.surf-hosted.nl/geoserver/wms';
var layerName1 = 'exposure_maps:lte_rssi_eu_mosaic1';
var layerName2 = 'exposure_maps:nlch_hexgrid_500m_with_counts';
var layerName3 = 'exposure_maps:lte_rsrp_eu_mosaic';

// //logic to add headers to request /// INACTIVE FOR NOW, CAUSES TOO MUCH SLOWDOWN ON LARGE RASTERS
// L.TileLayer.CustomWMS = L.TileLayer.WMS.extend({
//     createTile: function(coords, done) {
//         var tile = document.createElement('img');
//         var tileUrl = this.getTileUrl(coords);
        
//         fetch(tileUrl, {
//             method: 'GET',
//             headers: {
//                 'Content-Type': 'text/html; charset=utf-8',
//                 'Cache-Control': 'public, max-age=3600',
//                 'X-Content-Type-Options': 'nosniff'
//             }
//         })
//         .then(response => response.blob())
//         .then(blob => {
//             var url = URL.createObjectURL(blob);
//             tile.onload = function() {
//                 done(null, tile);
//             };
//             tile.src = url;
//         })
//         .catch(err => {
//             done(err);
//         });

//         return tile;
//     }
// });

//define wms layers
var wmsLayer1 = new L.TileLayer.WMS(geoServerUrl, {
    layers: layerName1,
    format: 'image/png',
    transparent: true,
    attribution: ""
}).setOpacity(1);


var wmsLayer2 = new L.TileLayer.WMS(geoServerUrl, {
    layers: layerName2,
    format: 'image/png',
    transparent: true,
    attribution: "",
});


if (rsrp === true) { ///////////////////////////////////////
    var wmsLayer3 = new L.TileLayer.WMS(geoServerUrl, {
        layers: layerName3,
        format: 'image/png',
        transparent: true,
        attribution: "",
    }    
)};

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

//layer control
if (rsrp === false) {
    var layersControl = L.control.layers(baseLayers, { 
        "4G exposure": wmsLayer1, 
        "<s>Measurement counts</s>": wmsLayer2,
    }, { 
        collapsed: false,
    }).addTo(map)}
else {
    layersControl = L.control.layers(baseLayers, { 
        "LTE exposure": wmsLayer1, 
        "LTE rsrp exposure": wmsLayer3, 
        "<s>Measurement counts</s>": wmsLayer2,
    }, { 
        collapsed: false,
    }).addTo(map)};

function addLegend(layerName, legendPosition,legendTitle) {
    var legendUrl = geoServerUrl + '?service=WMS&version=1.3.0&request=GetLegendGraphic&layer=' + layerName + '&format=image/png';

    var legend = L.control({ position: legendPosition });
    
    legend.onAdd = function () {
        var div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += '<span class="legend-title">' + legendTitle + '</strong><br>';
        div.innerHTML += '<img src="' + legendUrl + '" alt="Legend"/>';
        return div;
    };

    legend.addTo(map);
}
addLegend(layerName1, 'bottomright', 'V/m');
addLegend(layerName2, 'bottomleft');


//click function to fetch data of active layer
map.on('click', function(e) {
    if (activeLayers.size > 0) {
        var point = map.latLngToContainerPoint(e.latlng);
        var x = Math.round(point.x);
        var y = Math.round(point.y);

        // console.log("Clicked at (x, y):", x, y); DEBUG

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
                        popupContent = `4G EMF Exposure: ${grayIndex}V/m`;
                    } else if (layerName === layerName2) {
                        var pointCount = null;
                        if (data && data.features && data.features.length > 0) {
                            pointCount = data.features[0].properties.point_count;
                        }
                        popupContent = `Measurement Count: ${pointCount}`;
                    } else if (layerName === layerName3) {
                        var grayIndex = null;
                        if (data && data.features && data.features.length > 0) {
                            grayIndex = Math.round(data.features[0].properties.GRAY_INDEX * 10) / 10;
                        }
                        popupContent = `LTE EMF Exposure: ${grayIndex}V/m`;
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