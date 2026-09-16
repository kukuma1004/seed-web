@echo off
REM SEED 안드로이드 앱 파일(AAB) 만들기 - 더블클릭하면 됩니다.
REM 웹 빌드 -> 안드로이드 프로젝트에 복사 -> 서명된 AAB 생성
setlocal
set "JAVA_HOME=%USERPROFILE%\dev-tools\jdk21"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "SEED_ROOT=%~dp0.."
cd /d "%SEED_ROOT%"

echo [1/3] 웹 빌드
call npx vite build || goto :error
echo [2/3] 안드로이드 프로젝트에 복사
call npx cap sync android || goto :error
echo [3/3] 서명된 AAB 만들기
cd /d "%SEED_ROOT%\android"
call "%SEED_ROOT%\android\gradlew.bat" bundleRelease --no-daemon || goto :error
cd /d "%SEED_ROOT%"

echo.
echo 완료: android\app\build\outputs\bundle\release\app-release.aab
echo 휴대폰에 바로 설치할 APK가 필요하면: store\build-apk.cmd
pause
exit /b 0

:error
echo.
echo 실패했습니다. 위 메시지를 확인하세요.
pause
exit /b 1
