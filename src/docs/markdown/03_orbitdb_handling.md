# Umgang mit OrbitDB

- Beim Start prüft der Replikator, ob eine gültige DB existiert.
- Falls nicht vorhanden, wird eine neue OrbitDB erstellt und die Adresse im IPNS gespeichert.
- Die DB-Adresse ist einmalig und kann nicht erneut erzeugt werden.
- Clients müssen die aktuelle Adresse kennen, um korrekt zu arbeiten.
