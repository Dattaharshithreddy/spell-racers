#!/usr/bin/env bash
# Prepares the generated Android project: app icons, portrait mode, full screen, version.
set -euo pipefail
RES=android/app/src/main/res
for d in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  dir=${d%%:*}; px=${d##*:}; fg=$((px*108/48))
  convert icon-512.png -resize ${px}x${px} $RES/mipmap-$dir/ic_launcher.png
  convert icon-512.png -resize ${px}x${px} $RES/mipmap-$dir/ic_launcher_round.png
  convert icon-512.png -resize $((fg*66/100))x$((fg*66/100)) -background "#170F33" -gravity center -extent ${fg}x${fg} $RES/mipmap-$dir/ic_launcher_foreground.png
done
if [ -f $RES/values/ic_launcher_background.xml ]; then sed -i 's/#FFFFFF/#170F33/I' $RES/values/ic_launcher_background.xml; fi
MAN=android/app/src/main/AndroidManifest.xml
sed -i 's/<activity\b/<activity android:screenOrientation="portrait"/' $MAN
grep -q RECORD_AUDIO $MAN || sed -i 's#<uses-permission android:name="android.permission.INTERNET" />#<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />#' $MAN
# version from the run number
GRADLE=android/app/build.gradle
sed -i "s/versionCode 1$/versionCode ${VERSION_CODE:-1}/; s/versionName \"1.0\"/versionName \"2.0.${VERSION_CODE:-1}\"/" $GRADLE
# immersive full-screen theme
STY=$RES/values/styles.xml
sed -i 's#<item name="android:background">@null</item>#<item name="android:background">@null</item>\n        <item name="android:windowFullscreen">true</item>#' $STY || true
