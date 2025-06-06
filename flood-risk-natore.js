// ========================
// FLOOD RISK MAPPING - NATORE, BANGLADESH
// Md. Khadem Ali
// B.Sc in Geography & Environment
// khademgenu22@gmail.com
// ========================

// Natore district boundary
var natore = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level2")
  .filter(ee.Filter.eq('ADM2_NAME', 'Natore'))
  .filter(ee.Filter.eq('ADM0_NAME', 'Bangladesh'));
Map.centerObject(natore, 9);

// Sentinel-1 VV (water detection)
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(natore)
  .filterDate('2023-07-01', '2023-09-30')
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
  .select('VV')
  .median();

var vv = s1.clip(natore);
var water = vv.lt(-17);

// Elevation (<10m)
var elevation = ee.Image('USGS/SRTMGL1_003');
var lowElevation = elevation.lt(10);

// Sentinel-2 NDVI (vegetation)
var s2 = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterBounds(natore)
  .filterDate('2023-01-01', '2023-03-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50))
  .select(['B4', 'B8'])
  .median();

var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var vegetation = ndvi.gt(0.4);

// Flood risk calculation: weights
var floodRisk = water.multiply(3)
  .add(lowElevation.multiply(2))
  .add(vegetation.multiply(1))
  .rename('risk');

// Max possible risk = 3+2+1=6
var normRisk = floodRisk.divide(6);

// Create RGB flood risk visualization image with discrete colors
var green = normRisk.lt(0.33).multiply(1);
var yellow = normRisk.gte(0.33).and(normRisk.lt(0.66)).multiply(2);
var red = normRisk.gte(0.66).multiply(3);

// Sum them to create a single band with values 1 (green), 2 (yellow), 3 (red)
var riskClass = green.add(yellow).add(red).rename('riskClass');

// Updated palette for nicer greens:
var riskVis = {
  min: 1,
  max: 3,
  palette: [
    '006400', // Dark Green (gachher moto)
    'FFFF00', // Yellow
    'FF0000'  // Red
  ]
};

// Add flood risk map with updated colors
Map.addLayer(riskClass.clip(natore), riskVis, 'Flood Risk Map');

// Boundary for reference
Map.addLayer(natore.style({color: 'black', fillColor: '00000000'}), {}, 'Natore Boundary');