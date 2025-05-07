export async function loadWasm() {
  console.log("loadWasm called");
  try {
    const importObject = {
      env: {
        memory: new WebAssembly.Memory({ initial: 20 }),
      },
      /*
        TODO: pass "consoleLog" function to WASM
        This function can be used to log messages from WASM to the console.
        consoleLog: (ptr, len) => {
          const memory = new Uint8Array(importObject.env.memory.buffer);
          const message = new TextDecoder("utf-8").decode(
            memory.slice(ptr, ptr + len)
          );
          console.log("[WASM] ", message);
        },
        
        */
    };
    const wasmUrl = new URL("/wasm/great_circle.wasm", import.meta.url).href;
    const { instance } = await WebAssembly.instantiateStreaming(
      fetch(wasmUrl),
      importObject
    );
    return instance.exports;
  } catch (error) {
    console.error(`Unable to instantiate the module`, error);
    return null;
  }
}

/*
Alternative "old" way to load WASM from a URL served by the server from a controller
const response = await fetch("/assets/great_circle.wasm");
    const wasmBuffer = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(
      wasmBuffer,
      importObject
    );
 */
