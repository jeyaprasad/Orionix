//#region node_modules/@turf/helpers/dist/esm/index.js
var earthRadius = 6371008.8;
earthRadius * 100, earthRadius * 100, 360 / (2 * Math.PI), earthRadius * 3.28084, earthRadius * 39.37, earthRadius / 1e3, earthRadius / 1e3, earthRadius / 1609.344, earthRadius * 1e3, earthRadius * 1e3, earthRadius / 1852, earthRadius * 1.0936;
function feature(geom, properties, options = {}) {
	const feat = { type: "Feature" };
	if (options.id === 0 || options.id) feat.id = options.id;
	if (options.bbox) feat.bbox = options.bbox;
	feat.properties = properties || {};
	feat.geometry = geom;
	return feat;
}
function polygon(coordinates, properties, options = {}) {
	for (const ring of coordinates) {
		if (ring.length < 4) throw new Error("Each LinearRing of a Polygon must have 4 or more Positions.");
		if (ring[ring.length - 1].length !== ring[0].length) throw new Error("First and last Position are not equivalent.");
		for (let j = 0; j < ring[ring.length - 1].length; j++) if (ring[ring.length - 1][j] !== ring[0][j]) throw new Error("First and last Position are not equivalent.");
	}
	return feature({
		type: "Polygon",
		coordinates
	}, properties, options);
}
//#endregion
//#region node_modules/@turf/meta/dist/esm/index.js
function coordEach(geojson, callback, excludeWrapCoord) {
	if (geojson === null) return;
	var j, k, l, geometry, stopG, coords, geometryMaybeCollection, wrapShrink = 0, coordIndex = 0, isGeometryCollection, type = geojson.type, isFeatureCollection = type === "FeatureCollection", isFeature = type === "Feature", stop = isFeatureCollection ? geojson.features.length : 1;
	for (var featureIndex = 0; featureIndex < stop; featureIndex++) {
		geometryMaybeCollection = isFeatureCollection ? geojson.features[featureIndex].geometry : isFeature ? geojson.geometry : geojson;
		isGeometryCollection = geometryMaybeCollection ? geometryMaybeCollection.type === "GeometryCollection" : false;
		stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;
		for (var geomIndex = 0; geomIndex < stopG; geomIndex++) {
			var multiFeatureIndex = 0;
			var geometryIndex = 0;
			geometry = isGeometryCollection ? geometryMaybeCollection.geometries[geomIndex] : geometryMaybeCollection;
			if (geometry === null) continue;
			coords = geometry.coordinates;
			var geomType = geometry.type;
			wrapShrink = excludeWrapCoord && (geomType === "Polygon" || geomType === "MultiPolygon") ? 1 : 0;
			switch (geomType) {
				case null: break;
				case "Point":
					if (callback(coords, coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false;
					coordIndex++;
					multiFeatureIndex++;
					break;
				case "LineString":
				case "MultiPoint":
					for (j = 0; j < coords.length; j++) {
						if (callback(coords[j], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false;
						coordIndex++;
						if (geomType === "MultiPoint") multiFeatureIndex++;
					}
					if (geomType === "LineString") multiFeatureIndex++;
					break;
				case "Polygon":
				case "MultiLineString":
					for (j = 0; j < coords.length; j++) {
						for (k = 0; k < coords[j].length - wrapShrink; k++) {
							if (callback(coords[j][k], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false;
							coordIndex++;
						}
						if (geomType === "MultiLineString") multiFeatureIndex++;
						if (geomType === "Polygon") geometryIndex++;
					}
					if (geomType === "Polygon") multiFeatureIndex++;
					break;
				case "MultiPolygon":
					for (j = 0; j < coords.length; j++) {
						geometryIndex = 0;
						for (k = 0; k < coords[j].length; k++) {
							for (l = 0; l < coords[j][k].length - wrapShrink; l++) {
								if (callback(coords[j][k][l], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false;
								coordIndex++;
							}
							geometryIndex++;
						}
						multiFeatureIndex++;
					}
					break;
				case "GeometryCollection":
					for (j = 0; j < geometry.geometries.length; j++) if (coordEach(geometry.geometries[j], callback, excludeWrapCoord) === false) return false;
					break;
				default: throw new Error("Unknown Geometry Type");
			}
		}
	}
}
//#endregion
//#region node_modules/@turf/bbox/dist/esm/index.js
function bbox(geojson, options = {}) {
	if (geojson.bbox != null && true !== options.recompute) return geojson.bbox;
	const result = [
		Infinity,
		Infinity,
		-Infinity,
		-Infinity
	];
	coordEach(geojson, (coord) => {
		if (result[0] > coord[0]) result[0] = coord[0];
		if (result[1] > coord[1]) result[1] = coord[1];
		if (result[2] < coord[0]) result[2] = coord[0];
		if (result[3] < coord[1]) result[3] = coord[1];
	});
	return result;
}
//#endregion
export { polygon as n, bbox as t };
