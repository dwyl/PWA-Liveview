import { proxy } from "valtio/vanilla";
import { proxyMap } from "valtio/utils";

// Initialize state with airports from localStorage if available
const initialAirports = () => {
  try {
    const stored = localStorage.getItem("flight_app_airports");
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error reading airports from localStorage:", e);
    return [];
  }
};

const state = proxy({
  selection: proxyMap(),
  flight: {},
  airports: initialAirports(),
  deletionState: {
    isDeleted: false,
    timestamp: null,
    deletedBy: null,
  },
});

export default state;
