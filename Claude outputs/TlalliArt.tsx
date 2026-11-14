// Uso: <TlalliArt listening={playing} />  ·  Copiar tlalli.svg y Tlalli.css a la misma carpeta.
import svg from './tlalli.svg?raw';
import './Tlalli.css';

export function TlalliArt({ listening = false }: { listening?: boolean }) {
  return (
    <div
      className={`tlalli-svg${listening ? ' is-listening' : ''}`}
      // El SVG es un archivo propio del proyecto (no contenido de usuarios).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
