import { resize } from "./resizer.js"
import { watermark } from "./watermarker.js"
import { osmMap } from "./mappainter.js"

export async function repaint(jimpImage, filePath) {
  jimpImage = await resize(jimpImage)
  jimpImage = await watermark(jimpImage)
  jimpImage = await osmMap(jimpImage, filePath)
  return jimpImage
}
