var map = L.map('map', { preferCanvas: true }).setView([50.1, 16.688], 5);

var initialLocation = null; // store the first location
var userMarker;

// Button control
var locateControl = L.control({ position: 'topleft' });

locateControl.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom locate-btn');

    // prevent map clicks when pressing the button
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    // click/touch: recenter map to initial location
    L.DomEvent.on(div, 'click touchstart', function(e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        if (initialLocation) {
            map.setView(initialLocation,12,{animate: false}); // fixed zoom
        }
    });

    return div;
};
locateControl.addTo(map);

// Track user location continuously
map.locate({ watch: true, enableHighAccuracy: true, timeout: 10000 });

map.on('locationfound', function(e) {
    // store initial location
    if (!initialLocation) {
        initialLocation = e.latlng;
        map.setView(initialLocation, 12,{animate: false});
    }

    if (!userMarker) {
        userMarker = L.marker(e.latlng, { icon: customIcon })
            .addTo(map)
            .bindPopup("Click on a coloured part of the map to get the exposure value.");
    } else {
        userMarker.setLatLng(e.latlng);
    }
});

//layercontrol collapse button logic
document.addEventListener("DOMContentLoaded", function () {
    const layerControl = document.querySelector(".leaflet-control-layers");
    const sliderContainer = document.querySelector(".slider-container");


    const buttonWrapper = document.createElement("div");
    buttonWrapper.classList.add("layer-toggle-wrapper");


    const toggleButton = document.createElement("button");
    toggleButton.innerText = ">>";  
    toggleButton.classList.add("layer-toggle-button");


    toggleButton.addEventListener("click", function () {
        layerControl.classList.toggle("collapsed");
        sliderContainer.classList.toggle("collapsed");


        if (layerControl.classList.contains("collapsed")) {
            toggleButton.innerText = "<<";  
            buttonWrapper.style.left = `${controlPosition.left + controlPosition.width - 50}px`; 
        } else {
            toggleButton.innerText = ">>";  
            buttonWrapper.style.left = `${controlPosition.left + controlPosition.width - 215}px`;
        }
    });


    buttonWrapper.appendChild(toggleButton);


    document.body.appendChild(buttonWrapper);


    const controlPosition = layerControl.getBoundingClientRect();
    buttonWrapper.style.position = "absolute";
    buttonWrapper.style.top = `${controlPosition.top + 3}px`; 
    buttonWrapper.style.left = `${controlPosition.left + controlPosition.width - 215}px`; 
});



//base layers
var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a>OpenStreetMap</a> contributors',
});

var darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a>OpenStreetMap</a> contributors &copy; <a>CARTO</a>',
    isBasemap: true
});

//base layers group to add to layer control later
var baseLayers = {
    "OpenStreetMap": osmLayer,
    "Dark Background": darkLayer
};

//overlay layers
var geoServerUrl = 'https://etainmaps.uu.nl/geoserver/wms';
var layerName1 = ' exposure_maps:lte_eu_mosaic';
var layerName2 = 'exposure_maps:count';

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

/////////////////////
// track active layers
var activeLayers = new Set();

//////// LEGEND LOGIC
map.on('layeradd', function(e) {
    activeLayers.add(e.layer);
    if (e.layer.options && e.layer.options.layers === layerName2) {
        addLegend('pointCount_style', 'bottomright');
    }
});

map.on('layerremove', function(e) {
    activeLayers.delete(e.layer);
    if (e.layer.options && e.layer.options.layers === layerName2) {
        removeLegend('pointCount_style');
    }
});

function addLegend(legendName, legendPosition, legendTitle) {
    // check if legend already exists
    if (document.querySelector('.legend-' + legendName)) {
        return; //dont add again
    }
    
    var legendUrl = geoServerUrl + '?service=WMS&version=1.3.0&request=GetLegendGraphic&format=image/png&style=' + legendName + '&STRICT=false';

    var legend = L.control({ position: legendPosition });
    
    legend.onAdd = function () {
        var div = L.DomUtil.create('div', 'info legend legend-' + legendName);
        if (legendTitle) {
            div.innerHTML += '<h4>' + legendTitle + '</h4>';
        }
        div.innerHTML += '<img src="' + legendUrl + '" alt="Legend"/>';
        return div;
    };

    legend.addTo(map);
    legend._legendName = legendName;
    map._legends = map._legends || {};
    map._legends[legendName] = legend;
}

function removeLegend(legendName) {
    if (map._legends && map._legends[legendName]) {
        map.removeControl(map._legends[legendName]);
        delete map._legends[legendName];
    }
}

addLegend('etain_raster_style_LEGEND', 'bottomright');

////////////////////

//add layers to map
darkLayer.addTo(map);
wmsLayer1.addTo(map); //exposure layer is on by default

//layer control
var layersControl = L.control.layers(baseLayers, { 
    "4G exposure": wmsLayer1, 
    "Measurement counts": wmsLayer2,
}, { 
    collapsed: false,
}).addTo(map)


//click function to fetch data of active layer
map.on('click', function(e) {
    if (activeLayers.size > 0) {
        var point = map.latLngToContainerPoint(e.latlng);
        var x = Math.round(point.x);
        var y = Math.round(point.y);

        //request data for active layer(skip basemaps)
        activeLayers.forEach(function(layer) {
            if (layer.options.isBasemap) {
                return;
            }

            var layerName = layer.options.layers;
            var bbox = map.getBounds().toBBoxString();
            console.log(bbox)

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
                            grayIndex = data.features[0].properties.GRAY_INDEX
                            console.log(grayIndex)
                            if (grayIndex === null || grayIndex === 0) {
                                popupContent = `No exposure data for selected location`
                            } else {
                                grayIndex = Math.round( grayIndex * 10) / 10;
                                popupContent = `4G EMF Exposure: ${grayIndex}V/m`
                            }
                        }
                    } else if (layerName === layerName2) {
                        var pointCount = null;
                        if (data && data.features && data.features.length > 0) {
                            pointCount = data.features[0].properties.point_count;
                        }
                        popupContent =  `Measurement Count: ${pointCount}`;
                    } else if (layerName === layerName3) {
                        var grayIndex = null;
                        if (data && data.features && data.features.length > 0) {
                            grayIndex = Math.round(data.features[0].properties.GRAY_INDEX * 10) / 10;
                        }
                        popupContent = `LTE EMF Exposure: ${grayIndex}V/m`;
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