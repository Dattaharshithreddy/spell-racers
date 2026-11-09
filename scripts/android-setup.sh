#!/usr/bin/env bash
# Prepares the generated Android project: icons, mic permission, full screen, any orientation, version.
set -euo pipefail
ICON=assets/art/icon-512.png
RES=android/app/src/main/res
for d in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  dir=${d%%:*}; px=${d##*:}; fg=$((px*108/48))
  convert $ICON -resize ${px}x${px} $RES/mipmap-$dir/ic_launcher.png
  convert $ICON -resize ${px}x${px} $RES/mipmap-$dir/ic_launcher_round.png
  convert $ICON -resize $((fg*66/100))x$((fg*66/100)) -background "#1E1B3A" -gravity center -extent ${fg}x${fg} $RES/mipmap-$dir/ic_launcher_foreground.png
done
if [ -f $RES/values/ic_launcher_background.xml ]; then sed -i 's/#FFFFFF/#1E1B3A/I' $RES/values/ic_launcher_background.xml; fi
MAN=android/app/src/main/AndroidManifest.xml
grep -q RECORD_AUDIO $MAN || sed -i 's#<uses-permission android:name="android.permission.INTERNET" />#<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />#' $MAN
# speech recognizer + TTS engine visibility on Android 11+
grep -q "RecognitionService" $MAN || sed -i 's#<application#<queries>\n        <intent><action android:name="android.speech.RecognitionService" /></intent>\n        <intent><action android:name="android.intent.action.TTS_SERVICE" /></intent>\n    </queries>\n    <application#' $MAN
sed -i 's/<activity\b/<activity android:screenOrientation="fullSensor"/' $MAN
GRADLE=android/app/build.gradle
sed -i "s/versionCode 1$/versionCode ${VERSION_CODE:-1}/; s/versionName \"1.0\"/versionName \"3.0.${VERSION_CODE:-1}\"/" $GRADLE
STY=$RES/values/styles.xml
sed -i 's#<item name="android:background">@null</item>#<item name="android:background">@null</item>\n        <item name="android:windowFullscreen">true</item>#' $STY || true
