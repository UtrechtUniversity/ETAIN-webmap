var map = L.map('map').setView([47.559, 7.588], 12);

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

var geoServerUrl = 'http://localhost:8080/geoserver/wms';
var layerName1 = 'etain_maps:output_db_test_NLCH300125';
var layerName2 = 'etain_maps:nlch_hexgrid_500m_with_counts';
var layerName3 = 'etain_maps:nlch_squaregrid_500m_with_counts';

console.log(`Creating WMS layer: ${geoServerUrl}, layer: ${layerName1}`);
console.log(`Creating additional WMS layer: ${geoServerUrl}, layer: ${layerName2}`);

//define wms layers
var wmsLayer1 = L.tileLayer.wms(geoServerUrl, {
    layers: layerName1,
    format: 'image/png',
    transparent: true,
    attribution: ""
});

var wmsLayer2 = L.tileLayer.wms(geoServerUrl, {
    layers: layerName2,
    format: 'image/png',
    transparent: true,
    attribution: ""
});

var wmsLayer3 = L.tileLayer.wms(geoServerUrl, {
    layers: layerName3,
    format: 'image/png',
    transparent: true,
    attribution: ""
});

//Track active layers
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
// wmsLayer2.addTo(map)

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

// Create the layer control
var layersControl = L.control.layers(baseLayers, { 
    "LTE_exposure": wmsLayer1, 
    "measurementCount_hexGrid": wmsLayer2,
    "measurementCount_squareGrid": wmsLayer3
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

map.on('click', function(e) {
    if (activeLayers.size > 0) {
        var point = map.latLngToContainerPoint(e.latlng);
        var x = point.x;
        var y = point.y;

        // request data for active layer
        activeLayers.forEach(function(layer) {
            //skip basemaps
            if (layer.options.isBasemap) {
                return;
            }

            var layerName = layer.options.layers;
            var requestUrl = `${geoServerUrl}?service=WMS&version=1.1.1&request=GetFeatureInfo&layers=${layerName}&query_layers=${layerName}&INFO_FORMAT=application/json&x=${x}&y=${y}&SRS=EPSG:4326&WIDTH=${map.getSize().x}&HEIGHT=${map.getSize().y}&bbox=${map.getBounds().toBBoxString()}`;
            
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
                    } else if (layerName === layerName3) {
                        var pointCount = null;
                        if (data && data.features && data.features.length > 0) {
                            pointCount = data.features[0].properties.point_count;
                        }
                        popupContent = `Measurement Count: ${pointCount}`;
                    }

                    // Create popup
                    L.popup()
                        .setLatLng(e.latlng)
                        .setContent(popupContent)
                        .openOn(map);
                })
                .catch(error => {
                    console.error('Fetch error:', error);
                });
        });
    }
});
