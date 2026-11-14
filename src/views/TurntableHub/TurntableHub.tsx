
import { useState } from "react";
import "./TurntableHub.css";

export default function TurntableHub() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="desk">
      <div className="turntable">

        {/* Disco de vinilo y brazo */}
        <div className="platter">
          <div className={`vinyl ${playing ? "spinning" : ""}`}>
            <div className="label" />
          </div>

          <div className={`tonearm ${playing ? "on" : ""}`}>
            <div className="pivot" />
            <div className="arm" />
            <div className="head" />
          </div>
        </div>

        {/* Bocina */}
        <div className="speaker">
          <div className="grille" />

          <div className="buttons">
            <button
              className="btn"
              aria-label={playing ? "Pausar" : "Reproducir"}
              onClick={() => setPlaying((p) => !p)}
            />

            <button
              className="btn"
              aria-label="Detener"
              onClick={() => setPlaying(false)}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
