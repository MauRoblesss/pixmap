# Utils for map creation, conversion, 3d models and related stuff

Note:

- EVERY SCRIPT THAT USES REDIS IS JUST AS REFERENCE (node-redis and keys update and change over time and i am not keeping those up-to-date) 
- we use blender 2.8
- js script are executed with `npm run babel-node utils/[scriptname].js`

## sphere-protection.blend
This blend file includes the sphere we use to display the globe with two UV maps, one for protection like it's used on many globe textures of the earth like [here](http://blog.mastermaps.com/2013/09/creating-webgl-earth-with-threejs.html) and [here](http://www.shadedrelief.com/natural3/pages/textures.html) and one for our mercator projection that is the same as on OpenStreetMap, with additional changes for poles.
The shader nodes in the bumpmap material are setup so that they bake from one uv map to another.

If you want to generate the .glb model file for the site thats in public/globe/globe.glb:
1. delete all materials of the sphere
2. delete the "fake-mercator" uv map, so that just the mercator one is left
3. create a new one without textures
4. name the material "canvas" (this will then be set by the script to the canvas textures)
5. select the sphere and export as .glb

## ocean-tiles
Used to generate tiles based on a uv texture that can then be drawn on the canvas, like the oceans and continents.

## country-locations
Generates a json list of country codes and their coordinates on the canvas based on lat and lon

## redisMoveCanvas.js
Script to move canvas chunks, i.e. for resizing canvas

## areaDownload.py
downloads an area of the canvas into a png file.
Usage: `areaDownload.py startX_startY endX_endY filename.png`
(note that you can copy the current coordinates in this format on the site by pressing R)
**Requires:** aiohttp, asyncio and PIL python3 packages

## historyDownload.py
downloads the history from an canvas area between two dates.
Useage: `historyDownload.py canvasId startX_startY endX_endY start_date end_date
This is used for creating timelapses, see the cmd help to know how
**Requires:** aiohttp, asyncio and PIL python3 packages

## pp-center\*.png
center logo of pixelplanet

## change-canvasbackup
just a script that got run once to add the missing tiles in historical view when  increasing the size of the moon canvas.

## testStore.js
used to test our own [connect-redis](https://github.com/tj/connect-redis) fork in src/utils/connectRedis.js
