![Obol Logo](https://obol.tech/obolnetwork.png)

<h1 align="center">Obol SDK Examples</h1>
    
## Description

The repo contains a JS+TS Examples for using [Obol-SDK](https://www.npmjs.com/@obolnetwork/obol-sdk). It also includes a script to create clusters.

## Installation And Running the examples

```bash


# JS
$ cd JS-Example
$ yarn
$ yarn run start

# TS
$ cd TS-Example
$ yarn
$ yarn run build
$ yarn run start

```

## Runing the Script

The script creates clusters on mainnet based on data in clusters.csv. Update the configuration in clusters.csv before running the script. Update the chain Id in script.js if you want to create clusters on another supported netwrok. Keep in mind that the script expect all validators in a cluster to have the same configurations.

```bash

$ cd Lido-Script
$ yarn
$ node script.js

```