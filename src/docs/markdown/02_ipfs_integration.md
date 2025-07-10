# IPFS Integration

- Der Replikator verwendet einen separaten Docker-Container mit eigener IPFS-Helia-Instanz.
- Der Container nimmt eine `.pem` Datei entgegen und erzeugt daraus das Schlüsselmaterial.
- Mit dem Private Key wird ein IPNS-Eintrag erstellt oder aktualisiert.
- Die IPFS API wird über Umgebungsvariablen konfiguriert.
