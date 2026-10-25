#!/bin/bash
# codifica los cuadros de fin-h (horizontal) y fin-v (vertical) en MP4 (H.264) y WebM (VP9)
cd "$(dirname "$0")"; mkdir -p salida
for o in h v; do
  n=$([ $o = h ] && echo esc || echo tel)
  ffmpeg -v error -y -framerate 60 -i fin-$o/f%04d.png -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -profile:v high -level 4.2 -movflags +faststart -an salida/intro-$n.mp4
  ffmpeg -v error -y -framerate 60 -i fin-$o/f%04d.png -c:v libvpx-vp9 -crf 37 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -an salida/intro-$n.webm
done
cp salida/intro-* ../../img/ && ls -la ../../img/intro-*
