# FAQ – Häufige Fragen

## Kann eine OrbitDB-Adresse wiederverwendet werden?

Nein, die Adresse ist aus dem Content abgeleitet und somit eindeutig.

## Was passiert, wenn niemand die Daten pinnt?

Dann gehen die Daten verloren. Daher übernimmt der Replikator das kontinuierliche Pinning.

## Wie erfährt ein Client, dass sich die Adresse geändert hat?

Entweder durch regelmäßiges Abrufen des IPNS-Eintrags oder ein PubSub-Signal.
