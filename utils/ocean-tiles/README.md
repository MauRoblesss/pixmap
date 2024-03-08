# ocean tiles
In order to have the ocean and land on the canvas, we have to scale up the ocean.png, create tiles and then upload them to the canvas with drawOcean.js.

Execute those shell commands in this folder (utils/ocean-tiles). Imagemagick needs to be installed.

- create folder for tiles:

```
mkdir ./ocean
cd ocean
```
- to split image into tiles:

```
convert ../ocean.png -crop 128x128 +adjoin ocean_tiles%02d.png
```
- upscale and convert to black and white

```
mogrify -resize 2048x2048 -colors 2 -white-threshold 80% -black-threshold 80% ocean_tiles*.png
```
or without dithering:

```
mogrify +dither -resize 2048x2048 -colors 2 -white-threshold 80% -black-threshold 80% ocean_tiles*.png
```
- create subfolders

```
for i in {0..31}; do mkdir $i; done
```
- put into subfolders

```
for file in ./ocean_tiles*.png; do NUM=`echo $file | sed -e 's/.*ocean_tiles//' -e 's/.png//'`; Y=$(expr $NUM / 32); X=$(expr $NUM % 32); newfile="$X/$Y.png"; mv $file $newfile; done
```
- Draws the 2048x2048 tiles from the ./ocean directory on the canvas. Uses localhost:6379 as redis url, if you need a different one, edit it in the drawOcean.js file.

```
npm run babel-node ./utils/ocean-tiles/drawOcean.js
```
