# Solidyjs

A real-time collaborative stock management system with offline support.

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
