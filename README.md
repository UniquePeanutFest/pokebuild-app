# 🎮 PokéBuild - Constructor de Equipos Pokémon

Una aplicación web moderna construida con Ionic y Angular para crear, gestionar y analizar equipos de Pokémon con funcionalidades avanzadas de exportación.

## ✨ Características Principales

### 🏗️ Constructor de Equipos
- **Creación de equipos** personalizados con hasta 6 Pokémon
- **Análisis automático** de balance y sinergias del equipo
- **Modos de juego** PvE (Historia) y PvP (Competitivo)
- **Gestión de formas especiales** (Mega Evoluciones, Gigantamax)

### 📊 Análisis Avanzado
- **Distribución de tipos** y roles del equipo
- **Detección de sinergias** y combinaciones populares
- **Recomendaciones inteligentes** de objetos
- **Estadísticas detalladas** de cada Pokémon

### 🖼️ Exportación de Equipos
- **Exportar como imagen** en formato PNG o JPG
- **Vista previa** antes de exportar
- **Calidad ajustable** para archivos JPG
- **Diseño profesional** optimizado para compartir

### 🎨 Interfaz Moderna
- **Diseño responsive** para todos los dispositivos
- **Tema Pokémon** auténtico con colores oficiales
- **Animaciones fluidas** y transiciones suaves
- **Navegación intuitiva** y fácil de usar

## 🚀 Tecnologías Utilizadas

- **Ionic 7** - Framework de aplicaciones móviles
- **Angular 17** - Framework de desarrollo web
- **TypeScript** - Lenguaje de programación
- **SCSS** - Preprocesador de CSS
- **Capacitor** - Puente nativo para móviles
- **html2canvas** - Captura de pantalla para exportación

## 📱 Instalación y Uso

### Requisitos Previos
- Node.js 18+
- npm o yarn
- Git

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/UniquePeanutFest/pokebuild-app.git

# Navegar al directorio
cd pokebuild-app

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start
```

### Compilación para Producción
```bash
# Compilar para web
npm run build

# Compilar para Android (requiere Java JDK)
npm run build
npx cap sync android
npx cap open android
```

## 🌐 Demo en Vivo

La aplicación está disponible en GitHub Pages: [Ver Demo](https://uniquepeanutfest.github.io/pokebuild-app/)

## 📱 Aplicación Móvil

### Android
Para compilar la APK de Android:

1. Instalar Java JDK 17+
2. Ejecutar:
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

La APK se generará en `android/app/build/outputs/apk/debug/`

## 🎯 Funcionalidades Detalladas

### Gestión de Equipos
- ✅ Crear, editar y eliminar equipos
- ✅ Añadir/remover Pokémon del equipo
- ✅ Asignar objetos a Pokémon
- ✅ Cambiar formas especiales (Mega, Gigantamax)

### Análisis de Equipos
- ✅ Balance automático del equipo
- ✅ Distribución de tipos
- ✅ Roles y sinergias
- ✅ Detección de combinaciones populares

### Exportación
- ✅ Imágenes de alta calidad
- ✅ Formatos PNG y JPG
- ✅ Vista previa antes de exportar
- ✅ Descarga automática

## 🔧 Configuración de Desarrollo

### Estructura del Proyecto
```
src/
├── app/
│   ├── home/                 # Página principal
│   ├── teams/               # Gestión de equipos
│   ├── pokemon-details/     # Detalles de Pokémon
│   ├── item-selector-modal/ # Selector de objetos
│   ├── shared/              # Componentes compartidos
│   └── Services/            # Servicios de datos
```

### Scripts Disponibles
- `npm start` - Servidor de desarrollo
- `npm run build` - Compilación para producción
- `npm test` - Ejecutar pruebas
- `npm run lint` - Verificar código

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- **PokéAPI** - API de datos de Pokémon
- **Ionic Team** - Framework de desarrollo móvil
- **Angular Team** - Framework de desarrollo web
- **Comunidad Pokémon** - Inspiración y feedback

## 📞 Contacto

- **GitHub**: [@UniquePeanutFest](https://github.com/UniquePeanutFest)
- **Proyecto**: [PokéBuild App](https://github.com/UniquePeanutFest/pokebuild-app)

---

⭐ ¡Si te gusta este proyecto, no olvides darle una estrella! ⭐
