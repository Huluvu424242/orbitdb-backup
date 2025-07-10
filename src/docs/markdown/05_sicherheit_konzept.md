# Sicherheitskonzept

- Schreibrechte dürfen nicht beliebig vergeben werden.
- Clients erhalten entweder Leserechte oder arbeiten über ein dediziertes Write-Backend.
- Die `.pem` Datei darf niemals im Client gespeichert werden.
- Ein Client mit Schreibrechten kann theoretisch auch Daten löschen – dies muss verhindert werden.
