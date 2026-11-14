Plan de trabajo — Earth Information Jukebox 

# Plan de trabajo — Earth Information Jukebox 

Nov 13, 2026 · @Elihú 

## Resumen 

Construyan una jukebox web que convierte fotogramas del EIC en música en vivo, y agreguen todo lo demás por capas. Así siempre tienen algo que presentar, aunque una capa no salga. 

Tienen unas 17 horas de trabajo en la sede: sábado de 09:00 a 19:45 y domingo de 07:00 a 14:00. Tres horas fijas mandan sobre todo el plan: 

- **Domingo 14:00:** se envía la presentación a los organizadores. 

- **Domingo 14:30:** pitch en inglés, máximo 3 minutos. 

- **Domingo 23:59:** cierra la entrega en la plataforma de NASA. El reporte se puede terminar después de la premiación local. 

La idea no necesita estar cerrada hoy. Necesita cuatro decisiones el sábado entre 09:00 y 10:00. Lo que no se decida a las 10:00 toma la opción por defecto y nadie lo vuelve a discutir. 

|Decisión|Opción por defecto|Depende de|
|---|---|---|
|Qué visualizaciones son<br>los discos|Temperatura del mar, hielo marino<br>y vegetación|Lo que haya en la pestaña<br>Recursos|
|De dónde salen los|Galería del EIC; si vienen sin|Revisar los archivos|
|fotogramas|fecha, NASA GIBS|reales|
|Modo de escucha principal|Barrido de oeste a este|Nada; es el más simple|
|Nombre del proyecto|Los Sonidos del Cambio de la<br>Tierra|Gusto del equipo|



Quedan fuera desde ahora el globo 3D, los géneros musicales y el aprendizaje automático. Cuestan muchas horas y no mejoran lo que el jurado evalúa. 

## Alcance por niveles 

El nivel 1 es el proyecto; los demás lo mejoran. Cada nivel tiene una hora de corte: si no está listo a esa hora, se abandona y se pasa a pulir lo que ya funciona. 

Page 1 of 17 

Plan de trabajo — Earth Information Jukebox 

|Nivel|Qué incluye|Hora de corte|
|---|---|---|
|1. Núcleo|Un disco, modo barrido, sintetizadores, reproducir<br>y pausar, publicado en una URL|Sábado 16:00|
|2. Proyecto|Tres discos con un timbre cada uno, modo "lugar|Sábado 19:30|
|completo|en el tiempo", accesibilidad, diseño pulido||
|3. Lo distintivo|Guitarras grabadas, distorsión según la anomalía,<br>acordes de una pieza romántica en un disco|Domingo<br>10:00|
|4. Si sobra tiempo|Más piezas, vibración en celular, subir una imagen<br>propia|Domingo<br>10:00|



Con el nivel 2 terminado ya cumplen el reto completo. El nivel 3 es lo que los separa de los otros equipos que eligieron este desafío en el mundo. 

De sus ideas, esto es lo que entra y dónde: 

- **Instrumentos por variable** (secciones de orquesta): nivel 2, con sintetizadores; nivel 3, con sus grabaciones. 

- **Disonancia según los datos:** nivel 1. Es el corazón del mapeo. 

- **Guitarras grabadas:** nivel 3. 

- **Base de música romántica:** nivel 3, una sola pieza. 

- **Interfaz elegante:** el esqueleto en nivel 1, el pulido en nivel 2. 

### El mapeo de imagen a música 

Este mapeo queda fijo desde el sábado a las 10:00. Cambiarlo después obliga a rehacer el trabajo de Datos y de Audio. 

|Rasgo de la imagen|Parámetro musical|
|---|---|
|Valor de la zona|Altura de la nota dentro de la escala; más valor, más<br>agudo|
|Signo de la anomalía|Timbre: brillante si está sobre lo normal, oscuro si<br>está debajo|
|Tamaño de la anomalía|Tensión: tríada limpia, luego séptimas, luego<br>segundas menores y tritonos|
|Variación entre píxeles vecinos|Densidad rítmica: de negras a semicorcheas|
|Cambio entre fotogramas|Tempo, de 60 a 120 pulsos por minuto|



Page 2 of 17 

Plan de trabajo — Earth Information Jukebox 

|Rasgo de la imagen|Parámetro musical|
|---|---|
|Longitud y latitud|Paneo estéreo y registro, en el modo barrido|



"Anomalía" tiene una definición operativa: el valor de una celda menos el promedio de esa misma celda en todos los fotogramas del disco. Si la visualización ya es un mapa de anomalías, se usa su valor directo. 

## Herramientas y arquitectura 

Este proyecto no necesita servidor, así que "backend" aquí significa los dos motores detrás de la interfaz: el de imagen y el de audio. Una API con base de datos consumiría horas y agregaría un punto de falla en la demo, sin aportar nada que el jurado evalúe. 

El flujo completo tiene cuatro pasos: 

1. Un script de Python toma los fotogramas de la visualización y los reduce a una rejilla de 32 por 16 celdas. 

2. El script convierte el color de cada celda a un valor usando la barra de colores de la imagen, y guarda todo en un archivo `disc.json` . 

3. La interfaz en React muestra el fotograma y le pasa el `disc.json` al motor de audio. 

4. El motor de audio, hecho con Tone.js, genera la música en el navegador en el momento, según la zona y el fotograma activos. 

El audio se sintetiza en vivo, que es lo que pide el reto. Lo precalculado es solo la lectura de la imagen, y eso hace la demo confiable sin internet. 

|Herramienta|Para qué|Quién la<br>usa|
|---|---|---|
|React con Vite|Interfaz; TypeScript solo si los dos de<br>frontend ya lo dominan|Frontend|
|CSS con variables, o<br>Tailwind|Estilos y temas por disco|Frontend|
|Canvas 2D|Dibujar el fotograma, la línea de barrido y la<br>tira de notas|Frontend B|
|Tone.js|Síntesis, samples, efectos y reloj musical|Audio|
|Python con Pillow y NumPy|Rejilla, color a valor, anomalía,<br>`disc.json`|Datos|
|ffmpeg|Extraer fotogramas si la visualización viene en<br>video|Datos|



Page 3 of 17 

Plan de trabajo — Earth Information Jukebox 

|Herramienta|Para qué|Quién la<br>usa|
|---|---|---|
|Audacity|Recortar y normalizar las grabaciones|Integración|
|NVDA|Lector de pantalla gratuito para Windows,<br>para las pruebas|Integración|
|GitHub y Vercel|Repositorio público y despliegue automático|Integración|
|OBS o la grabadora del<br>sistema|Video de respaldo de la demo|Integración|



### Los dos contratos 

Si estos dos acuerdos se cierran el sábado a las 10:00, las cinco personas pueden trabajar en paralelo sin bloquearse. 

**Contrato 1: el archivo que Datos entrega.** Cada disco es un `disc.json` con esta forma: 

```
{
  "id": "sst",
  "title": "Temperatura del mar",
  "units": "°C",
  "credit": "Nombre, autor y URL de la visualización",
  "grid": { "cols": 32, "rows": 16 },
  "frames": [
    {
      "date": "2024-03",
      "image": "frames/sst/012.jpg",
      "values": [0.42, 0.45, 0.47],
      "anomaly": [0.10, -0.05, 0.31],
      "text": "Marzo de 2024: Pacífico oriental sobre lo normal"
    }
  ]
}
```

`values` lleva 512 números de 0 a 1 y `anomaly` lleva 512 números de -1 a 1, ambos fila por fila. Datos entrega a las 10:30 un archivo falso con esta forma, para que Audio y Frontend no esperen a los datos reales. 

**Contrato 2: las funciones que Audio expone.** El frontend solo llama a estas seis y nunca toca Tone.js directamente: 

Page 4 of 17 

Plan de trabajo — Earth Information Jukebox 

```
loadDisc(disc)
play()
pause()
setMode("scan" | "region")
setRegion(col, row)
onNote(callback)   // avisa cada nota para dibujarla
```

### Reglas del repositorio 

- Cada quien es dueño de una carpeta: `src/ui` , `src/player` , `src/audio` , `pipeline` y `public/samples` . Nadie edita la carpeta de otro sin avisar. 

- Ramas cortas y fusión a `main` al menos cada dos horas. `main` siempre debe correr. Fotogramas, `disc.json` y samples viven dentro del repositorio. La demo no puede depender del internet de la sede. 

- El navegador bloquea el audio hasta que el usuario hace clic. Llamen a `Tone.start()` dentro del botón de reproducir, o no sonará nada. 

## Roles 

Cada persona es dueña de una parte que se puede probar sola, y la quinta persona tiene el rol que une a las demás. Ese rol no incluye redacción y es de los más importantes para ganar. 

Page 5 of 17 

Plan de trabajo — Earth Information Jukebox 

|Rol|Es dueño de|Entrega|
|---|---|---|
|Frontend A<br>(Elihú)|Dirección visual y estructura de<br>la interfaz|Tipografía, colores, selector de discos,<br>pantalla del disco, controles|
|Frontend B|El reproductor|Canvas con el fotograma, línea de<br>barrido, selección de zona, tira de<br>notas, texto en vivo|
|Datos|El motor de imagen|Fotogramas, script de Python,<br>`disc.json`de cada disco, descripción<br>por fotograma|
|Audio|El motor de sonido|Módulo de Tone.js con el mapeo, los<br>timbres y la leyenda sonora|
|Integración|Que todo funcione junto y se<br>oiga bien|Repositorio y despliegue, pruebas de<br>accesibilidad, grabación y edición de<br>guitarras, video de respaldo, tabla de<br>créditos|



La persona de Integración es quien prueba la aplicación con teclado, con lector de pantalla y con los ojos cerrados. Como la accesibilidad es el tema central del reto, sus hallazgos deciden qué se corrige primero. 

### La redacción se reparte 

Nadie escribe el reporte completo. Se arma en tres pasos: 

1. Cada dueño anota sus decisiones en `docs/notas.md` conforme las toma: qué hizo, por qué y qué descartó. De cinco a ocho viñetas por persona antes del sábado a las 19:30. 

2. Un editor, el que mejor redacte de los otros cuatro, convierte esas notas en el README el domingo. 

3. Los dos que dan el pitch revisan el texto en inglés. 

Integración aporta la tabla de créditos, que es una lista de nombres y enlaces y no requiere prosa. 

Elijan el sábado a las 09:00 al editor y a los dos del pitch. Para el pitch convienen quien tenga el inglés más claro y quien mejor maneje la demo. 

## Cronograma 

El plan se mide con seis puntos de control. Si un punto no se cumple a su hora, se recorta alcance; no se recorre el calendario. 

Page 6 of 17 

Plan de trabajo — Earth Information Jukebox 

|Hora|Debe ser cierto|
|---|---|
|Sábado 10:00|Cuatro decisiones tomadas, los dos contratos<br>acordados, repositorio creado|
|Sábado 12:00|Un fotograma real suena en el navegador, aunque<br>suene feo|
|Sábado 16:00|Nivel 1 publicado en una URL|
|Sábado 19:30|Tres discos, dos modos, notas de cada quien en<br>`docs/notas.md`|
|Domingo 10:00|Se congelan las funciones; a partir de aquí solo se<br>corrigen errores|
|Domingo 13:50|Dos ensayos cronometrados hechos, presentación<br>lista para enviar|



### Hoy viernes 

Solo preparen el equipo: instalen Node, Python, Audacity y NVDA, carguen laptops y empaquen audífonos, una bocina con cable y una extensión eléctrica. Pregunten a los organizadores si se permite adelantar código antes de las 09:00; si no hay respuesta, no adelanten. 

### Sábado 14 

El registro abre a las 07:00 y la bienvenida es a las 08:30. Mientras esperan, revisen la pestaña Recursos y anoten qué visualizaciones traen fotogramas con fecha. 

|Hora|Frontend A|Frontend B|Datos|Audio|Integración|
|---|---|---|---|---|---|
|09:00|Decisiones y|Decisiones y|Decisiones y|Decisiones y|Crea el repositorio,|
|a<br>10:00|contratos, todos<br>juntos|contratos|contratos|contratos|el proyecto de Vite<br>y el despliegue<br>vacío|
|10:00<br>a<br>12:00|Estructura de la<br>página, colores<br>y tipografía,<br>selector de<br>discos con<br>datos falsos|Canvas que<br>muestra un<br>fotograma y<br>mueve la línea<br>de barrido|`disc.json`falso<br>a las 10:30;<br>después, el<br>primer disco<br>real, aunque<br>tenga cinco<br>fotogramas|Motor con<br>sintetizadores que<br>lee el archivo falso<br>y toca en escala<br>pentatónica|Descarga<br>visualizaciones con<br>Datos y abre la<br>tabla de créditos|
|12:00<br>a 13:00|Comida|Comida|Comida|Comida|Comida; avisos a las<br>13:00|



Page 7 of 17 

Plan de trabajo — Earth Information Jukebox 

|Hora|Frontend A|Frontend B|Datos|Audio|Integración|
|---|---|---|---|---|---|
|13:00 a<br>16:00|Pantalla del<br>disco: carátula,<br>controles,<br>estados de<br>carga y error|Sincronía entre<br>audio e imagen,<br>tira de notas|Tres discos<br>completos con<br>anomalía por<br>celda|Tensión armónica,<br>densidad rítmica,<br>tempo y un timbre<br>por disco|Primera ronda de<br>pruebas con<br>teclado y NVDA;<br>lista de errores|
|16:00<br>a 19:30|Pulido visual,<br>foco de teclado<br>visible,<br>contraste|Modo "lugar en<br>el tiempo" y<br>texto en vivo de<br>lo que suena|Texto<br>descriptivo por<br>fotograma y<br>color de acento<br>por disco|Modo región y<br>leyenda sonora|Segunda ronda de<br>pruebas; graba un<br>clip de respaldo de<br>30 segundos|



A las 19:45 se guarda todo; la sede cierra a las 20:00. 

**Sábado en la noche, unas dos horas.** Nadie programa funciones nuevas. Integración y los dueños de las guitarras graban y editan los samples. Los dos del pitch escriben el borrador del guion. Quien lea partitura anota los acordes de la pieza elegida. Después, a dormir. 

### Domingo 15 

|Hora|Frontend A|Frontend B|Datos|Audio|Integración|
|---|---|---|---|---|---|
|07:00<br>a 10:00|Detalles de<br>diseño y pantalla<br>"cómo se<br>escucha"|Errores<br>pendientes;<br>vibración en<br>celular si sobra<br>tiempo|Compara<br>valores contra la<br>imagen original<br>y anota los<br>límites|Integra los<br>samples, la<br>distorsión por<br>anomalía y los<br>acordes de la<br>pieza|Coloca los<br>samples en el<br>repositorio y<br>prueba cada nota|
|10:00 a<br>12:00|Solo errores;<br>apoya las<br>diapositivas|Solo errores|Sección técnica<br>del README|Solo errores;<br>ajusta volúmenes<br>para la bocina|Video de respaldo<br>completo con<br>audio; prueba de<br>bocina en la sede|
|12:00 a<br>13:00|Comida|Comida|Comida|Comida|Comida|
|13:00 a<br>13:50|Ensayo|Ensayo|Hace de jurado|Hace de jurado|Cronometra y<br>etiqueta la versión<br>final en git|



El aviso de las 10:00 coincide con la congelación de funciones. De 10:00 a 12:00 los dos del pitch arman las diapositivas y el editor avanza el README, además de sus tareas. 

|Hora|Qué pasa|
|---|---|
|14:00|Envío de la presentación a los organizadores|



Page 8 of 17 

Plan de trabajo — Earth Information Jukebox 

|Hora|Qué pasa|
|---|---|
|14:30 a 17:30|Presentaciones ante el jurado|
|18:10|Premiación|
|19:15 a 23:00|Terminar el README y el formulario de NASA; subir<br>todo antes de las 23:00, no a las 23:59|



## Viabilidad de grabar las dos guitarras 

Es viable: toma unas tres horas de una persona y encaja el sábado en la noche, fuera de la sede. No se puede grabar en la sede, porque es un gimnasio y el eco y el ruido arruinan cualquier toma con micrófono. 

No hace falta grabar todas las notas. `Tone.Sampler` recibe unas cuantas y calcula las intermedias cambiando la afinación, y suena natural hasta unos tres semitonos de distancia. 

|Paso|Qué se hace|Tiempo<br>estimado|
|---|---|---|
|Grabar la clásica|De 8 a 12 notas de mi grave a mi agudo, una<br>cada tercera menor, dejando sonar 4<br>segundos|30 minutos|
|Grabar armónicos de la<br>clásica|Los seis armónicos del traste 12, para el<br>timbre del disco de hielo|10 minutos|
|Grabar la eléctrica|Las mismas 8 a 12 notas, sonido limpio|30 minutos|
|Editar en Audacity|Recortar el silencio inicial, normalizar,<br>desvanecer el final, exportar en mp3 mono|60 minutos|
|Integrar|Copiar a<br>`public/samples`y declarar las<br>notas en el<br>`Sampler`|30 minutos|



Cuatro cuidados evitan los problemas más comunes: 

- **Silencio inicial.** Si el archivo empieza con medio segundo de silencio, la nota suena tarde y rompe el ritmo. Recorten al inicio exacto del ataque. 

- **Nombre del archivo.** Usen el nombre de la nota, como `E2.mp3` o `Cs3.mp3` , para no equivocarse al declararlas. 

- **Eléctrica limpia.** La distorsión se agrega en código con `Tone.Distortion` , para que la anomalía la controle. Si la graban ya distorsionada, pierden ese control. 

Page 9 of 17 

Plan de trabajo — Earth Information Jukebox 

**Cómo grabar.** La eléctrica, por interfaz de audio si alguien tiene una; si no, el amplificador a volumen bajo con un celular a 30 centímetros. La clásica, con un celular a 20 centímetros de la boca, en un cuarto con cortinas o ropa que apague el eco. 

### Condiciones para que no ponga en riesgo el proyecto 

1. El motor de audio se programa primero con sintetizadores. Un `Sampler` se usa igual que un sintetizador, así que el cambio es de una línea por instrumento. 

2. Hora de corte: si los samples editados no están en el repositorio el domingo a las 09:00, la demo sale con sintetizadores. 

3. Para el piano no graben nada. Usen una librería libre como Salamander Grand Piano y citen su licencia en los créditos. 

Si llegan a tiempo, las guitarras son un argumento fuerte en el pitch: los instrumentos son suyos, grabados para este proyecto, y no hay ningún audio de terceros. 

## Cómo cumple el reto 

Con el nivel 2 terminado, el proyecto responde a cada punto de la página del desafío. Usen esta tabla el domingo a las 10:00 como lista de revisión. 

|Lo que pide el reto|Cómo lo cumple el proyecto|Nivel|
|---|---|---|
|Combinar imágenes del EIC con<br>sonificación generada en tiempo real|Fotogramas del EIC en pantalla y audio<br>sintetizado en el navegador al momento|1|
|Que el usuario seleccione una<br>visualización y oiga su paisaje sonoro|Selector de discos y botón de<br>reproducir, dos clics como máximo|1|
|Visión artificial sobre color, formas o<br>densidad de píxeles|Rejilla, lectura de color con la barra de la<br>imagen, variación espacial|1|
|Equilibrio entre precisión de datos y<br>musicalidad|Escalas y acordes fijos; los datos<br>deciden nota, tensión, ritmo y tempo|1|
|Experiencia de usuario intuitiva|Una sola pantalla, controles grandes,<br>leyenda "cómo se escucha"|2|
|Accesibilidad para personas ciegas o con<br>baja visión|Todo con teclado, lector de pantalla,<br>texto en vivo, leyenda sonora, un timbre<br>por disco|2|
|Texto descriptivo que acompañe al audio|Una frase por fotograma con fecha,<br>zona y valor|2|



Page 10 of 17 

Plan de trabajo — Earth Information Jukebox 

|Lo que pide el reto|Cómo lo cumple el proyecto|Nivel|
|---|---|---|
|Documentar el porqué de las decisiones<br>artísticas|Sección "Decisiones musicales" del<br>README|2|
|Impacto emocional: urgencia o belleza|La armonía se tensa cuando el dato se<br>aleja de lo normal|1|
|Retroalimentación táctil|Vibración del celular en valores<br>extremos; funciona en Android, no en<br>iPhone|4|



### La prueba de accesibilidad 

Integración repite estas cinco pruebas en cada ronda. Un fallo en cualquiera se corrige antes que cualquier mejora visual. 

- Elegir un disco y reproducirlo usando solo Tab, Enter, Espacio y flechas. 

- Con NVDA encendido, cada botón dice qué hace y el disco activo se anuncia. 

- El texto en vivo se lee solo cuando cambia el fotograma, sin interrumpir a cada nota. 

- Con los ojos cerrados, una persona ajena al equipo distingue un fotograma normal de uno anómalo. 

- El texto tiene buen contraste y el foco de teclado se ve en todos los controles. 

## README y documentación 

Escriban el README con las mismas secciones que pide el formulario de NASA, para copiar y pegar el domingo en la noche. Según la guía de entrega, el formulario pide: nombre, resumen general, enlace a la demo, enlace al proyecto final, descripción detallada, datos de NASA, datos de otras agencias y uso de inteligencia artificial. 

El README va en inglés, porque el jurado global lo lee. Pueden añadir un `README.es.md` si sobra tiempo. 

|Sección del|Qué contiene|Extensión|Sale de las|
|---|---|---|---|
|README|||notas de|
|Título, una frase y<br>captura|Qué es, en una línea; imagen de la<br>interfaz; enlace a la demo en vivo|3 líneas|Frontend A|
|Summary|Problema, solución y para quién,<br>sin tecnicismos|1 párrafo|Editor|



Page 11 of 17 

Plan de trabajo — Earth Information Jukebox 

|Sección del|Qué contiene|Extensión|Sale de las|
|---|---|---|---|
|README|||notas de|
|How to use it|Elegir disco, reproducir, cambiar<br>de modo, atajos de teclado|5 pasos|Frontend B|
|How it works|El flujo de cuatro pasos y la tabla<br>de mapeo de imagen a música|1 tabla y 1<br>párrafo|Datos y Audio|
|Musical decisions|El porqué de cada regla: escala,<br>tensión, timbres, la pieza elegida|5 a 8 viñetas|Audio|
|Accessibility|Qué se implementó y cómo se<br>probó, con resultados reales|5 viñetas|Integración|
|Data and limits|Qué visualizaciones se usaron,<br>resolución de la rejilla, qué no<br>mide el proyecto|1 tabla y 3<br>viñetas|Datos|
|Run it locally|Comandos para instalar y correr|4 líneas|Integración|
|Credits and<br>licenses|Cada visualización, librería, fuente<br>tipográfica y sample, con enlace y<br>licencia|1 tabla|Integración|
|Use of AI|Qué herramientas usaron, para<br>qué y en qué archivos|3 a 5 viñetas|Todos|
|Team|Nombres y roles|5 líneas|Editor|



### Reglas de redacción 

- Cada sección abre con su conclusión. El lector debe poder parar en la primera oración y haber entendido. 

- Números y nombres en lugar de adjetivos: "rejilla de 32 por 16" y no "análisis avanzado". 

- La sección de límites suma puntos. El criterio de validez premia al equipo que sabe qué no hace su proyecto. 

- Las notas de `docs/notas.md` van en español y en viñetas. El editor traduce y une; no reescribe desde cero. 

### Tres obligaciones de la entrega 

1. **Citar todo.** Los términos permiten retirar premios a equipos que no citen sus recursos, incluso los de código abierto. La tabla de créditos se llena conforme se descarga cada cosa, no al final. 

Page 12 of 17 

Plan de trabajo — Earth Information Jukebox 

2. **Declarar el uso de IA.** La guía pide indicar dónde y cómo se usó. El código y el audio generados con IA se reconocen en el texto; las imágenes y videos llevan marca visible. 

3. **Demo con formato fijo.** Un video de hasta 30 segundos con subtítulos en inglés, o hasta siete diapositivas en inglés contando la portada, en un enlace público externo. 

La página de la guía todavía muestra fechas de una edición anterior. Confirmen los campos y la hora de cierre en su propio formulario, y recuerden presionar "Submit for Judging". 

## Pitch de 3 minutos 

Empiecen con sonido y no con una diapositiva: el jurado debe oír el proyecto en los primeros veinte segundos. Un minuto completo del pitch es demo en vivo. 

Una persona habla (A) y la otra maneja la demo y explica la parte técnica (B). Así nadie habla y hace clic al mismo tiempo. 

|Tiempo|Quién|Qué pasa|Frase guía|
|---|---|---|---|
|0:00 a|A habla, B|Diez segundos de un|"Please close your eyes. This|
|0:20|reproduce|fotograma normal y luego uno<br>anómalo|is the ocean in a normal year.<br>And this is the same ocean in<br>[year]."|
|0:20 a<br>0:45|A|El problema|"NASA's Earth Information<br>Center shows our changing<br>planet in beautiful images. If<br>you cannot see them, you are<br>left out."|
|0:45 a<br>1:45|B maneja, A<br>narra|Demo: elegir disco, barrido,<br>cambiar a una zona, mostrar<br>teclado y texto en vivo|"Every note you hear comes<br>from the pixels on screen, in<br>real time."|
|1:45 a<br>2:20|B|Cómo funciona: rejilla, cuatro<br>rasgos, reglas musicales|"When the data is close to<br>normal, the harmony is clean.<br>The further it drifts, the more<br>tension you hear."|
|2:20 a<br>2:45|A|Accesibilidad y lo propio:<br>guitarras grabadas, pruebas<br>con lector de pantalla|"It works with a keyboard<br>and a screen reader, and the<br>instruments are ours."|
|2:45 a|A|Cierre con el nombre y una|"[Project name]: Earth's data,|
|3:00||frase|for everyone who listens."|



Page 13 of 17 

Plan de trabajo — Earth Information Jukebox 

Sustituyan los corchetes por datos reales de sus fotogramas. No digan ningún año ni cifra que no esté en su `disc.json` . 

### Las diapositivas 

Hagan siete, en inglés, para que la misma presentación sirva como demo en el formulario de NASA. 

1. Nombre, una frase y los nombres del equipo. 

2. El problema, en una oración grande. 

3. Captura de la interfaz; es el respaldo si la demo en vivo falla. 

4. La tabla de mapeo de imagen a música, con seis filas como máximo. 

5. Accesibilidad: lo implementado y cómo se probó. 

6. Lo que es propio y lo que sigue: guitarras, límites honestos, próximo paso. 

7. Enlace a la demo, código QR y créditos de NASA. 

### Reglas de ensayo 

- El guion completo tiene 300 palabras como máximo. Con las pausas de sonido, eso llena los tres minutos. 

- Apunten a terminar en 2:50. Si los cortan a media frase, pierden el cierre. 

- Tres ensayos con cronómetro: uno el sábado en la noche solo con el guion, dos el domingo con la demo. 

- Antes de subir, abran la aplicación y hagan un clic en ella. El navegador no reproduce audio sin un clic previo. 

- Lleven su propia bocina con cable. En un gimnasio, las bocinas de la laptop no se oyen. 

- Si la demo falla, B abre el video de respaldo sin disculparse y A sigue narrando. 

- Frases cortas y despacio. Un inglés sencillo y claro puntúa mejor que uno rápido y enredado. 

## Preguntas del jurado 

Cada respuesta sigue la misma forma: la respuesta directa en una oración, una evidencia concreta y, si aplica, el límite dicho con honestidad. Entre 20 y 30 segundos por respuesta. 

El jurado local evalúa con cinco criterios, según la guía de jueces: influencia, creatividad, validez, relevancia y presentación. Casi toda pregunta cae en uno de ellos. 

Page 14 of 17 

Plan de trabajo — Earth Information Jukebox 

|Pregunta probable|Respuesta base|Criterio|
|---|---|---|
|¿Para quién es esto?|Para personas ciegas o con baja<br>visión, y para cualquiera que entienda<br>mejor oyendo. Sirve en museos, aulas<br>y en el propio EIC.|Influencia|
|¿Qué lo hace distinto de otras<br>sonificaciones?|La disonancia representa la distancia<br>a lo normal, el sonido sale de la<br>imagen en vivo y los instrumentos los<br>grabamos nosotros.|Creatividad|
|¿Qué tan fiel es el sonido a los<br>datos?|Leemos el color con la barra de la<br>propia visualización, en una rejilla de<br>32 por 16. Es una lectura de la imagen<br>publicada, no del dato crudo.|Validez|
|¿Por qué música y no un tono<br>directo por dato?|El reto pide equilibrio con la<br>musicalidad. Las reglas son fijas: la<br>misma imagen siempre produce la<br>misma música.|Validez|
|¿La pieza clásica no sesga la<br>emoción?|La pieza solo aporta los acordes. Con<br>datos normales suena intacta; todo<br>cambio audible viene de los píxeles.|Validez|
|¿Lo probaron con personas<br>ciegas?|Digan exactamente lo que hicieron:<br>lector de pantalla, teclado y prueba a<br>ojos cerrados. Probar con usuarios es<br>el siguiente paso.|Relevancia|
|¿Qué datos de NASA usaron?|Nombren las visualizaciones del EIC<br>con su título y de dónde se<br>descargaron.|Relevancia|
|¿Por qué no tiene servidor?|Para que funcione sin conexión y<br>cualquiera pueda alojarlo gratis. La<br>lectura de imagen se precalcula; el<br>audio se genera en vivo.|Relevancia|
|¿Usaron inteligencia artificial?|La verdad, con detalle: qué<br>herramienta, para qué y en qué parte.|Presentación|
|¿Qué harían con más tiempo?|Leer el dato crudo de NASA en lugar<br>del color, probar con usuarios ciegos<br>y añadir más discos.|Influencia|



Page 15 of 17 

Plan de trabajo — Earth Information Jukebox 

### Cómo responder 

- Responde una sola persona por pregunta. Acuerden antes quién toma cada tema: datos, audio, interfaz, accesibilidad. 

- Los cinco deben poder explicar la tabla de mapeo. Es la pregunta técnica más probable. 

- Si no saben algo, digan "no lo medimos" o "no lo probamos" y qué harían para saberlo. Inventar una cifra frente a un jurado técnico cuesta más que admitir un límite. 

- Si la pregunta es una crítica, concedan lo cierto primero y luego expliquen la decisión. Pregunten a los organizadores en qué idioma serán las preguntas y preparen las respuestas en ambos. 

## Riesgos y planes B 

El riesgo más probable es que las visualizaciones del EIC no vengan como fotogramas con fecha. Se detecta el sábado antes de las 10:00 y tiene salida. 

|Riesgo|Señal de alerta|Plan B|
|---|---|---|
|Las visualizaciones del EIC no<br>sirven como fotogramas<br>fechados|Datos no tiene un disco<br>real a las 12:00|Tomar fotogramas fechados<br>de NASA GIBS y usar las<br>imágenes del EIC como<br>carátulas|
|No hay barra de colores para<br>leer el valor|El script no encuentra la<br>leyenda|Usar tono y brillo del píxel<br>como valor, y decirlo en los<br>límites|
|El internet de la sede falla|Las descargas tardan el<br>sábado temprano|Todo vive en el repositorio; un<br>celular como punto de acceso<br>para el despliegue|
|El audio no se oye en el<br>gimnasio|Prueba de bocina del<br>domingo a las 11:00|Bocina propia con cable;<br>video de respaldo con audio|
|Los samples de guitarra no<br>quedan|No están en el repositorio<br>el domingo a las 09:00|La demo sale con<br>sintetizadores|
|Conflictos al fusionar código|Dos personas editan el<br>mismo archivo|Una carpeta por dueño;<br>Integración fusiona|
|La laptop de la demo falla|Cualquier error el<br>domingo|La URL publicada abierta en<br>una segunda laptop|



Page 16 of 17 

Plan de trabajo — Earth Information Jukebox 

|Riesgo|Señal de alerta|Plan B|
|---|---|---|
|Alguien se queda sin tarea|Más de 15 minutos sin|Pasa a apoyar a Integración|
||avanzar|con pruebas o créditos|
|El equipo se atora discutiendo|Pasan las 10:00 del sábado|Se aplican las opciones por|
|la idea|sin decidir|defecto del resumen|



## Fuentes 

- <u>Página del desafío The Earth Information Jukebox</u> 

- <u>Cronograma del evento local de Ensenada</u> 

- <u>Guía de entrega de proyectos</u> 

- <u>Guía de jueces y premios</u> 

- <u>Términos y condiciones para participantes</u> 

Page 17 of 17 

