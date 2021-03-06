$( document ).ready(()=> {
 
var selectedFeatureId;
var map = L.map('map', { zoomSnap: 0.1, zoomControl: false});
map.doubleClickZoom.disable();
map.dragging.disable();
map.scrollWheelZoom.disable();
map.touchZoom.disable();
setDefaultZoom();
addZoomControl(map);

var tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
  minZoom: 4.5,
  maxZoom: 19,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

var districtLayer = new L.GeoJSON.AJAX("data/districts.geojson", {middleware: adaptDistricts}).bindTooltip(showDistrictTooltip);
var stateLayer = new L.GeoJSON.AJAX("data/states.geojson");
var stateLayerMask = new L.GeoJSON.AJAX("data/states.geojson", {invert: true, interactive: false});
tileLayer.addTo(map);
stateLayer.bindTooltip(showStateTooltip).addTo(map);

fullData$.subscribe(data => {
  // Add choropleth coloring to layers
  stateLayer.options = { style: setStateStyle };
  districtLayer.options = { style: setDistrictStyle };
});

// Zoom in and show districts when clicking on a state
stateLayer.on('click', function(e) {
  map.fitBounds(e.layer.getBounds());
  map.dragging.enable();

  // Show district layer
  if (!map.hasLayer(districtLayer)) {
    map.addLayer(districtLayer);
    if (selectedFeatureId) {
      stateLayerMask.bringToFront();
    }
  }

  // Mask out other states
  selectedFeatureId = e.layer.feature.id;
  if (!map.hasLayer(stateLayerMask)) {
    map.addLayer(stateLayerMask);
  }
  stateLayerMask.setStyle(setStateStyleMask);

  // Change data table
  $("#select--state").val(stateNameToAbrv[e.layer.feature.properties.name]).change();
});


// Helper functions
function calculateZoom() {
  var sw = screen.width;

  return sw >= 1700 ? 4.7 :
         sw >= 1600 ? 4.3 :
                      4.5 ;
}

function setDefaultZoom() {
  map.setView([37.8, -96], calculateZoom());
}

function addZoomControl(map) {
  L.control.zoom({position:'topright'}).addTo(map);
  $('.leaflet-control-zoom').append(
    '<a class="leaflet-control-zoom-reset" href="" title="Reset zoom" role="button" aria-label="Reset zoom"></a>'
  ).click(resetMap);
}

function resetMap(e) {
  // Reset zoom and data table
  setDefaultZoom();
  $("#select--state").val(null).change();
  map.dragging.disable();

  // Remove district layer and shadow mask
  if (map.hasLayer(districtLayer)) {
    map.removeLayer(districtLayer);
  }
  if (map.hasLayer(stateLayerMask)) {
    map.removeLayer(stateLayerMask);
    selectedFeatureId = false;
  }

  return false;
}

function setStateStyle(feature) {
  return {
    fillColor: fillStateColor(feature),
    fillOpacity: 1,
    weight: 2,
    opacity: 0.5,
    color: '#D4D5D4',
  };
}

function fillStateColor(feature) {
  if (stateNameToAbrv[feature.properties.name] in dataByStateAndDistrict) {
    let count = Object.keys(dataByStateAndDistrict[stateNameToAbrv[feature.properties.name]]).length;
    // TODO: Calculate by mode
    return count < 2 ? '#cbc9e2' :
           count < 4 ? '#9e9ac8' :
           count < 8 ? '#756bb1' :
                       '#54278f'
  }
  return '#f2f0f7';
}

function setStateStyleMask(feature) {
  if (feature.id === selectedFeatureId) {
    return {
      fillColor: '#000000',
      fillOpacity: .6,
      weight: 7,
      opacity: 1,
      color: '#ffffff',
    }
  } else {
    return {
      fillOpacity: 0,
      weight: 2,
      opacity: 0,
      color: '#ffffff',
    };
  }
}

function showStateTooltip(layer) {
  let name = layer.feature.properties.name;
  let tooltip = '<h4>' + name + '</h4>'
  if (stateNameToAbrv[name] in dataByStateAndDistrict) {
    ['sen', 'gov'].forEach(stateOffice => {
      if (stateOffice in dataByStateAndDistrict[stateNameToAbrv[name]]) {
        dataByStateAndDistrict[stateNameToAbrv[name]][stateOffice].forEach(person => {
          tooltip += '<h6>' + (person.incumbent ? 'Incumbent ' : 'Candidate ') + person.name + ' (' + officeDict[stateOffice] + ') ';
                    //  ' has' + (person.pledged ? '' : 'not') + ' taken the town hall pledge.</h6>';
        });
      }
    });
  }
  tooltip += '<h6><em>(Please click for more information)</em></h6>'
  return tooltip;
}

function setDistrictStyle(district) {
  return {
    fillColor: fillDistrictColor(district),
    fillOpacity: 1,
    weight: 3,
    opacity: 1,
    color: '#ffffff',
  };
}

function fillDistrictColor(district) {
  let count = districtLookup(district.properties.DISTRICT).length;

  return count < 1 ? '#deddf0' :
         count < 2 ? '#9e9ac8' :
         count < 3 ? '#756bb1' :
                     '#54278f'
}

function showDistrictTooltip(layer) {
  let tooltip = '<h4>' + layer.feature.properties.DISTRICT + '</h4>'
  let people = districtLookup(layer.feature.properties.DISTRICT);
  if (people.length) {
    people.forEach(person => {
      tooltip += '<h6>' + (person.incumbent ? 'Incumbent' : 'Candidate') + '<strong> ' + person.name + '</strong> has' + 
                 (person.pledged ? '' : 'not') + ' taken the pledge.</h6>';
    })
  } else {
    tooltip += '<h6>No one in this district has signed the pledge yet.</h6>'
  }

  return tooltip;
}

function adaptDistricts(district) {
  // Adapt model to fit with THP fields
  district.features.forEach(feature => {
    // Trim leading 0 on districts
    if (feature.properties.CD115FP.substring(0, 1) === '0') {
      feature.properties.DISTRICT = feature.properties.DISTRICT.replace(feature.properties.CD115FP, feature.properties.CD115FP.substring(1));
    }
  });
  return district.features;
}

});