# Astro Code Editor AI — Guía general

**Astro Code Editor AI** es un editor de código ligero y rápido con inteligencia artificial integrada. Está pensado para programar sin que el equipo se vuelva lento: consume muy poca memoria y se abre en segundos.

> Nota: este editor **no** tiene relación con el framework web *Astro*; son proyectos independientes.

---

## ¿Qué problema resuelve?

Los editores modernos suelen consumir mucha memoria y recursos. Astro Code Editor AI ofrece lo esencial para escribir código con comodidad —resaltado, autocompletado, terminal, asistente de IA— ocupando una fracción de los recursos de otras herramientas.

---

## Características principales

- **Ligero y rápido:** pensado para equipos modestos; arranca rápido y usa poca memoria.
- **Asistente de IA integrado:** ayuda a escribir, explicar y corregir código desde el propio editor.
- **Autocompletado inteligente:** sugiere código mientras escribes (soporte LSP).
- **Ejecutar archivos (sin depurar):** abre un archivo y pulsa `Ctrl+F5` para ver el resultado en el panel de **SALIDA** del depurador.
- **Programas que piden datos:** si tu programa usa `Console.ReadLine()` (C#) o `input()` (Python), escribe el valor en la línea que aparece al final de **SALIDA** y pulsa `Enter`. Puedes enviar varios valores uno por uno.
- **Depuración paso a paso:** para archivos JavaScript/TypeScript puedes poner puntos de interrupción (breakpoints) haciendo clic en el margen izquierdo del editor, pausar la ejecución con `F5`, avanzar línea a línea (`F10`, `F11`), inspeccionar variables y ver la pila de llamadas.
- **Autocompletado y colores de C# (IntelliSense):** al escribir C# el editor sugiere clases, métodos y propiedades, muestra la documentación al pasar el ratón, ayuda con los parámetros de cada método, marca errores en tiempo real, permite saltar a la definición de un símbolo y colorea con el servidor de lenguaje las clases, métodos, propiedades, campos, parámetros y variables que tú creas.
- **Herramientas .NET:** desde la paleta de comandos puedes **crear un proyecto .NET** (`.NET: Crear proyecto...`), compilarlo, ejecutarlo, probarlo o restaurar dependencias, eligiendo el tipo de proyecto de una lista (Consola, Web API, Biblioteca de clases, etc.).
- **Ejecutar C# sin instalar el SDK de .NET:** si tu equipo no tiene el SDK, el editor te ofrece ejecutar el archivo en la nube (servicio Piston de emkc.org). **Siempre se pide confirmación antes de enviar el código**, porque sale de tu computadora.
- **Reproductor de música en la nube:** escucha música mientras programas sin ocupar espacio en tu equipo.
- **Temas y personalización:** cambia la apariencia desde *Archivo → Temas*. Los temas **VS Code Dark+** y **VS Code Light+** usan exactamente los mismos colores de sintaxis que VS Code para comentarios, palabras clave, tipos, funciones, variables, textos y operadores. **VS Dark Experimental** reproduce el tema experimental 2026 Dark de VS Code, que usa una paleta distinta (por eso puede no parecerse a Dark+).

---

## Primeros pasos

1. Abre el editor.
2. Abre una carpeta de tu proyecto con **Archivo → Abrir carpeta...**.
3. Edita tus archivos normalmente. El asistente de IA está disponible en el panel lateral.
4. Para probar algo rápido: abre un archivo y pulsa `Ctrl+F5`; la salida aparece en la parte inferior, en el panel **SALIDA**.
5. Para depurar JavaScript/TypeScript: haz clic en el margen izquierdo de una línea para poner un *breakpoint* y pulsa `F5`.

---

## Atajos útiles

| Atajo | Qué hace |
| :--- | :--- |
| `Ctrl+F5` | Ejecutar el archivo abierto |
| `F5` | Iniciar o continuar la depuración |
| `Shift+F5` | Detener lo que se está ejecutando |
| `F10` / `F11` | Avanzar paso a paso mientras está pausado |
| `Ctrl+Shift+P` o `F1` | Abrir la paleta de comandos |
| `Ctrl+P` | Ir rápidamente a un archivo |
| `Ctrl+B` | Mostrar u ocultar la barra lateral |
| `Shift+Alt+F` | Formatear el archivo C# abierto |

---

## Crear un proyecto .NET

1. Pulsa `Ctrl+Shift+P` para abrir la paleta de comandos.
2. Escribe `Crear proyecto` y elige **.NET: Crear proyecto...**.
3. Selecciona el tipo de proyecto de la lista (por ejemplo, *Console App*).
4. Escribe el nombre del proyecto y elige dónde guardarlo.
5. El editor crea el proyecto y lo muestra en el explorador de archivos.

Si no tienes el SDK de .NET instalado, el editor te mostrará las instrucciones para instalarlo. Aun así, puedes ejecutar archivos C# sueltos en la nube (con tu confirmación previa). Esa ejecución en la nube **no activa el autocompletado**: Piston solo ejecuta el código, mientras que las sugerencias necesitan el SDK y `csharp-ls` en tu computadora.

---

## Activar el autocompletado de C#

El autocompletado avanzado de C# necesita el SDK de .NET y una herramienta gratuita llamada `csharp-ls`. El editor puede instalarlos por ti, sin permisos de administrador y sin tocar el resto del sistema:

1. Haz clic en el icono de la **llave inglesa** en la barra lateral izquierda (sección **Herramientas y SDK**). También puedes abrir la paleta con `Ctrl+Shift+P` y buscar **Instalar compiladores y SDK**.
2. En la tarjeta **.NET SDK**, pulsa **Instalar**. Se descargará la versión más reciente (unos 250 MB) dentro de tu carpeta de usuario y se comprobará que la descarga es auténtica.
3. Espera a que termine: el editor instalará también `csharp-ls` y activará el IntelliSense automáticamente.
4. Abre una carpeta que contenga un proyecto de C# (archivo `.csproj` o `.sln`).

A partir de ahí tendrás sugerencias mientras escribes, ayuda de parámetros, documentación, errores señalados en el código y salto a la definición con `F12`.

El autocompletado necesita que el archivo forme parte de un proyecto de C#. Si abres un archivo suelto, el editor te avisará: crea un proyecto con **.NET: Crear proyecto...** o abre la carpeta que contiene el archivo `.csproj` o `.sln`. Si abres una subcarpeta, el editor localiza el proyecto más cercano automáticamente.

En esa misma sección puedes **desactivar** temporalmente una herramienta o **desinstalarla** cuando quieras. Si tu computadora ya tiene .NET instalado, aparecerá como **Sistema** y no hará falta descargar nada.

---

## Privacidad y seguridad

- El editor no incluye telemetría.
- Tu código nunca se envía a ningún servicio externo sin que lo confirmes explícitamente; la ejecución en la nube solo ocurre si aceptas el aviso que aparece en pantalla.
- La ejecución y la depuración locales se realizan en tu propia computadora.

---

## Preguntas frecuentes

**¿Puedo depurar Python o C#?**
La depuración paso a paso está disponible para JavaScript/TypeScript. Python, C#, Go, Rust y otros lenguajes se pueden **ejecutar** con `Ctrl+F5` mostrando su salida en el panel de SALIDA.

**¿Necesito instalar algo para ejecutar archivos?**
Solo el runtime del lenguaje correspondiente (Node, Python, etc.). Si no lo tienes, el editor puede ofrecer la ejecución en la nube cuando exista soporte.

**¿Cómo ingreso datos a un programa que los pide?**
Cuando el programa se detiene esperando un dato, al final del panel **SALIDA** aparece una línea con el símbolo `›`. Escribe el valor y pulsa `Enter`; el programa lo recibe como si lo hubieras escrito en una consola. Los programas ejecutados en la nube (Piston) no permiten este tipo de entrada.

**¿Dónde veo los errores de compilación de .NET?**
En el panel de SALIDA del depurador, con el botón *Limpiar salida* para vaciarlo.

**¿Cómo formateo un archivo de C#?**
Abre el archivo y pulsa `Shift+Alt+F`, o haz clic derecho y elige **Formatear documento**. También puedes formatear solo un fragmento seleccionándolo y usando `Ctrl+K Ctrl+F`. El formato usa el mismo proyecto de C# que el autocompletado, así que necesita el SDK y `csharp-ls` instalados.

**¿Por qué la tecla Tab a veces no indenta?**
Ya no debería pasar: si el menú de sugerencias está abierto, `Tab` lo cierra e indenta en lugar de aceptar una sugerencia. Para aceptar una sugerencia puedes usar `Enter` o hacer clic en ella. Dentro de una plantilla de código (snippet), `Tab` sigue sirviendo para pasar al siguiente hueco.

---

## Licencia

GPLv3 — software libre, abierto y sin telemetría.
