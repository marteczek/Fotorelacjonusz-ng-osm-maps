import { Jimp } from "../util/jimp.js"
const exif = require("exif-parser")
const fs = require("fs")
var Promise = require("promise")

const SPACE_SIZE_FOR_EXIF_DATA = 65635
const MAP_SIZE = 200
const HEADERS = { "User-Agent": "Fotorelacjonusz-ng/1.0 https://github.com/fotorelacjonusz/fotorelacjonusz-ng"}

async function downloadOsmMap(lat, long, zoom) {
   const {xLargeMap, yLargeMap} = mercatorProjection(lat, long, zoom)
   const xLeftTopTile = Math.floor((xLargeMap - MAP_SIZE / 2) / 256)
   const yLeftTopTile = Math.floor((yLargeMap - MAP_SIZE / 2) / 256)
   const xRightBottomTile = Math.floor((xLargeMap + MAP_SIZE / 2) / 256)
   const yRightBottomTile = Math.floor((yLargeMap + MAP_SIZE / 2) / 256)
   const left = (xLargeMap - MAP_SIZE / 2) % 256
   const top = (yLargeMap - MAP_SIZE / 2) % 256
   const xCount = 1 + xRightBottomTile - xLeftTopTile
   const yCount = 1 + yRightBottomTile - yLeftTopTile
   const jarOfPromise = []
   for (var x = 0; x < xCount; x++) {
      for (var y = 0; y < yCount; y++) {
         jarOfPromise.push(
            new Promise((resolve, reject) => {
               const name = `https://tile.openstreetmap.org/${zoom}/${xLeftTopTile + x}/${yLeftTopTile + y}.png`
               const curX = x
               const curY = y
               Jimp.read({url: name, headers: HEADERS})
                  .then(image => { resolve({ x: curX, y: curY, image, name }) })
                  .catch(err => {
                     console.error(err)
                     reject(err)
                  })
            })
         )
      }
   }
   const tiles = await Promise.all(jarOfPromise)
   const map = new Jimp(xCount * 256, yCount * 256, (err, image) => {if (err) throw err})
   tiles.forEach(img => {
      map.composite(img.image, img.x * 256, img.y * 256)
      console.log(`x: ${img.x}, y: ${img.y}, image: ${img.name}`)
   })
   map.crop(left, top, MAP_SIZE, MAP_SIZE)
   const marker = await Jimp.read("resources/marker24.png")
   map.composite(marker, MAP_SIZE / 2 - marker.getWidth() / 2, MAP_SIZE / 2 - marker.getHeight())
   const font = await Jimp.loadFont(Jimp.FONT_SANS_12_BLACK)
   map.print(font, 15, MAP_SIZE - 15, "(c) OpenStreetMap contributors")
   return map
}

function  mercatorProjection(lat, long, zoom) {
   const xLargeMap = Math.floor(256 * ((long + 180) / 360 * Math.pow(2, zoom)))
   const yLargeMap = Math.floor(256 * ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)))
   return {xLargeMap, yLargeMap}
}

function readLatLong(filePath) {
   const fd = fs.openSync(filePath, "r")
   const buffer = new Buffer(SPACE_SIZE_FOR_EXIF_DATA)
   buffer.fill(0)
   fs.readSync(fd, buffer, null, SPACE_SIZE_FOR_EXIF_DATA)
   const parser = exif.create(buffer)
   const result = parser.parse()
   const gpsLatitude = parseFloat(result.tags.GPSLatitude)
   const gpsLongitude = parseFloat(result.tags.GPSLongitude)
   console.log(`lat: ${gpsLatitude} long ${gpsLongitude}`)
   return {gpsLatitude, gpsLongitude}
}

export async function osmMap(jimpImage, filePath) {
   const {gpsLatitude, gpsLongitude} = readLatLong(filePath)
   if(!isNaN(gpsLatitude) && !isNaN(gpsLongitude)) {
      //TODO settings
      const zoom = 16
      const map = await downloadOsmMap(gpsLatitude, gpsLongitude, zoom)
      const margin = 20
      const x = jimpImage.getWidth() - MAP_SIZE - 20
      const y = margin 
      jimpImage.composite(map, x, y)
   }
   return jimpImage
}
