# KOMPLETNA DOKUMENTACJA ARCHITEKTONICZNA, WDROZENIOWA I FINANSOWA
Rola: Systems & Security Architect | Legal Tech, RODO, NIS2, Dostepnosc Cyfrowa (WCAG/EAA)
Profil Badawczy: Inzynier Oprogramowania (11. semestr mgr, obrona marzec 2027, Promotor: Prof. Cezary Orlowski)
Stos Technologiczny: Rust (Anonimizacja/Crypto) | Go (Mikroserwisy API) | Python (NLP Guardrails & AQI)

==============================================================================
1. PROJEKTY I UDOKUMENTOWANE PARAMETRY (OD PROFESORA DO LAIKA)
==============================================================================
A. PLATFORMA LEGAL TECH & CORPORATE COMPLIANCE (4 MODULY):
   - Dla Laika: Cyfrowa tarcza dla kancelarii i firm – pilnuje dokumentow RODO,
     chroni anonimowosc sygnalistow i sprawdza umowy bez ryzyka wycieku tajemnic.
   - Dla Profesora / Audytora:
     * Modul 1 (RODO Engine): Automatyzacja rejestrow RCP i matryc ryzyka DPIA.
     * Modul 2 (Kanal Sygnalistow Zero-Knowledge): Brzegowa sanitacja metadanych
       EXIF/XMP/OLE w jezyku Rust przed zapisem do bazy, brak logowania IP.
     * Modul 3 (Analiza Klauzul RAG): Deterministyczny potok w Pythonie z twardymi
       ogranicznikami halucynacji (Guardrails) i polityka Zero Data Retention.
     * Modul 4 (Generator Umow): Skladanie kontraktow z wersjonowanych blokow
       z niemodyfikowalnym dziennikiem audytowym (SHA-256 Append-Only).

B. PILOTAZ GOVTECH / PPP: "DOSTEPNA GMINA - CYFROWA SAMOPOMOC"
   - Dla Laika: 3 proste w obsludze punkty glosowe w gminie wspierane przez
     10 przeszkolonych sasiadow-wolontariuszy za uczciwa kwote 11 000 zl.
   - Dla Profesora / Skarbnika Gminy / Dyrektora CSR:
     * Infrastruktura: 3 audiokioski (OPS, Biblioteka Publiczna, Przychodnia POZ).
     * Kapital spoleczny (Human-in-the-Loop): Siec 10 lokalnych wolontariuszy.
     * Kosztorys PoC (CAPEX = 11 000 PLN brutto / ok. 2 500 EUR - ponizej progu PZP):
       1) Sprzet (3x terminal + audio + obudowy odporne): 6 600 PLN (2 200 PLN/pkt)
       2) Oprogramowanie i Bezpieczenstwo (Kiosk-Mode, TTS, Zero-PII): 1 900 PLN
       3) Wdrozenie, druk powiekszony/Braille i pakiet 10 wolontariuszy: 2 500 PLN

C. WALIDACJA DANYCH SRODOWISKOWYCH AQI / dCi & SMART GRID (USTKA - SLUPSK - TROJMIASTO)
   - Obszar analizy (3 regiony Pomorza): Slupsk (GPZ Wierzbiecino 400 kV), Ustka (Port / Baza Offshore PGE Baltica 2 & 3), Trojmiasto (Hotel Gdansk Srodmiescie).
   - Zakres inzynieryjny: Detekcja anomalii w szeregach czasowych, wykrywanie
     zawieszen sensorow (Flatline Faults), korekta wilgotnosci (RH > 85%), swiatlowod DWDM < 5 ms (3.84 ms).
   - Zweryfikowane metryki AI: BERTScore F1 0.87 | BLEU-4 0.42 | ROUGE-L 0.68 | CodeBLEU 0.74.

==============================================================================
2. KOSZTORYS USLUG, FREKWENCJA WPLAT I INZYNIERIA KAPITALU
==============================================================================
- Dotacje i Granty B+R:
  * PFRON (PUP Slupsk Zarzadzenie Nr 9/2025): do 143 400 PLN (kosztorys PoC: 16 850 PLN).
  * Fundusze Europejskie dla Pomorza 1.1: 600 000 PLN - 2 000 000 PLN.

- Model Przeplywow Pienieznych 60 / 30 / 10:
  * 60% czasu: Zdalny kontrakt bazowy B2B (Polska: 140-210 PLN/h | UE/DACH: 55-90 EUR/h).
  * 30% czasu: Powtarzalne abonamenty utrzymaniowe SLA (MRR: 600-1 500 PLN/mies. na podmiot).
  * 10% czasu: Jednorazowe audyty RODO/NIS2/WCAG i wdrozenia (min. 40% zadatku).

- Kalendarz Frekwencji Wplat (4 przelewy w miesiacu):
  * 5. dzien miesiaca: Abonamenty SLA od kancelarii, hoteli i gmin.
  * 10. dzien miesiaca: Glowny przelew z kontraktu B2B (Polska / UE).
  * 18. dzien miesiaca: Zaliczki (40%) na nowe audyty i wdrozenia.
  * 25. dzien miesiaca: Faktury samorzadowe (OPS / Gminy / Sponsorzy CSR Offshore).

- Lokowanie Kapitalu i Podatki:
  * Podatki B2B: Ryczalt IT (12%) lub ulga IP Box (5% PIT od autorskiego kodu R&D) + 0% VAT w UE.
  * Krotkoterminowo (Bufor 6M): Subkonto EUR/PLN + Obligacje Skarbowe (TOS/COI).
  * Dlugoterminowo: Maksymalizacja IKE oraz IKZE -> globalne ETF (MSCI ACWI) i obligacje EDO.

==============================================================================
3. MASTER CHECKLISTA ZGODNOSCI (WCAG 2.1 AAA / RODO / NIS2 / EU AI ACT)
==============================================================================
[X] WCAG 2.1 AAA / EAA: Kontrast >= 7:1, nawigacja bezdotykowa/klawiaturowa, synteza TTS.
[X] Ergonomia fizyczna (3 audiokioski): Montaz 80-110 cm, wyjscie sluchawkowe Jack.
[X] RODO Art. 25/32: Zero-Tracking (0 cookies sledzacych), Zero-PII przy terminalu, izolacja AES-256.
[X] Ochrona Sygnalistow: Czyszczenie metadanych EXIF/PII w Rust, brak logowania adresow IP.
[X] NIS2 & EU AI Act: Niemodyfikowalne logi (SHA-256 Chain), Zero Data Retention, RAG Guardrails.
[X] Integralnosc AQI i Finansow: Walidacja danych (Slupsk, Ustka, Trojmiasto), RTO < 2h, 40% zadatku.
