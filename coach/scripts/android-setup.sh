#!/usr/bin/env bash
# Prepares the generated Android project: icons, mic + notification permissions, portrait, version.
set -euo pipefail
ICON=assets/icon-512.png
RES=android/app/src/main/res
for d in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  dir=${d%%:*}; px=${d##*:}; fg=$((px*108/48))
  convert $ICON -resize ${px}x${px} $RES/mipmap-$dir/ic_launcher.png
  convert $ICON -resize ${px}x${px} $RES/mipmap-$dir/ic_launcher_round.png
  convert $ICON -resize $((fg*70/100))x$((fg*70/100)) -background "#F2B705" -gravity center -extent ${fg}x${fg} $RES/mipmap-$dir/ic_launcher_foreground.png
done
if [ -f $RES/values/ic_launcher_background.xml ]; then sed -i 's/#FFFFFF/#F2B705/I' $RES/values/ic_launcher_background.xml; fi
MAN=android/app/src/main/AndroidManifest.xml
grep -q RECORD_AUDIO $MAN || sed -i 's#<uses-permission android:name="android.permission.INTERNET" />#<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />#' $MAN
grep -q "RecognitionService" $MAN || sed -i 's#<application#<queries>\n        <intent><action android:name="android.speech.RecognitionService" /></intent>\n        <intent><action android:name="android.intent.action.TTS_SERVICE" /></intent>\n    </queries>\n    <application#' $MAN
sed -i 's/<activity\b/<activity android:screenOrientation="portrait"/' $MAN
GRADLE=android/app/build.gradle
sed -i "s/versionCode 1$/versionCode ${VERSION_CODE:-1}/; s/versionName \"1.0\"/versionName \"1.0.${VERSION_CODE:-1}\"/" $GRADLE
