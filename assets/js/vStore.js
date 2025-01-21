import { proxy } from "valtio/vanilla";

const state = proxy({ globalStock: 20 });

export default state;
