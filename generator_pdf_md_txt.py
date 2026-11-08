#!/usr/bin/env python3
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

MASTER_TEXT = """# KOMPLETNA DOKUMENTACJA ARCHITEKTONICZNA, WDROZENIOWA I FINANSOWA
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
"""

def write_native_pdf(pdf_path: Path, text: str):
    """Generuje wielostronicowy plik PDF (standard PDF-1.4) w czystym Pythonie bez zewnętrznych bibliotek."""
    trans = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ—•„”", 'acelnoszzACELNOSZZ--""')
    clean_lines = []
    for raw_line in text.splitlines():
        s = raw_line.translate(trans).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
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
        stream_bytes = "\n".join(stream_cmds).encode("latin-1", errors="ignore")

        page_dict = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Contents {content_id} 0 R /Resources << /Font << /F1 3 0 R >> >> >>"
        ).encode("latin-1")
        content_dict = f"<< /Length {len(stream_bytes)} >>\nstream\n".encode("latin-1") + stream_bytes + b"\nendstream"
        objs.append(page_dict)
        objs.append(content_dict)

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objs, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{i} 0 obj\n".encode("latin-1") + body + b"\nendobj\n")

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode("latin-1"))
    for off in offsets:
        pdf.extend(f"{off:010d} 00000 n \n".encode("latin-1"))
    pdf.extend(f"trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("latin-1"))

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
