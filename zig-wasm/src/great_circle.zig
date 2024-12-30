// extern "env" fn consoleLog(ptr: [*]const u8, len: usize) void;

const std = @import("std");
const math = std.math;
const toRad = math.degreesToRadians;

// Constants for geometric calculations
const RADIANS_PER_DEGREE = math.pi / 180.0;
const DEGREES_PER_RADIAN = 180.0 / math.pi;
const EARTH_RADIUS_KM = 6371.0; // Earth's mean radius in kilometers
// One degree of latitude or longitude in kilometers
const ONE_DEGREE_KM = 111.0;

// Configuration
const DEFAULT_ANGLE_INCREMENT_DEGREES: f64 = 1.0; // Spacing between points in degrees
const ANGLE_INC_RAD = DEFAULT_ANGLE_INCREMENT_DEGREES * RADIANS_PER_DEGREE;

/// Represents a geographic point with latitude and longitude in degrees.
const Point = struct { lat: f64, lon: f64 };

var num_points: usize = 0;

var wasm_allocator = std.heap.wasm_allocator;

/// Converts Cartesian coordinates to geographic latitude and longitude.
fn cartesianToGeographic(x: f64, y: f64, z: f64) Point {
    return Point{
        .lat = std.math.atan2(z, std.math.sqrt(x * x + y * y)) * DEGREES_PER_RADIAN,
        .lon = std.math.atan2(y, x) * DEGREES_PER_RADIAN,
    };
}

/// Calculate the angular distance between two points on the surface of a sphere
export fn calculateHaversine(
    start_lat_deg: f64,
    start_lon_deg: f64,
    end_lat_deg: f64,
    end_lon_deg: f64,
) f64 {
    const start_lat_rad = start_lat_deg * RADIANS_PER_DEGREE;
    const start_lon_rad = start_lon_deg * RADIANS_PER_DEGREE;
    const end_lat_rad = end_lat_deg * RADIANS_PER_DEGREE;
    const end_lon_rad = end_lon_deg * RADIANS_PER_DEGREE;

    const haversine =
        math.pow(f64, math.sin((end_lat_rad - start_lat_rad) / 2), 2) +
        math.cos(start_lat_rad) * math.cos(end_lat_rad) *
        math.pow(f64, math.sin((end_lon_rad - start_lon_rad) / 2), 2);

    return 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine));
}

/// Calculate the great-circle distance between two geographic coordinates.
fn getGreatCircleDistance(
    start_lat_deg: f64,
    start_lon_deg: f64,
    end_lat_deg: f64,
    end_lon_deg: f64,
) f64 {
    const angular_distance = calculateHaversine(
        start_lat_deg,
        start_lon_deg,
        end_lat_deg,
        end_lon_deg,
    );

    return angular_distance * EARTH_RADIUS_KM;
}

/// Calculate the number of points for interpolation based on distance.
fn calculateNumPoints(angular_distance: f64, angle_increment_rad: f64) usize {
    return @as(usize, @intFromFloat(@ceil(angular_distance / angle_increment_rad))) + 1;
}

fn computeNumPoints(angular_distance: f64) usize {
    if (angular_distance * DEGREES_PER_RADIAN < 1.0) {
        return 2;
    }

    return calculateNumPoints(angular_distance, ANGLE_INC_RAD);
}

export fn getBufferSize() usize {
    return num_points * 2 * 8;
}

export fn memfree(ptr: [*]u8, len: usize) void {
    const slice = ptr[0..len];
    wasm_allocator.free(slice);
}

/// Computes great-circle points between two geographic coordinates.
export fn computeGreatCirclePoints(
    start_lat_deg: f64,
    start_lon_deg: f64,
    end_lat_deg: f64,
    end_lon_deg: f64,
) [*]f64 {
    // log("Computing great circle points\n");
    // Convert coordinates to radians
    const start_lat_rad = toRad(start_lat_deg);
    const start_lon_rad = toRad(start_lon_deg);
    const end_lat_rad = toRad(end_lat_deg);
    const end_lon_rad = toRad(end_lon_deg);

    const angular_distance = calculateHaversine(
        start_lat_deg,
        start_lon_deg,
        end_lat_deg,
        end_lon_deg,
    );

    num_points = computeNumPoints(angular_distance);

    // If the points are very close, return just the two points
    if (num_points == 2) {
        const buffer = wasm_allocator.alloc(f64, 4) catch unreachable;
        buffer[0] = start_lat_deg;
        buffer[1] = start_lon_deg;
        buffer[2] = end_lat_deg;
        buffer[3] = end_lon_deg;
        return buffer.ptr;
    }

    const buffer: []f64 = wasm_allocator.alloc(f64, num_points * 2) catch unreachable;

    const sin_angular_distance = math.sin(angular_distance);

    var i: usize = 0;
    while (i < num_points) : (i += 1) {
        const fraction = @as(f64, @floatFromInt(i)) / @as(f64, @floatFromInt(num_points - 1));

        // Calculate interpolation coefficients
        const coeff_start =
            if (sin_angular_distance == 0)
            1 - fraction
        else
            math.sin((1 - fraction) * angular_distance) / sin_angular_distance;

        const coeff_end =
            if (sin_angular_distance == 0)
            fraction
        else
            math.sin(fraction * angular_distance) / sin_angular_distance;

        // Calculate 3D cartesian coordinates
        const x =
            coeff_start * math.cos(start_lat_rad) * math.cos(start_lon_rad) +
            coeff_end * math.cos(end_lat_rad) * math.cos(end_lon_rad);

        const y =
            coeff_start * math.cos(start_lat_rad) * math.sin(start_lon_rad) +
            coeff_end * math.cos(end_lat_rad) * math.sin(end_lon_rad);

        const z =
            coeff_start * math.sin(start_lat_rad) +
            coeff_end * math.sin(end_lat_rad);

        // Convert back to geographic coordinates
        const point = cartesianToGeographic(x, y, z);

        buffer[i * 2] = point.lat;
        buffer[i * 2 + 1] = point.lon;
    }

    return buffer.ptr;
}

// fn log(msg: []const u8) void {
//     consoleLog(msg.ptr, msg.len);
// }

// const std = @import("std");
// const math = std.math;

// pub const memory: []u8 = undefined;
// const NUM_POINTS = 200;
// const POINT_SIZE = 16;
// const BUFFER_SIZE = NUM_POINTS * POINT_SIZE;

// // Static buffer to store the points
// var point_buffer: [BUFFER_SIZE]u8 align(8) = undefined;
// var gc_length: f64 = 0.0;

// export fn getBufferPtr() [*]u8 {
//     return &point_buffer;
// }

// export fn getBufferSize() usize {
//     return BUFFER_SIZE;
// }

// export fn greate_circle_length() f64 {
//     return gc_length;
// }

// export fn computeGreatCircle(lat1: f64, lon1: f64, lat2: f64, lon2: f64) usize {
//     var points = std.mem.bytesAsSlice([2]f64, &point_buffer);

//     // degrees to radians
//     const start_lat = lat1 * math.pi / 180.0;
//     const start_lon = lon1 * math.pi / 180.0;
//     const end_lat = lat2 * math.pi / 180.0;
//     const end_lon = lon2 * math.pi / 180.0;

//     // Calculate great circle distance
//     const gcLen = math.pow(f64, math.sin((end_lat - start_lat) / 2), 2) +
//         std.math.cos(start_lat) * math.cos(end_lat) *
//         std.math.pow(f64, math.sin((end_lon - start_lon) / 2), 2);

//     gc_length = gcLen;

//     const d = if (gcLen < 1e-15) 0 else 2 * math.atan2(
//         math.sqrt(gcLen),
//         math.sqrt(1 - gcLen),
//     );

//     // Handle special case when points are very close
//     if (d == 0) {
//         points[0][0] = lat1;
//         points[0][1] = lon1;
//         return POINT_SIZE; // Return just one point
//     }

//     const sin_d = math.sin(d);

//     for (points[0..NUM_POINTS], 0..) |*point, i| {
//         const f = @as(f64, @floatFromInt(i)) / @as(f64, @floatFromInt(NUM_POINTS - 1));

//         const A = if (sin_d == 0) 1 - f else math.sin((1 - f) * d) / sin_d;
//         const B = if (sin_d == 0) f else math.sin(f * d) / sin_d;

//         const x = A * math.cos(start_lat) * math.cos(start_lon) +
//             B * math.cos(end_lat) * math.cos(end_lon);
//         const y = A * math.cos(start_lat) * math.sin(start_lon) +
//             B * math.cos(end_lat) * math.sin(end_lon);
//         const z = A * math.sin(start_lat) + B * math.sin(end_lat);

//         // Convert back to degrees for Leaflet
//         point[0] = math.atan2(z, math.sqrt(x * x + y * y)) * 180.0 / math.pi;
//         point[1] = math.atan2(y, x) * 180.0 / math.pi;
//     }

//     return BUFFER_SIZE;
// }
