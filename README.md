# Solidyjs

An Elixir-LiveView webapp with a real-time collaborative system with offline support (PWA).

Ingredients are:

- Phoenix LiveView
- Yjs
- Vite-plugin-PWA
- SolidJS

## Guide

<https://vite-pwa-org.netlify.app/guide/>

### Offline Support

YJS's IndexedDB persistence handles offline support automatically.

When offline:

- Users can still modify the stock locally
- Changes are stored in IndexedDB
- When back online, YJS will sync changes

### Synchronization Flow

- User A changes stock → YJS update → Hook observes → LiveView broadcast
- LiveView broadcasts to all users → Hook receives "new_stock" → YJS update
- YJS update → All components observe change → UI updates

### GET HEAD

Avoids downloading the body, The server returns the HTTP headers, so no headers, no connection.

- `navigator.onLine` has limitations. After navigating offline, the browser incorrectly reports `navigator.onLine = true`. This prevents the online event from firing on reconnection.

For a reliable State Detection: The online and offline events alone cannot always determine connectivity, especially when the server is unreachable.

For a reliable State Detection:, one can implement a custom Polling: a server reachability check (via HEAD requests) ensures accurate detection of reconnection, independent of browser state.

This is done by running `setInterval`

Efficient Reloads: Using a reloaded flag in the polling logic allows the app to reload once on reconnection, avoiding redundant reloads or unnecessary complexity.

This approach ensures consistent synchronization of client and server states while maintaining accurate offline/online indicators.

### Airports list

<https://openflights.org/data.php>
