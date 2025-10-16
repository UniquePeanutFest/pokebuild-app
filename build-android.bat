@echo off
echo ========================================
echo    PokéBuild - Compilación Android
echo ========================================
echo.

echo [1/4] Compilando aplicación web...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Fallo en la compilación web
    pause
    exit /b 1
)

echo.
echo [2/4] Sincronizando con Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Fallo en la sincronización
    pause
    exit /b 1
)

echo.
echo [3/4] Verificando Java...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Java no está instalado o no está en el PATH
    echo.
    echo Para compilar la APK necesitas:
    echo 1. Instalar Java JDK 17 o superior
    echo 2. Configurar la variable JAVA_HOME
    echo 3. Agregar Java al PATH del sistema
    echo.
    echo Descarga Java desde: https://adoptium.net/
    echo.
    pause
    exit /b 1
)

echo.
echo [4/4] Compilando APK...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo ERROR: Fallo en la compilación de la APK
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ========================================
echo    ¡Compilación exitosa!
echo ========================================
echo.
echo La APK se encuentra en:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Puedes instalar la APK en tu dispositivo Android
echo habilitando "Orígenes desconocidos" en configuración.
echo.
pause
