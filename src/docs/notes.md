# Notes
## Audio 

## Data

- **Pipeline en Python, precalculado.** `pipeline/` lee cada imagen de NASA SVS y escribe `public/discs/<id>.json` (rejilla de 32x16 = 512 celdas). Se corre una vez en la laptop; la app solo lee los JSON, así la demo no depende de internet ni de un servidor. Descartado: leer las imágenes en el navegador (más lento y frágil en la demo).
- **Color a valor por tono, no por RGB.** `colorbar.py` mide el tono a lo largo de la barra de colores de la propia visualización y busca el tono de cada píxel en ella. En el SVS el color del dato se ve más claro u oscuro (trazos de corriente, mezcla con el mapa de fondo) pero conserva el tono. Ignora píxeles grises (tierra, nieve) y casi negros. Probado leyendo la propia barra: 0.00 a 0.98 en pasos parejos.
- **Discos elegidos y por qué.** Temperatura del mar: SVS 3912 (11 meses, abr 2007 a feb 2008, 0 a 32 °C). CO2: SVS 5436, versión plana de la 5196 (13 fechas, ene a mar 2020). Aerosoles: SVS 5669 (una imagen, 19 ago 2025). Descartado: SVS 5425 para temperatura del agua, porque es un globo que gira y sus colores son profundidad, no temperatura; y la 5196 de CO2, porque la cámara gira y los píxeles cambian de lugar.
- **Máscara de celdas sin dato.** En temperatura del mar la tierra no tiene dato: 381 de 512 celdas son mar. Se agregó `mask` al contrato para que esas celdas suenen en silencio en lugar de sonar como "agua fría".
- **CO2 como fracción de área, no como ppm.** La barra de CO2 es transparente abajo de ~430 ppm y la mitad de los píxeles pintados está en ~431 ppm; leer ppm dejaba el disco casi plano (máximo 0.18). El valor es qué parte de la celda tiene CO2 de 430 ppm o más (máximo 0.97). Se compara siempre la misma hora del día para no confundir el ciclo día/noche de las plantas con un cambio entre fechas.
- **Aerosoles por tipo de partícula.** La leyenda no es escala sino 4 colores (carbono negro, polvo, sal marina, sulfato). `categories.py` quita la parte gris de cada píxel y compara el color restante con la leyenda. Cada celda trae el valor de cada tipo en `layers` y la suma en `values`, para poder dar un instrumento por tipo. Comprobado: Antártida y Groenlandia dan ~0 %; polvo sobre el Sahara y el Atlántico, humo en África central.
- **Anomalía.** Varios fotogramas: valor de la celda menos su promedio en todas las fechas, escalado a -1..1 con un solo número por disco. Un solo fotograma (aerosoles): contra el promedio del mapa, o sea qué tanto se aleja cada zona del resto del planeta.
- **Límites (para la sección Data and limits).** Leemos la imagen publicada, no el dato crudo. Temperatura: la anomalía mide el ciclo de las estaciones de un año, no el cambio climático. CO2: no da ppm exactos y la lectura de la barra tiene un error de ~2 ppm. Aerosoles: es intensidad de color, no µg/m³. La rejilla de 32x16 promedia celdas de ~11° x 11°.

## Frontend A

## Frontend B

## Integration
