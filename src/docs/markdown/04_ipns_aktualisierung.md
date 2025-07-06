# IPNS Aktualisierung

- Nur der Replikator kennt den Private Key zum Signieren.
- Clients erhalten nur den Public Key und die IPNS-Adresse.
- Bei nicht erreichbarer DB wird eine neue erzeugt und die Adresse im IPNS aktualisiert.
- Die Clients benötigen einen Mechanismus, um Änderungen mitzubekommen (z. B. periodisches Pulling oder PubSub).
