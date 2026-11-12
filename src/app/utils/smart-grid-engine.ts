export interface DciInput {
  zoneId: 'ustka' | 'slupsk' | 'trojmiasto';
  zoneName: string;
  pm25: number;
  pm10: number;
  no2: number;
  humidityRh: number;
  iodineUgM3: number;
  fiberLatencyMs: number;
  windShareMw: number;
  readingsHistory: number[];
}

export interface DciEvaluation {
  zoneId: 'ustka' | 'slupsk' | 'trojmiasto';
  zoneName: string;
  rawPm25: number;
  correctedPm25: number;
  pm10: number;
  no2: number;
  humidityRh: number;
  humidityCorrectionApplied: boolean;
  isFlatline: boolean;
  dCiScore: number;
  fiberLatencyMs: number;
  fiberSlaPassed: boolean;
  tariffAction:
    | 'COASTAL_VENTILATION_BOOST'
    | 'PEAK_SHAVING_ECO'
    | 'ISOLATION_FILTRATION'
    | 'SENSOR_MAINTENANCE_ALERT';
  statusLabel: string;
}

export interface OffGridConfig {
  loadWatts: number; // e.g., 45W (iPad Pro M5 + Acer Dual), 55W (+MatePad), 60W (+Mobile Lab)
  solarPanelWatts: 22.5 | 60 | 100;
  sunHours: number;
  includePowerbanks: boolean;
  ecoMode: boolean;
}

export interface OffGridResult {
  stationWh: number;
  powerbankWh: number;
  solarGeneratedWh: number;
  effectiveLoadWatts: number;
  stationHours: number;
  powerbankHours: number;
  solarHours: number;
  totalHours: number;
  stationChargeTimeHours: number;
}

export interface FinancialConfig {
  b2bRatePln: number;
  b2bHoursMonth: number;
  slaClientsCount: number;
  slaAvgFeePln: number;
  auditsPerMonth: number;
  auditAvgFeePln: number;
  taxMode: 'RYCZALT_12' | 'IP_BOX_5';
}

export interface FinancialBreakdown {
  b2bGrossPln: number;
  slaMrrPln: number;
  auditsTotalPln: number;
  auditAdvance40Pln: number;
  auditCompletion60Pln: number;
  totalGrossMonthlyPln: number;
  taxAmountPln: number;
  netMonthlyPln: number;
  payoutSchedule: {
    day5SlaPln: number;
    day10B2bPln: number;
    day18AuditAdvancePln: number;
    day25MunicipalCompletionPln: number;
  };
  capitalAllocation: {
    emergencyBuffer6mTargetPln: number;
    monthlyTosCoiBondsPln: number;
    monthlyIkeIkzeEtfPln: number;
    operationalReinvestmentPln: number;
  };
}

export function detectSensorFlatline(readings: number[]): boolean {
  if (readings.length < 3) {
    return false;
  }
  const first = readings[0];
  return readings.every((val) => Math.abs(val - first) < 0.0001);
}

export function calculateDciIndex(input: DciInput): DciEvaluation {
  const isFlatline = detectSensorFlatline(input.readingsHistory);
  const humidityCorrectionApplied = input.humidityRh > 85;
  const correctionFactor = humidityCorrectionApplied
    ? Math.max(0.65, 1 - (input.humidityRh - 85) * 0.018)
    : 1;
  const correctedPm25 = Number((input.pm25 * correctionFactor).toFixed(1));

  // Calculate base pollution penalty
  const pm25Penalty = Math.min(45, (correctedPm25 / 15) * 18);
  const pm10Penalty = Math.min(25, (input.pm10 / 40) * 12);
  const no2Penalty = Math.min(20, (input.no2 / 40) * 10);
  const iodineBonus = Math.min(12, input.iodineUgM3 * 0.8);

  const rawScore = 100 - pm25Penalty - pm10Penalty - no2Penalty + iodineBonus;
  const dCiScore = isFlatline ? 0 : Math.max(10, Math.min(100, Math.round(rawScore)));
  const fiberSlaPassed = input.fiberLatencyMs > 0 && input.fiberLatencyMs < 5.0;

  let tariffAction: DciEvaluation['tariffAction'] = 'PEAK_SHAVING_ECO';
  let statusLabel = 'Optymalny (Smart Grid Eco)';

  if (isFlatline) {
    tariffAction = 'SENSOR_MAINTENANCE_ALERT';
    statusLabel = 'Błąd zawieszenia czujnika (Flatline Fault)';
  } else if (correctedPm25 > 20 || input.pm10 > 45) {
    tariffAction = 'ISOLATION_FILTRATION';
    statusLabel = 'Izolacja HVAC + Filtracja HEPA';
  } else if (dCiScore >= 85 && input.iodineUgM3 >= 5 && input.windShareMw >= 800) {
    tariffAction = 'COASTAL_VENTILATION_BOOST';
    statusLabel = 'Aerozol jodowy + Taryfa Baltica WindShare (-32%)';
  }

  return {
    zoneId: input.zoneId,
    zoneName: input.zoneName,
    rawPm25: input.pm25,
    correctedPm25,
    pm10: input.pm10,
    no2: input.no2,
    humidityRh: input.humidityRh,
    humidityCorrectionApplied,
    isFlatline,
    dCiScore,
    fiberLatencyMs: input.fiberLatencyMs,
    fiberSlaPassed,
    tariffAction,
    statusLabel,
  };
}

export function calculateOffGridRuntime(config: OffGridConfig): OffGridResult {
  const stationWh = 192; // Anker SOLIX C200 LiFePO4
  const powerbankWh = config.includePowerbanks ? 135 : 0; // 2x 20,000 mAh Solar buffer usable
  const solarGeneratedWh = Number((config.solarPanelWatts * config.sunHours).toFixed(1));
  const effectiveLoadWatts = config.ecoMode
    ? Number((config.loadWatts * 0.88).toFixed(1))
    : config.loadWatts;

  const stationHours = Number((stationWh / effectiveLoadWatts).toFixed(1));
  const powerbankHours = Number((powerbankWh / effectiveLoadWatts).toFixed(1));
  const solarHours = Number((solarGeneratedWh / effectiveLoadWatts).toFixed(1));
  const totalHours = Number((stationHours + powerbankHours + solarHours).toFixed(1));
  const stationChargeTimeHours = Number((stationWh / config.solarPanelWatts).toFixed(1));

  return {
    stationWh,
    powerbankWh,
    solarGeneratedWh,
    effectiveLoadWatts,
    stationHours,
    powerbankHours,
    solarHours,
    totalHours,
    stationChargeTimeHours,
  };
}

export function calculateFinancialArchitecture(config: FinancialConfig): FinancialBreakdown {
  const b2bGrossPln = Math.round(config.b2bRatePln * config.b2bHoursMonth);
  const slaMrrPln = Math.round(config.slaClientsCount * config.slaAvgFeePln);
  const auditsTotalPln = Math.round(config.auditsPerMonth * config.auditAvgFeePln);
  const auditAdvance40Pln = Math.round(auditsTotalPln * 0.4);
  const auditCompletion60Pln = auditsTotalPln - auditAdvance40Pln;

  const totalGrossMonthlyPln = b2bGrossPln + slaMrrPln + auditsTotalPln;
  const taxRate = config.taxMode === 'IP_BOX_5' ? 0.05 : 0.12;
  const taxAmountPln = Math.round(totalGrossMonthlyPln * taxRate);
  const netMonthlyPln = totalGrossMonthlyPln - taxAmountPln;

  return {
    b2bGrossPln,
    slaMrrPln,
    auditsTotalPln,
    auditAdvance40Pln,
    auditCompletion60Pln,
    totalGrossMonthlyPln,
    taxAmountPln,
    netMonthlyPln,
    payoutSchedule: {
      day5SlaPln: slaMrrPln,
      day10B2bPln: b2bGrossPln,
      day18AuditAdvancePln: auditAdvance40Pln,
      day25MunicipalCompletionPln: auditCompletion60Pln,
    },
    capitalAllocation: {
      emergencyBuffer6mTargetPln: 54000, // 6M buffer target
      monthlyTosCoiBondsPln: Math.round(netMonthlyPln * 0.35),
      monthlyIkeIkzeEtfPln: Math.round(netMonthlyPln * 0.40),
      operationalReinvestmentPln: Math.round(netMonthlyPln * 0.25),
    },
  };
}

/**
 * Pure TypeScript implementation of `write_native_pdf` (standard PDF-1.4 without external libraries).
 * Mirrors the exact logic of generator_pdf_md_txt.py so valid multi-page PDFs can be generated in-browser or server-side.
 */
export function generateNativePdf14Bytes(text: string): Uint8Array {
  const diacriticsMap: Record<string, string> = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
    Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'Z', Ż: 'Z',
    '—': '-', '–': '-', '•': '-', '„': '"', '”': '"', '’': "'", '→': '->', '↔': '<->',
  };

  const transliterate = (input: string): string => {
    let out = '';
    for (const ch of input) {
      if (diacriticsMap[ch] !== undefined) {
        out += diacriticsMap[ch];
      } else if (ch.charCodeAt(0) <= 126 && ch.charCodeAt(0) >= 32) {
        out += ch;
      } else {
        out += ' ';
      }
    }
    return out;
  };

  const cleanLines: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    let s = transliterate(rawLine)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    while (s.length > 88) {
      cleanLines.push(s.slice(0, 88));
      s = s.slice(88);
    }
    cleanLines.push(s);
  }

  const linesPerPage = 52;
  const pagesLines: string[][] = [];
  for (let i = 0; i < cleanLines.length; i += linesPerPage) {
    pagesLines.push(cleanLines.slice(i, i + linesPerPage));
  }
  if (pagesLines.length === 0) {
    pagesLines.push(['']);
  }

  const objs: string[] = [];
  // 1: Catalog, 2: Pages, 3: Font
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  const pageObjIds = pagesLines.map((_, i) => 4 + i * 2);
  const kidsStr = pageObjIds.map((pid) => `${pid} 0 R`).join(' ');
  objs.push(`<< /Type /Pages /Kids [${kidsStr}] /Count ${pagesLines.length} >>`);
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

  pagesLines.forEach((pLines, idx) => {
    const pageId = 4 + idx * 2;
    const contentId = pageId + 1;
    const streamCmds = ['BT', '/F1 9.5 Tf', '40 800 Td'];
    for (const line of pLines) {
      streamCmds.push(`(${line}) Tj`);
      streamCmds.push('0 -14 Td');
    }
    streamCmds.push('ET');
    const streamStr = streamCmds.join('\n');

    const pageDict =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`;
    const contentDict = `<< /Length ${streamStr.length} >>\nstream\n${streamStr}\nendstream`;
    objs.push(pageDict);
    objs.push(contentDict);
  });

  let pdfStr = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((body, index) => {
    const objNum = index + 1;
    offsets.push(pdfStr.length);
    pdfStr += `${objNum} 0 obj\n${body}\nendobj\n`;
  });

  const xrefPos = pdfStr.length;
  pdfStr += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdfStr += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdfStr += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

  const bytes = new Uint8Array(pdfStr.length);
  for (let i = 0; i < pdfStr.length; i++) {
    bytes[i] = pdfStr.charCodeAt(i) & 0xff;
  }
  return bytes;
}

export const MASTER_DOC_MARKDOWN = `# KOMPLETNA DOKUMENTACJA ARCHITEKTONICZNA I FINANSOWA (OD PROFESORA DO LAIKA)
Rola: Systems & Security Architect | Smart Grid Lab & Legal Tech | RODO, NIS2, Dostępność Cyfrowa (WCAG 2.1 AAA / EAA)
Profil Badawczy: Inżynier Oprogramowania (11. semestr mgr uzupełniających, obrona marzec 2027)
Promotor Naukowy: Prof. dr hab. inż. Cezary Orłowski (Smart Grid, Systemy Rozproszone, Energetyka)
Korytarz Wdrożeniowy: Ustka (Port / Offshore Baltica 2 & 3) – Słupsk (GPZ Wierzbięcino 400 kV) – Trójmiasto (Hotel Gdańsk)
Stos Technologiczny: Rust (Anonimizacja/Crypto) | Go (Mikroserwisy API) | Python (NLP Guardrails & Analiza dCi/AQI) | TypeScript

================================================================================
1. PROJEKTY I UDOKUMENTOWANE PARAMETRY (STAN FAKTYCZNY)
================================================================================
A. PLATFORMA LEGAL TECH & CORPORATE COMPLIANCE (4 MODUŁY):
  (1) Dokumentacja RODO/RCP/DPIA — automatyzacja rejestrów czynności przetwarzania i matryc ryzyka,
  (2) Kanał Sygnalistów Zero-Knowledge z czyszczeniem metadanych EXIF/XMP/OLE w języku Rust (brak logowania IP),
  (3) Deterministyczna analiza klauzul umownych RAG w języku Python (Guardrails + Zero Data Retention),
  (4) Generator umów z wersjonowanych bloków prawnych z niemodyfikowalnym śladem audytowym (SHA-256 Append-Only).

B. PILOTAŻ GOVTECH / PPP „DOSTĘPNA GMINA – CYFROWA SAMOPOMOC”:
  * 3 terminale audiokioskowe w lokalizacjach krytycznych: OPS, Biblioteka Publiczna, Przychodnia (POZ).
  * Sieć 10 lokalnych wolontariuszy (model Human-in-the-Loop).
  * Zoptymalizowany budżet PoC: 11 000 PLN brutto (~2 500 EUR) – poniżej progu zamówień publicznych PZP.
    - Sprzęt (3x terminal + audio + obudowy odporne): 6 600 PLN (2 200 PLN/pkt)
    - Oprogramowanie i bezpieczeństwo (Kiosk-Mode, TTS, Zero-PII): 1 900 PLN
    - Wdrożenie, materiały w druku powiększonym/Braille i pakiet dla 10 wolontariuszy: 2 500 PLN

C. WALIDACJA DANYCH ŚRODOWISKOWYCH AQI / dCi & SMART GRID (USTKA – SŁUPSK – TRÓJMIASTO):
  * 3 objęte strefy na Pomorzu: Słupsk (GPZ Wierzbięcino), Ustka (Port / Baza O&M Offshore), Trójmiasto (Hotel Gdańsk).
  * Detekcja anomalii pomiarowych, błędów zawieszenia czujnika (Flatline Faults) i korekta wilgotności (RH > 85%).
  * Światłowód DWDM o latencji < 5 ms (3.84 ms) dla integracji morskiej farmy PGE Baltica 2 & 3 WindShare (2.5 GW).
  * Zweryfikowane metryki jakości AI (Quality Gates): BERTScore F1: 0.87 | BLEU-4: 0.42 | ROUGE-L: 0.68 | CodeBLEU: 0.74.

D. ARCHITEKTURA SPRZĘTOWA BIURKA ANTI GRAVITY (STACJONARNA ~1000W & MOBILNA ~6 KG):
  * Jednostki obliczeniowe: MacBook Pro i9 32GB (96W), Acer Aspire i5 12-core 24GB (90W - natywne sterowniki dotyku), MacBook Pro M1 (61W - węzeł Tailscale/Jump Desktop), iPad Pro M5 8.gen (30W + Pencil Pro), MatePad 11.5 PaperMatte (22W).
  * Wyświetlacze: Samsung 27" 4K TB5 240W 8K (centralny), Acer Dual 2x18.5" PD193QT (zawias 180°, 10-pkt dotyk), Projektor 120" 4K (250W - prezentacje przetargowe Mission Control).
  * Zasilanie Off-Grid: Stacja Anker SOLIX C200 (192Wh LiFePO4) + 2x Powerbank 20 000 mAh Solar (+148Wh) + Panel Solarny (22.5W -> optymalizacja do 60W/100W dająca 13.7h pracy w terenie).

================================================================================
2. ARCHITEKTURA FINANSOWA, FREKWENCJA WPŁAT, DOTACJE I MNOŻENIE KAPITAŁU
================================================================================
- Finansowanie Dotacyjne i Badawczo-Rozwojowe:
  * Dotacja PFRON (PUP Słupsk Zarządzenie Nr 9/2025): limit do 143 400 PLN (kosztorys bazowy PoC: 16 850 PLN).
  * Fundusze Europejskie dla Pomorza 2021-2027 (FE Pomorza 1.1 B+R): 600 000 PLN – 2 000 000 PLN.

- Model Przepływów 60 / 30 / 10:
  * 60% czasu: Kontrakt bazowy B2B zdalnie (Polska: 140–210 PLN/h netto | UE/DACH: 55–90 EUR/h).
  * 30% czasu: Abonamenty utrzymaniowe SLA (MRR) od gmin, hoteli i kancelarii (600–1 500 PLN netto/mies. za podmiot).
  * 10% czasu: Audyty RODO/NIS2/WCAG i wdrożenia Smart Grid (minimum 40% zadatku przed rozpoczęciem prac).

- Harmonogram Frekwencji Wpłat (4 wpływy w miesiącu):
  * 5. dzień miesiąca: Abonamenty utrzymaniowe SLA (Legal Tech / Audiokioski / Monitoring dCi).
  * 10. dzień miesiąca: Główna faktura z kontraktu zdalnego B2B (Polska / UE).
  * 18. dzień miesiąca: Zaliczki (40%) na nowe audyty i wdrożenia komercyjne.
  * 25. dzień miesiąca: Faktury samorządowe (OPS / Gminy / Port Ustka / Sponsorzy CSR Offshore).

- Wodospad Lokowania Kapitału i Podatki:
  * Optymalizacja B2B: Ryczałt IT (12%) lub ulga IP Box (5% PIT od autorskiego kodu R&D) + 0% VAT (Reverse Charge w UE).
  * Krótkoterminowo (Poduszka 6M): Subkonto EUR/PLN + Skarbowe Obligacje Oszczędnościowe (TOS/COI).
  * Długoterminowo: Maksymalizacja limitów IKZE (odliczenie od podatku) oraz IKE (0% podatku Belki) -> globalne ETF (MSCI ACWI) oraz obligacje antyinflacyjne EDO.

================================================================================
3. MASTER CHECKLISTA ZGODNOŚCI (WCAG 2.1 AAA / RODO / NIS2 / EU AI ACT)
================================================================================
[X] WCAG 1.4.6 / EAA: Kontrast wizualny >= 7:1 (#130E17 tło / #D8ED00 akcent), pełna obsługa z klawiatury, synteza mowy TTS.
[X] Ergonomia fizyczna (3 audiokioski): Montaż 80–110 cm nad podłogą, gniazdo słuchawkowe Jack z auto-wyciszeniem.
[X] RODO Art. 25/32: Zero-Tracking (0 zewnętrznych cookies), tryb Zero-PII w audiokioskach, izolacja AES-256-GCM.
[X] Ochrona Sygnalistów: Automatyczne czyszczenie metadanych EXIF/PII w warstwie brzegowej (Rust), brak logowania IP.
[X] NIS2 & EU AI Act: Niemodyfikowalne logi audytowe (SHA-256 Chain), polityka Zero Data Retention, RAG Guardrails.
[X] Integralność Danych i Finansów: Walidacja telemetrii AQI/dCi (Słupsk, Ustka, Trójmiasto), światłowód < 5 ms, RTO < 2h.
`;

export const PYTHON_GENERATOR_SCRIPT = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GENERATOR DOKUMENTACJI (.PDF, .MD, .TXT) ORAZ PAKIETU (.ZIP / .RAR)
Tworzy natywne pliki PDF (standard PDF-1.4 bez zewnętrznych bibliotek!),
pliki Markdown (.md), pliki tekstowe (.txt) i pakuje całość do archiwów.
"""

import shutil
import subprocess
import zipfile
from pathlib import Path

OUT_DIR = Path("Pakiet_Dokumentacji_PDF_MD_TXT")

MASTER_TEXT = """${MASTER_DOC_MARKDOWN.replace(/"""/g, '\\"\\"\\"')}"""

def write_native_pdf(pdf_path: Path, text: str):
    """Generuje wielostronicowy plik PDF (standard PDF-1.4) w czystym Pythonie bez zewnętrznych bibliotek."""
    trans = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ—•„”", 'acelnoszzACELNOSZZ--""')
    clean_lines = []
    for raw_line in text.splitlines():
        s = raw_line.translate(trans).replace("\\\\", "\\\\\\\\").replace("(", "\\\\(").replace(")", "\\\\)")
        while len(s) > 88:
            clean_lines.append(s[:88])
            s = s[88:]
        clean_lines.append(s)

    lines_per_page = 52
    pages_lines = [clean_lines[i:i + lines_per_page] for i in range(0, len(clean_lines), lines_per_page)]

    objs = []
    # 1: Catalog, 2: Pages, 3: Font
    objs.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    page_obj_ids = [4 + i * 2 for i in range(len(pages_lines))]
    kids_str = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    objs.append(f"<< /Type /Pages /Kids [{kids_str}] /Count {len(pages_lines)} >>".encode("latin-1"))
    objs.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")

    for idx, p_lines in enumerate(pages_lines):
        page_id = 4 + idx * 2
        content_id = page_id + 1
        stream_cmds = ["BT", "/F1 9.5 Tf", "40 800 Td"]
        for line in p_lines:
            stream_cmds.append(f"({line}) Tj")
            stream_cmds.append("0 -14 Td")
        stream_cmds.append("ET")
        stream_bytes = "\\n".join(stream_cmds).encode("latin-1", errors="ignore")

        page_dict = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Contents {content_id} 0 R /Resources << /Font << /F1 3 0 R >> >> >>"
        ).encode("latin-1")
        content_dict = f"<< /Length {len(stream_bytes)} >>\\nstream\\n".encode("latin-1") + stream_bytes + b"\\nendstream"
        objs.append(page_dict)
        objs.append(content_dict)

    pdf = bytearray(b"%PDF-1.4\\n")
    offsets = []
    for i, body in enumerate(objs, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{i} 0 obj\\n".encode("latin-1") + body + b"\\nendobj\\n")

    xref_pos = len(pdf)
    pdf.extend(f"xref\\n0 {len(objs)+1}\\n0000000000 65535 f \\n".encode("latin-1"))
    for off in offsets:
        pdf.extend(f"{off:010d} 00000 n \\n".encode("latin-1"))
    pdf.extend(f"trailer\\n<< /Size {len(objs)+1} /Root 1 0 R >>\\nstartxref\\n{xref_pos}\\n%%EOF\\n".encode("latin-1"))

    pdf_path.write_bytes(pdf)

def main():
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    # 1. Generowanie pliku .MD
    md_path = OUT_DIR / "Dokumentacja_Architekta_Master.md"
    md_path.write_text(MASTER_TEXT, encoding="utf-8")

    # 2. Generowanie pliku .TXT
    txt_path = OUT_DIR / "Dokumentacja_Architekta_Master.txt"
    txt_path.write_text(MASTER_TEXT, encoding="utf-8")

    # 3. Generowanie natywnego pliku .PDF
    pdf_path = OUT_DIR / "Dokumentacja_Architekta_Master.pdf"
    write_native_pdf(pdf_path, MASTER_TEXT)

    # 4. Pakowanie do .ZIP
    zip_path = Path("Pakiet_Dokumentacji_PDF_MD_TXT.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in OUT_DIR.rglob("*"):
            zf.write(p, p.relative_to(OUT_DIR.parent))

    # 5. Pakowanie do .RAR (jeśli dostępne)
    rar_cmd = shutil.which("rar") or shutil.which("winrar")
    if rar_cmd:
        subprocess.run([rar_cmd, "a", "-r", "Pakiet_Dokumentacji_PDF_MD_TXT.rar", str(OUT_DIR)], check=False)

    print("Wygenerowano pomyślnie:")
    print(f" - PDF: {pdf_path.resolve()}")
    print(f" - MD : {md_path.resolve()}")
    print(f" - TXT: {txt_path.resolve()}")
    print(f" - ZIP: {zip_path.resolve()}")

if __name__ == "__main__":
    main()
`;

export function buildMasterHtmlPresentation(docContent: string = MASTER_DOC_MARKDOWN): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Prezentacja Multimedialna Master — Anti Gravity Studio & Smart Grid Lab</title>
  <style>
    :root {
      --bg: #130E17;
      --surface: #1B1421;
      --border: #32263D;
      --text: #F8FAFC;
      --accent-volt: #D8ED00;
      --accent-red: #EF303F;
    }
    body {
      margin: 0;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 2rem;
    }
    .btn {
      background: var(--accent-volt);
      color: #130E17;
      border: none;
      padding: 0.65rem 1.25rem;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
    }
    pre {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 1.5rem;
      border-radius: 12px;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <strong>Anti Gravity Studio — Prezentacja_Multimedialna_Master.html</strong>
      <div style="font-size: 0.85rem; color: #CBD5E1;">Ustka – Słupsk – Trójmiasto | Prof. Cezary Orłowski Smart Grid | WCAG 2.1 AAA</div>
    </div>
    <div style="display: flex; gap: 0.75rem;">
      <button class="btn" onclick="downloadFile('md')">⬇ Pobierz .MD</button>
      <button class="btn" onclick="downloadFile('txt')">⬇ Pobierz .TXT</button>
      <button class="btn" onclick="window.print()">⬇ Zapisz .PDF</button>
    </div>
  </div>
  <pre id="doc-preview"></pre>
<script>
// 5. Eksport do plików .MD oraz .TXT bezpośrednio z przeglądarki
    const MASTER_DOC = ${JSON.stringify(docContent)};
    document.getElementById('doc-preview').textContent = MASTER_DOC;

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
}

export interface TelemetryCsvRow {
  id: number;
  zoneId: string;
  zoneName: string;
  dCiScore: number;
  correctedPm25: string;
  humidityRh: number;
  fiberLatencyMs: string;
  windShareMw: number;
  createdAt: string;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats an array of saved telemetry snapshots into an RFC 4180 CSV string
 * prefixed with UTF-8 BOM (\uFEFF) so Polish diacritics open cleanly in Excel/Pandas.
 */
export function formatTelemetrySnapshotsCsv(rows: TelemetryCsvRow[]): string {
  const headers = [
    'id',
    'zoneId',
    'zoneName',
    'dCiScore',
    'correctedPm25',
    'humidityRh',
    'fiberLatencyMs',
    'windShareMw',
    'createdAt',
  ];
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(
      [
        escapeCsvCell(row.id),
        escapeCsvCell(row.zoneId),
        escapeCsvCell(row.zoneName),
        escapeCsvCell(row.dCiScore),
        escapeCsvCell(row.correctedPm25),
        escapeCsvCell(row.humidityRh),
        escapeCsvCell(row.fiberLatencyMs),
        escapeCsvCell(row.windShareMw),
        escapeCsvCell(row.createdAt),
      ].join(','),
    );
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

