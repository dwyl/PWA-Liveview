import { cache } from "@babel/traverse";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.origin === "http://localhost:4000",
  new NetworkFirst({ cacheName: "my-pages" })
);
