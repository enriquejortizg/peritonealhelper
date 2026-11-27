# Voz sin internet (Vosk)

- `vosk.js`: [vosk-browser](https://github.com/ccoreilly/vosk-browser) 0.0.8, sin cambios. Licencia Apache 2.0, © Ciaran O'Reilly y colaboradores. Incluye una compilación WebAssembly de [Vosk](https://github.com/alphacep/vosk-api) (Apache 2.0, © Alpha Cephei Inc.).
- `modelo-es.tar.gz`: modelo `vosk-model-small-es-0.42` de [Alpha Cephei](https://alphacephei.com/vosk/models), licencia Apache 2.0. Lo descarga y empaqueta el flujo `.github/workflows/modelo-voz.yml`.

La app descarga ambos solo cuando la familia toca "Descargar voz sin internet" en Ajustes. El modelo queda guardado en el teléfono (IndexedDB) y el script en la caché del service worker.
