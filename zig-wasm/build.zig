const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
    });
    // set a preferred release mode, allowing the user to decide how to optimize.
    // const optimize = b.standardOptimizeOption(.{});

    const exe_mod = b.createModule(.{
        .root_source_file = b.path("src/great_circle.zig"),
        .target = target,
        .optimize = .ReleaseSmall,
    });

    const exe = b.addExecutable(.{
        .name = "great_circle",
        .root_module = exe_mod,
    });
    exe.entry = .disabled;
    exe.rdynamic = true;
    exe.initial_memory = std.wasm.page_size * 50;

    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);

    run_cmd.step.dependOn(b.getInstallStep());

    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);
}
