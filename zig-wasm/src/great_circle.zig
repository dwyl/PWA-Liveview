// extern "env" fn consoleLog(ptr: [*]const u8, len: usize) void;

const std = @import("std");
const math = std.math;
const toRadian = math.degreesToRadians;

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
    const start_lat_rad = toRadian(start_lat_deg);
    const start_lon_rad = toRadian(start_lon_deg);
    const end_lat_rad = toRadian(end_lat_deg);
    const end_lon_rad = toRadian(end_lon_deg);

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
    const start_lat_rad = toRadian(start_lat_deg);
    const start_lon_rad = toRadian(start_lon_deg);
    const end_lat_rad = toRadian(end_lat_deg);
    const end_lon_rad = toRadian(end_lon_deg);

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
