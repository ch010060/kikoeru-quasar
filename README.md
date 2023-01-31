# Kikoeru (kikoeru-quasar)

A self-hosted web media player for listening to your DLsite voice works.

[![unstable build status](https://github.com/umonaca/kikoeru-quasar/actions/workflows/build-and-publish.yml/badge.svg)](https://github.com/umonaca/kikoeru-quasar/actions)

## Install the Node.js v14
[Official Download Page](https://nodejs.org/download/release/v14.15.0/)

## Install the dependencies
```bash
npm install
```

## Install the quasar
```bash
npm i -g @quasar/cli
npm init quasar
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
quasar dev
```


### Build the app for production
If you prefer SPA:
```bash
quasar build
```
If you prefer PWA:
```
quasar build -m pwa
```

And you will find the app in dist folder.

### Customize the configuration
See [Configuring quasar.conf.js](https://quasar.dev/quasar-cli/quasar-conf-js).
