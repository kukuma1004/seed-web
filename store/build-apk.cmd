@echo off
REM 휴대폰에 직접 설치할 수 있는 APK 만들기 (스토어 업로드용은 build-aab.cmd)
setlocal
set "JAVA_HOME=%USERPROFILE%\dev-tools\jdk21"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "SEED_ROOT=%~dp0.."
cd /d "%SEED_ROOT%"
call npx vite build || goto :error
call npx cap sync android || goto :error
cd /d "%SEED_ROOT%\android"
call "%SEED_ROOT%\android\gradlew.bat" assembleRelease --no-daemon || goto :error
echo.
echo 완료: android\app\build\outputs\apk\release\app-release.apk
echo 이 파일을 휴대폰으로 옮겨 설치하세요(알 수 없는 앱 설치 허용 필요).
pause
exit /b 0

:error
echo.
echo 실패했습니다. 위 메시지를 확인하세요.
pause
exit /b 1
