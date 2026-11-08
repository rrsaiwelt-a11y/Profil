import {DciInput} from './smart-grid-engine';

export interface HardwareItem {
  id: string;
  category: 'Komputery' | 'Monitory' | 'Tablety' | 'Telefony' | 'Zasilanie & Sieć';
  name: string;
  watts: number;
  role: string;
  connection: string;
  mobileIncluded: boolean;
}

export interface PfronItem {
  id: number;
  name: string;
  category: string;
  costPln: number;
  justification: string;
}

export interface ChecklistItem {
  id: string;
  domain: string;
  requirement: string;
  verificationDetail: string;
  checked: boolean;
}

export const INITIAL_ZONES: Record<'ustka' | 'slupsk' | 'trojmiasto', DciInput> = {
  ustka: {
    zoneId: 'ustka',
    zoneName: 'Ustka Port — Baza Serwisowa Offshore O&M (PGE Baltica 2 & 3)',
    pm25: 8.4,
    pm10: 16.2,
    no2: 9.5,
    humidityRh: 88,
    iodineUgM3: 9.2,
    fiberLatencyMs: 3.84,
    windShareMw: 1420,
    readingsHistory: [8.1, 8.6, 8.4, 8.5],
  },
  slupsk: {
    zoneId: 'slupsk',
    zoneName: 'Słupsk — GPZ Wierzbięcino 400 kV & Inkubator Technologiczny',
    pm25: 13.8,
    pm10: 26.4,
    no2: 18.2,
    humidityRh: 76,
    iodineUgM3: 2.4,
    fiberLatencyMs: 2.15,
    windShareMw: 1180,
    readingsHistory: [13.5, 14.0, 13.8, 13.7],
  },
  trojmiasto: {
    zoneId: 'trojmiasto',
    zoneName: 'Trójmiasto — Hotel Gdańsk Śródmieście / Olivia BC / PPNT Gdynia',
    pm25: 11.2,
    pm10: 22.8,
    no2: 21.0,
    humidityRh: 82,
    iodineUgM3: 5.6,
    fiberLatencyMs: 4.12,
    windShareMw: 960,
    readingsHistory: [11.0, 11.5, 11.2, 11.1],
  },
};

export const HARDWARE_INVENTORY: HardwareItem[] = [
  {
    id: 'mbp-i9',
    category: 'Komputery',
    name: 'MacBook Pro i9 (32GB DDR4)',
    watts: 96,
    role: 'Główny serwer Anti Gravity IDE, Mission Control agentów, kompilacje',
    connection: 'Thunderbolt 5 240W 8K (lewy port) + HDMI 2.1 do Projektora 120"',
    mobileIncluded: false,
  },
  {
    id: 'acer-aspire',
    category: 'Komputery',
    name: 'Acer Aspire i5 (12-core, 24GB RAM)',
    watts: 90,
    role: 'Host Windows — obsługa natywnych sterowników 10-pkt dotyku dla Acera Dual',
    connection: 'USB-C Wideo + Dotyk do Acer Dual Port 1',
    mobileIncluded: false,
  },
  {
    id: 'mbp-m1',
    category: 'Komputery',
    name: 'MacBook Pro M1 2020 Pro',
    watts: 61,
    role: 'Lekki runner 24/7, szyfrowany węzeł Tailscale VPN oraz serwer Jump Desktop',
    connection: 'USB-C Zasilanie 15W + drugi ekran do Acer Dual Port 2',
    mobileIncluded: false,
  },
  {
    id: 'mbp-2018',
    category: 'Komputery',
    name: 'MacBook Pro 2018 Pro',
    watts: 45,
    role: 'Jednostka zapasowa (Cold/Warm Backup), pomocniczy ekran diagnostyczny',
    connection: 'Obwód stacjonarny Listwa B',
    mobileIncluded: false,
  },
  {
    id: 'samsung-27',
    category: 'Monitory',
    name: 'Samsung 27" 4K TB5',
    watts: 50,
    role: 'Główny monitor kodu — umieszczony centralnie na wysokości oczu',
    connection: 'Kabel Thunderbolt 5 240W 8K (obraz 4K 120Hz + zasilanie)',
    mobileIncluded: false,
  },
  {
    id: 'acer-dual',
    category: 'Monitory',
    name: 'Acer Dual 2x18.5" (PD193QT)',
    watts: 45,
    role: 'Podwójny ekran 180° (100Hz, 10-pkt dotyk), góra: terminal, dół: Mission Control / stół 37"',
    connection: 'Split Mode USB-C + własny zasilacz 45W / stacja C200 w terenie',
    mobileIncluded: true,
  },
  {
    id: 'projektor-120',
    category: 'Monitory',
    name: 'Projektor 120" 4K (projekcja ścienna)',
    watts: 250,
    role: 'Wizualizacja wielkoformatowa na żywo działań agentów autonomicznych dla komisji przetargowej',
    connection: 'HDMI 2.1 bezpośrednio z MacBook Pro i9',
    mobileIncluded: false,
  },
  {
    id: 'ipad-m5',
    category: 'Tablety',
    name: 'iPad Pro 2025 (M5, 8. gen) + Pencil Pro',
    watts: 30,
    role: 'Mobilne centrum dowodzenia, szkicowanie architektury Smart Grid (squeeze, barrel roll, hover)',
    connection: 'Wi-Fi Tailscale + Sidecar po kablu USB-C / Thunderbolt',
    mobileIncluded: true,
  },
  {
    id: 'matepad-papermatte',
    category: 'Tablety',
    name: 'MatePad 11.5 PaperMatte 2025',
    watts: 22,
    role: 'Czytnik dokumentacji technicznej RODO/NIS2/Smart Grid i kodu bez zmęczenia wzroku',
    connection: 'Wi-Fi lokalne / synchronizacja dokumentacji',
    mobileIncluded: true,
  },
  {
    id: 'matepad-x',
    category: 'Tablety',
    name: 'MatePad X Plus',
    watts: 66,
    role: 'Dedykowany terminal ciągłego czatu i telemetrii z modelem AI',
    connection: 'Obwód stacjonarny Listwa A',
    mobileIncluded: false,
  },
  {
    id: 'mobile-phones',
    category: 'Telefony',
    name: 'Xiaomi Redmi Note 15 Pro / iPhone 18 Pro Max',
    watts: 67,
    role: 'Laboratorium testów mobilnych aplikacji OTA Smart Grid & Audiokiosk przez Wi-Fi',
    connection: 'Testy terenowe LTE/5G + Wi-Fi 6E',
    mobileIncluded: true,
  },
];

export const PFRON_BUDGET_ITEMS: PfronItem[] = [
  {
    id: 1,
    name: 'Stacja zasilania Anker SOLIX C200 DC (192Wh / 200W LiFePO4)',
    category: 'Zasilanie Off-Grid',
    costPln: 550,
    justification: '3000 cykli LiFePO4, 1.8 kg — mobilne zasilanie pomiarowe na plaży i w porcie Ustka',
  },
  {
    id: 2,
    name: 'Składany panel solarny 100W + stacja buforowa Smart Grid',
    category: 'OZE / Fotowoltaika',
    costPln: 1400,
    justification: 'Wydłużenie czasu pracy mobilnego laboratorium w terenie z 9.2h do 13.7h+',
  },
  {
    id: 3,
    name: 'Kabel Thunderbolt 5 (240W, 8K, 2m) + magistrala USB4',
    category: 'Magistrala Wideo & PD',
    costPln: 550,
    justification: 'Jednokablowe połączenie 4K 120Hz oraz zasilania między Samsung 27" a serwerem',
  },
  {
    id: 4,
    name: 'Listwy przeciwprzepięciowe 2x 9 wejść (18 gniazd) z filtracją EMI',
    category: 'Bezpieczeństwo Zasilania',
    costPln: 600,
    justification: 'Separacja dwóch obwodów ściennych (~1000W), kategoryczny zakaz łączenia szeregowego',
  },
  {
    id: 5,
    name: 'Adapter DisplayLink Dual 4K dla MacBook Pro M1',
    category: 'Wielomonitorowość',
    costPln: 650,
    justification: 'Natywne wyjście na zewnętrzne monitory dla węzła Tailscale / Jump Desktop 24/7',
  },
  {
    id: 6,
    name: 'Zestaw czujników jakości powietrza dCi (PM2.5 / PM10 / NO2 / LoRaWAN)',
    category: 'Telemetria Smart City',
    costPln: 1600,
    justification: 'Badania terenowe do pracy magisterskiej i wdrożeń Ustka – Słupsk – Trójmiasto',
  },
  {
    id: 7,
    name: 'Router światłowodowy mobilny 5G/SFP+ + bramka IoT Gateway',
    category: 'Telekomunikacja & IoT',
    costPln: 1500,
    justification: 'Niska latencja < 5 ms dla symulacji i integracji węzłów Baltica WindShare',
  },
  {
    id: 8,
    name: 'Biurko regulowane elektrycznie o podwyższonym udźwigu (1000W Setup)',
    category: 'Ergonomia PFRON',
    costPln: 1800,
    justification: 'Dostosowanie stanowiska do umiarkowanego stopnia niepełnosprawności (praca siedząca/stojąca)',
  },
  {
    id: 9,
    name: 'Krzesło ergonomiczne z podparciem odcinka lędźwiowego',
    category: 'Ergonomia PFRON',
    costPln: 1300,
    justification: 'Redukcja obciążenia kręgosłupa podczas wielogodzinnych audytów i programowania',
  },
  {
    id: 10,
    name: 'Materiały demonstracyjne, strona www i pakiet PoC Smart Grid',
    category: 'Komercjalizacja B2B',
    costPln: 1500,
    justification: 'Przygotowanie pokazów dla Portu Ustka, UM Słupsk, PPNT Gdynia i Olivia Business Centre',
  },
  {
    id: 11,
    name: 'Certyfikacja i literatura specjalistyczna Smart Grid / Offshore',
    category: 'B+R / Kompetencje',
    costPln: 400,
    justification: 'Standardy bezpieczeństwa energetycznego, NIS2 oraz architektury systemów rozproszonych',
  },
  {
    id: 12,
    name: 'Rezerwa operacyjna (3 miesiące ZUS / obsługa księgowa B2B)',
    category: 'Płynność Finansowa',
    costPln: 5000,
    justification: 'Zabezpieczenie płynności (11 850 PLN sprzęt + 5 000 PLN rezerwa = 16 850 PLN łącznie)',
  },
];

export const COMPLIANCE_CHECKLIST: ChecklistItem[] = [
  {
    id: 'wcag-aaa',
    domain: 'WCAG 2.1 AAA / EAA',
    requirement: 'Kontrast wizualny >= 7:1, pełna obsługa z klawiatury, synteza mowy TTS',
    verificationDetail: 'Tło #130E17 z akcentem #D8ED00 (kontrast 14.8:1), natywny Web Speech API TTS w języku polskim',
    checked: true,
  },
  {
    id: 'kiosk-ergo',
    domain: 'Ergonomia Fizyczna (3 Audiokioski)',
    requirement: 'Montaż 80–110 cm nad podłogą, gniazdo słuchawkowe Jack z auto-wyciszeniem głośnika',
    verificationDetail: 'Lokalizacje krytyczne: OPS, Biblioteka Publiczna, Przychodnia POZ + wsparcie 10 wolontariuszy',
    checked: true,
  },
  {
    id: 'rodo-zero-pii',
    domain: 'RODO Art. 25 / Art. 32',
    requirement: 'Zero-Tracking (0 zewnętrznych cookies), tryb Zero-PII w audiokioskach, szyfrowanie AES-256-GCM',
    verificationDetail: 'Automatyczne czyszczenie sesji pamięci RAM po odejściu mieszkańca od terminala',
    checked: true,
  },
  {
    id: 'whistleblower-rust',
    domain: 'Ochrona Sygnalistów (UE 2019/1937)',
    requirement: 'Brzegowe czyszczenie metadanych EXIF/XMP/OLE w języku Rust, brak logowania adresów IP',
    verificationDetail: 'Weryfikacja kryptograficzna przed zapisem zgłoszenia do bazy danych',
    checked: true,
  },
  {
    id: 'nis2-ai-act',
    domain: 'NIS2 & EU AI Act',
    requirement: 'Niemodyfikowalne logi audytowe (SHA-256 Chain), polityka Zero Data Retention, RAG Guardrails',
    verificationDetail: 'Deterministyczna kontrola odpowiedzi modelu AI (BERTScore 0.87, CodeBLEU 0.74)',
    checked: true,
  },
  {
    id: 'aqi-finance-integrity',
    domain: 'Integralność Telemetrii dCi & Finansów',
    requirement: 'Walidacja AQI/dCi (Słupsk, Ustka, Trójmiasto), światłowód < 5 ms, RTO < 2h, 40% zadatku',
    verificationDetail: 'Detekcja zawieszenia czujnika (Flatline) i korekta wilgotności RH > 85%',
    checked: true,
  },
];

export const COMPLETION_HTML_SNIPPET = `// 5. Eksport do plików .MD oraz .TXT bezpośrednio z przeglądarki
    const MASTER_DOC = \`# KOMPLETNA DOKUMENTACJA ARCHITEKTONICZNA I FINANSOWA (OD PROFESORA DO LAIKA)
Rola: Systems & Security Architect | Legal Tech, RODO, NIS2, Dostępność Cyfrowa (WCAG/EAA)
Stos Technologiczny: Rust (Anonimizacja/Crypto) | Go (Mikroserwisy API) | Python (NLP Guardrails & Analiza AQI)

================================================================================
1. PROJEKTY I UDOKUMENTOWANE PARAMETRY (STAN FAKTYCZNY)
================================================================================
- Platforma Legal Tech (4 Moduły):
  (1) Dokumentacja RODO/RCP/DPIA,
  (2) Kanał Sygnalistów Zero-Knowledge z czyszczeniem metadanych EXIF w języku Rust,
  (3) Deterministyczna analiza klauzul umownych RAG w języku Python (Guardrails + Zero Data Retention),
  (4) Generator umów z wersjonowanych bloków prawnych z niemodyfikowalnym śladem audytowym (SHA-256).

- Pilotaż GovTech / PPP „Dostępna Gmina – Cyfrowa Samopomoc”:
  * 3 terminale audiokioskowe w lokalizacjach krytycznych: OPS, Biblioteka, Przychodnia (POZ).
  * Sieć 10 lokalnych wolontariuszy (model Human-in-the-Loop).
  * Zoptymalizowany budżet PoC: 11 000 PLN brutto (~2 500 EUR) – poniżej progu zamówień publicznych PZP.
    - Sprzęt (3x terminal + audio + obudowy): 6 600 PLN
    - Oprogramowanie i bezpieczeństwo (Kiosk-Mode, TTS, Zero-PII): 1 900 PLN
    - Wdrożenie, materiały w druku powiększonym i pakiet dla 10 wolontariuszy: 2 500 PLN

- Walidacja Danych Środowiskowych AQI (ESG / Smart City Telemetry):
  * 3 objęte strefy na Pomorzu: Słupsk, Ustka, Trójmiasto.
  * Detekcja anomalii pomiarowych, błędów zawieszenia czujnika (Flatline) i korekta wilgotności (RH > 85%).

================================================================================
2. ARCHITEKTURA FINANSOWA, FREKWENCJA WPŁAT I MNOŻENIE KAPITAŁU
================================================================================
- Model Przepływów 60 / 30 / 10:
  * 60% czasu: Kontrakt bazowy B2B zdalnie (Polska: 140–210 PLN/h netto | UE/DACH: 55–90 EUR/h).
  * 30% czasu: Abonamenty utrzymaniowe SLA (MRR) od gmin i kancelarii (600–1 500 PLN netto/mies. za podmiot).
  * 10% czasu: Audyty RODO/NIS2/WCAG i wdrożenia (minimum 40% zadatku przed rozpoczęciem prac).

- Harmonogram Frekwencji Wpłat (4 wpływy w miesiącu):
  * 5. dzień miesiąca: Abonamenty utrzymaniowe SLA (Legal Tech / Audiokioski).
  * 10. dzień miesiąca: Główna faktura z kontraktu zdalnego B2B (Polska / UE).
  * 18. dzień miesiąca: Zaliczki (40%) na nowe audyty i wdrożenia komercyjne.
  * 25. dzień miesiąca: Faktury samorządowe (OPS / Gminy / Sponsorzy CSR Offshore).

- Wodospad Lokowania Kapitału i Podatki:
  * Optymalizacja B2B: Ryczałt IT (12%) lub ulga IP Box (5% PIT od autorskiego kodu R&D) + 0% VAT (Reverse Charge w UE).
  * Krótkoterminowo (Poduszka 6M): Subkonto EUR/PLN + Skarbowe Obligacje Oszczędnościowe (TOS/COI).
  * Długoterminowo: Maksymalizacja limitów IKZE (odliczenie od podatku) oraz IKE (0% podatku Belki) -> globalne ETF (MSCI ACWI) oraz obligacje antyinflacyjne EDO.

================================================================================
3. MASTER CHECKLISTA ZGODNOŚCI (WCAG 2.1 AAA / RODO / NIS2 / EU AI ACT)
================================================================================
[ ] WCAG 1.4.6 / EAA: Kontrast wizualny >= 7:1, pełna obsługa z klawiatury/przycisków, synteza mowy TTS.
[ ] Ergonomia fizyczna (3 audiokioski): Montaż 80–110 cm nad podłogą, gniazdo słuchawkowe Jack z auto-wyciszeniem.
[ ] RODO Art. 25/32: Zero-Tracking (0 zewnętrznych cookies), tryb Zero-PII w audiokioskach, izolacja AES-256-GCM.
[ ] Ochrona Sygnalistów: Automatyczne czyszczenie metadanych EXIF/PII w warstwie brzegowej (Rust), brak logowania IP.
[ ] NIS2 & EU AI Act: Niemodyfikowalne logi audytowe (SHA-256 Chain), polityka Zero Data Retention, RAG Guardrails.
[ ] Integralność Danych i Finansów: Walidacja telemetrii AQI (Słupsk, Ustka, Trójmiasto), RTO < 2h, 100% sprzętu z przedpłaty.
\`;

    function downloadFile(ext) {
        const mime = ext === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
        const filename = \`Dokumentacja_Architekta_Master.\${ext}\`;
        const blob = new Blob([MASTER_DOC], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
</script>
</body>
</html>`;
