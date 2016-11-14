/**
 * Created by Tobi on 10.11.2016.
 */

var q = require('q');
var geo = require('./geo-algorithms');
var turf = require('turf');
var helpers = require('./helpers');

exports.depictionRank = function (fov, fov2, query, objects, brdrPts) {
    var occ = exports.degreeOfOcclusion(fov, query, objects, brdrPts);
    return occ;
};

exports.degreeOfOcclusion = function (fov, query, objects, brdrPts) {
    var P = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [fov.properties.longitude, fov.properties.latitude]
        },
        "properties": {}
    };
    var nq = turf.explode(query)["features"];
    var d = fov.properties["heading"];
    var angleL = normalizedAngle(turf.bearing(P, brdrPts["ptLeft"]), d) ;
    var angleR = normalizedAngle(turf.bearing(P, brdrPts["ptRight"]), d);
    var queryRanges = [[angleL, angleR]];
    var hull = turf.convex(turf.union(query, P));
    for(var i in objects){
        var obj = objects[i];
        if(turf.intersect(obj, hull) && JSON.stringify(obj)!=JSON.stringify(query)){
            var occlusionRange = normalizedAngularRange(obj, P, d);
            var ranges = [];
            for(var j in queryRanges){
                var visRanges = determineVisibleRanges(queryRanges[j], occlusionRange);
                if(visRanges[0].length == 0){
                    return 0; // Query object is completely occluded --> sum of visible ranges i 0
                }
                ranges = ranges.concat(visRanges);
            }
            queryRanges = ranges;
        }
    }
    var summedRanges = 0;
    var maxRangeSum = Math.max(angleL, angleR) - Math.min(angleL, angleR);
    for(var i in queryRanges){
        summedRanges += Math.max(queryRanges[i][0],queryRanges[i][1]) - Math.min(queryRanges[i][0],queryRanges[i][1]);
    }
    return summedRanges/maxRangeSum
};

var normalizedAngularRange = function (obj, pos, d) {
    var nq = turf.explode(obj);
    var objectAngles = []
    for(var i in nq.features){
        var vertex = nq.features[i];
        var angle = normalizedAngle(turf.bearing(pos, vertex), d);
        objectAngles.push(angle);
    }
    objectAngles.sort(
        function(a, b){
            return a-b
        }
    );
    var range = [objectAngles[0], objectAngles[objectAngles.length-1]];
    return range;
};

var determineVisibleRanges = function (queryRange, occlusionRange) {
    var qLeft = Math.min(queryRange[0], queryRange[1]);
    var qRight = Math.max(queryRange[0], queryRange[1]);
    var oLeft = Math.min(occlusionRange[0], occlusionRange[1]);
    var oRight = Math.max(occlusionRange[0], occlusionRange[1]);
    var ranges = [];
    if(qLeft < oLeft){
        if(qRight < oLeft){
            ranges = [[qLeft, qRight]];
        } else {
            if(oLeft <= qRight <= oRight){
                ranges = [[qLeft, oLeft]];
            } else {
                ranges = [[qLeft, oLeft],[oRight, qRight]]
            }
        }
    } else {
        if(qLeft <= oRight){
            if(qRight <= oRight){
                ranges = [[]];
            } else {
                ranges = [[oRight, qRight]];
            }
        } else {
            ranges = [[qLeft, qRight]];
        }
    }
    return ranges;
};

var normalizedAngle = function (angle, direction) {
    angle = helpers.limitDegrees(angle - direction);
    if(angle>180){
        angle = angle-360;
    }
    return angle;
};