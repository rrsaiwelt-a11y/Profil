import {CommonModule, isPlatformBrowser} from '@angular/common';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {onAuthStateChanged, signInWithPopup, signOut, User} from 'firebase/auth';
import {firstValueFrom} from 'rxjs';
import {
  buildMasterHtmlPresentation,
  calculateDciIndex,
  calculateFinancialArchitecture,
  calculateOffGridRuntime,
  DciInput,
  formatTelemetrySnapshotsCsv,
  generateNativePdf14Bytes,
  MASTER_DOC_MARKDOWN,
  PYTHON_GENERATOR_SCRIPT,
} from './utils/smart-grid-engine';
import {
  ChecklistItem,
  COMPLETION_HTML_SNIPPET,
  COMPLIANCE_CHECKLIST,
  HARDWARE_INVENTORY,
  INITIAL_ZONES,
  PFRON_BUDGET_ITEMS,
} from './utils/studio-data';
import {initSmartGrid3DScene, SmartGrid3DController} from './utils/three-scene';

export interface AgentHistoryEntry {
  id: string;
  timestamp: string;
  mode: 'smart_grid_baltica' | 'hotel_gdansk' | 'legal_govtech';
  modeLabel: string;
  query: string;
  reply: string;
  citations: string[];
  engine: string;
  metrics: {
    bertScore: number;
    bleu4: number;
    rougeL: number;
    codeBleu: number;
    ttftMs: number;
    sha256Audit: string;
  };
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
  timestamp: string;
}

export interface SavedTelemetryRecord {
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

export interface SavedAiSessionRecord {
  id: number;
  sessionType: string;
  modelUsed: string;
  prompt: string;
  responseText: string;
  createdAt: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('smartGridCanvas') smartGridCanvasRef?: ElementRef<HTMLCanvasElement>;
  private threeController: SmartGrid3DController | null = null;
  private liveWs: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private authIdToken: string | null = null;

  // Presentation & Accessibility Modes
  readonly projectorMode = signal<boolean>(false);
  readonly ttsStatus = signal<string>('Gotowy (Synteza PL WCAG 2.1 AAA)');
  readonly exportFeedback = signal<string | null>(null);

  // Firebase Auth & Cloud SQL User State
  readonly currentUser = signal<{uid: string; email: string | null; displayName: string | null} | null>(
    null,
  );
  readonly authStatusMessage = signal<string | null>(null);
  readonly savedTelemetryList = signal<SavedTelemetryRecord[]>([]);
  readonly savedAiSessionsList = signal<SavedAiSessionRecord[]>([]);
  readonly savingToCloud = signal<boolean>(false);

  // Section 1: Smart Grid & dCi Telemetry + Three.js 3D State
  readonly zones = signal<Record<'ustka' | 'slupsk' | 'trojmiasto', DciInput>>(INITIAL_ZONES);
  readonly selectedZoneId = signal<'ustka' | 'slupsk' | 'trojmiasto'>('ustka');
  readonly threeCameraPreset = signal<'overview' | 'turbine' | 'substation' | 'corridor'>('overview');
  readonly threeWireframe = signal<boolean>(false);
  readonly threeAutoRotate = signal<boolean>(false);
  readonly threeDockCollapsed = signal<boolean>(false);

  readonly activeZoneInput = computed(() => this.zones()[this.selectedZoneId()]);
  readonly activeZoneEval = computed(() => calculateDciIndex(this.activeZoneInput()));

  readonly allZonesEvals = computed(() => {
    const z = this.zones();
    return [
      calculateDciIndex(z.ustka),
      calculateDciIndex(z.slupsk),
      calculateDciIndex(z.trojmiasto),
    ];
  });

  // Section 2: Multimodal Gemini AI Hub Tabs
  readonly activeAiTab = signal<'rag_chat' | 'grounding' | 'image_studio' | 'voice_audio'>(
    'rag_chat',
  );

  // 2A: Dual AI Agent & Multi-turn Gemini Chatbot
  readonly agentMode = signal<'smart_grid_baltica' | 'hotel_gdansk' | 'legal_govtech'>(
    'smart_grid_baltica',
  );
  readonly selectedChatModel = signal<'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'>(
    'gemini-3.8-flash',
  );
  readonly agentLoading = signal<boolean>(false);
  readonly agentError = signal<string | null>(null);

  readonly agentForm = new FormGroup({
    prompt: new FormControl<string>(
      'Jak wygląda korelacja generacji z morskiej farmy PGE Baltica 2 & 3 (WindShare) z indeksem dCi powietrza w Ustce oraz przełączaniem taryf pomp ciepła w Hotelu Gdańsk?',
      {nonNullable: true, validators: [Validators.required, Validators.minLength(4)]},
    ),
  });

  readonly chatMessages = signal<ChatTurn[]>([
    {
      id: 'chat-welcome',
      role: 'model',
      text: 'Witaj w wieloturowym czacie architektonicznym Gemini (Smart Grid Ustka–Słupsk–Trójmiasto & Hotel Gdańsk RAG). Wybierz model (gemini-3.8-flash, gemini-3.1-flash-lite lub gemini-4-argon) i zadaj pytanie techniczne.',
      modelUsed: 'gemini-3.8-flash',
      timestamp: '09:15:00 CET',
    },
  ]);

  // 2B: Google Search & Google Maps Grounding
  readonly groundingMode = signal<'search' | 'maps'>('search');
  readonly groundingLoading = signal<boolean>(false);
  readonly groundingForm = new FormGroup({
    query: new FormControl<string>(
      'Postępy budowy bazy O&M PGE Baltica w Porcie Ustka oraz stacji PSE Słupsk Wierzbięcino 400 kV',
      {nonNullable: true, validators: [Validators.required]},
    ),
  });
  readonly groundingResultText = signal<string>(
    'Wyszukiwanie uziemione (Google Search & Google Maps Grounding) weryfikuje w czasie rzeczywistym dane o korytarzu energetycznym Ustka – Słupsk – Trójmiasto oraz lokalizacjach referencyjnych.',
  );
  readonly groundingLinks = signal<{title: string; uri: string; snippet?: string}[]>([
    {
      title: 'Port Morski w Ustce — Baza O&M Offshore (54.5805°N, 16.8619°E)',
      uri: 'https://www.google.com/maps/search/?api=1&query=Port+Ustka',
    },
    {
      title: 'Stacja PSE Słupsk Wierzbięcino 400 kV (54.4641°N, 17.0285°E)',
      uri: 'https://www.google.com/maps/search/?api=1&query=Wierzbiecino+Slupsk',
    },
    {
      title: 'Hotel Gdańsk Boutique — ul. Szafarnia 9, Gdańsk Śródmieście',
      uri: 'https://www.google.com/maps/search/?api=1&query=Hotel+Gdansk+Szafarnia+9',
    },
  ]);

  // 2C: Image Creation & Editing Studio
  readonly imageLoading = signal<boolean>(false);
  readonly imageModel = signal<'gemini-3.1-flash-lite-image' | 'gemini-nano-banana-2.1'>(
    'gemini-3.1-flash-lite-image',
  );
  readonly imageAspectRatio = signal<'16:9' | '1:1' | '9:16' | '4:3'>('16:9');
  readonly uploadedEditImageBase64 = signal<string>('');
  readonly uploadedEditImageName = signal<string>('');
  readonly generatedImageUrl = signal<string>('');
  readonly generatedImageCaption = signal<string>(
    'Gotowy do generowania i edycji wizualizacji architektonicznych (domyślny model darmowy: gemini-3.1-flash-lite-image).',
  );
  readonly imageForm = new FormGroup({
    prompt: new FormControl<string>(
      'Futurystyczna baza serwisowa O&M morskich turbin wiatrowych PGE Baltica w Porcie Ustka z łączem światłowodowym i czujnikami jakości powietrza dCi o zachodzie słońca',
      {nonNullable: true, validators: [Validators.required]},
    ),
  });

  // 2D: Live Voice (gemini-3.8-live) & Audio Transcription (gemini-3.5-transcribe)
  readonly liveConnected = signal<boolean>(false);
  readonly liveStatusLabel = signal<string>('Rozłączony (Kliknij, aby połączyć z Gemini 3.8 Live)');
  readonly liveTranscriptFeed = signal<string[]>([
    'Gotowy do rozmowy głosowej w czasie rzeczywistym (gemini-3.8-live) oraz transkrypcji nagrań mikrofonowych (gemini-3.5-transcribe).',
  ]);
  readonly isRecordingAudio = signal<boolean>(false);
  readonly transcribingAudio = signal<boolean>(false);
  readonly audioTranscriptionResult = signal<string>(
    'Brak nowego nagrania — użyj mikrofonu lub wyślij próbny meldunek pomiarowy z Portu Ustka do modelu gemini-3.5-transcribe.',
  );

  // GovTech Audiokiosk & Rust Sanitizer
  readonly selectedKioskPoint = signal<'ops' | 'biblioteka' | 'poz'>('ops');
  readonly kioskHeadphonePlugged = signal<boolean>(false);
  readonly rustSanitizerLastFile = signal<string>(
    'zgloszenie_sygnalisty_port_ustka_2027.jpg -> CZYSTY (Usunięto GPS EXIF, XMP, IP=0.0.0.0)',
  );

  readonly agentHistory = signal<AgentHistoryEntry[]>([
    {
      id: 'seed-1',
      timestamp: '09:14:22 CET',
      mode: 'smart_grid_baltica',
      modeLabel: 'Smart Grid & Baltica (Prof. C. Orłowski)',
      query:
        'Podaj status pętli światłowodowej DWDM Ustka – Słupsk (GPZ Wierzbięcino 400 kV) – Trójmiasto oraz walidację czujników dCi.',
      reply:
        'Pętla światłowodowa DWDM pracuje ze średnią latencją 3.84 ms (spełnione rygorystyczne SLA < 5.0 ms). W węźle Ustka Port odnotowano wilgotność RH 88% — uruchomiono nieliniową korektę higroskopijną PM2.5 (skorygowane z 8.4 do 7.9 µg/m³) przy stężeniu aerozolu jodowego 9.2 µg/m³. Indeks dCi wynosi 96/100. Brak błędów zawieszenia czujnika (Flatline Fault = FALSE).',
      citations: [
        'Praca mgr (Promotor: Prof. dr hab. inż. Cezary Orłowski): Smart Grid Ustka–Trójmiasto–Słupsk',
        'Telemetria GPZ Wierzbięcino 400 kV & Baza O&M Port Ustka',
      ],
      engine: 'Deterministic RAG Guardrails (Zero Data Retention)',
      metrics: {
        bertScore: 0.87,
        bleu4: 0.42,
        rougeL: 0.68,
        codeBleu: 0.74,
        ttftMs: 320,
        sha256Audit: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
      },
    },
  ]);

  // Section 3: Hardware Desk 90°/180° & Off-Grid Energy Calculator
  readonly deskLayoutMode = signal<'book_90' | 'flat_180' | 'projector_120'>('flat_180');
  readonly hardwareCategoryFilter = signal<'ALL' | 'MOBILE' | 'STATIONARY'>('ALL');
  readonly mobileLoadWatts = signal<number>(45);
  readonly solarPanelWatts = signal<22.5 | 60 | 100>(60);
  readonly sunHours = signal<number>(5);
  readonly includePowerbanks = signal<boolean>(true);
  readonly ecoMode = signal<boolean>(false);

  readonly filteredHardware = computed(() => {
    const f = this.hardwareCategoryFilter();
    if (f === 'MOBILE') {
      return HARDWARE_INVENTORY.filter((item) => item.mobileIncluded);
    }
    if (f === 'STATIONARY') {
      return HARDWARE_INVENTORY.filter((item) => !item.mobileIncluded);
    }
    return HARDWARE_INVENTORY;
  });

  readonly totalStationaryWatts = computed(() =>
    HARDWARE_INVENTORY.reduce((acc, item) => acc + item.watts, 0),
  );

  readonly offGridComparison = computed(() => {
    const baseline22 = calculateOffGridRuntime({
      loadWatts: this.mobileLoadWatts(),
      solarPanelWatts: 22.5,
      sunHours: this.sunHours(),
      includePowerbanks: this.includePowerbanks(),
      ecoMode: this.ecoMode(),
    });
    const currentSelected = calculateOffGridRuntime({
      loadWatts: this.mobileLoadWatts(),
      solarPanelWatts: this.solarPanelWatts(),
      sunHours: this.sunHours(),
      includePowerbanks: this.includePowerbanks(),
      ecoMode: this.ecoMode(),
    });
    return {baseline22, currentSelected};
  });

  readonly travelChecklist = signal<
    {id: string; item: string; detail: string; ready: boolean}[]
  >([
    {
      id: 'c200',
      item: 'Stacja Anker SOLIX C200 (192Wh LiFePO4)',
      detail: 'Główna stacja 200W output, naładowana 100% (1.8 kg)',
      ready: true,
    },
    {
      id: 'powerbanks',
      item: '2x Powerbank 20 000 mAh + Panel Solar',
      detail: 'Dzienny bufor ładowania +148Wh nominalnie (+3.0h pracy)',
      ready: true,
    },
    {
      id: 'tb5',
      item: 'Kabel Thunderbolt 5 240W 8K (2m)',
      detail: 'Główny przewód wideo 4K 120Hz oraz zasilania PD',
      ready: true,
    },
    {
      id: 'acer-ipad',
      item: 'Acer Dual PD193QT + iPad Pro M5 (Pencil Pro)',
      detail: 'Złożone w tryb 180° flat do plecaka (~6 kg cały zestaw)',
      ready: true,
    },
    {
      id: 'tailscale',
      item: 'Tailscale VPN & Jump Desktop',
      detail: 'Szyfrowany dostęp zdalny do domowego serwera MacBook Pro i9',
      ready: true,
    },
    {
      id: 'strips',
      item: 'Zasilanie stacjonarne 2x Listwa 9-wejść (18 gniazd)',
      detail: 'Podłączone bezpośrednio do 2 osobnych obwodów ściennych (zakaz kaskady)',
      ready: true,
    },
  ]);

  // Section 4: Financial 60/30/10 & Grant Configurator
  readonly b2bRatePln = signal<number>(180);
  readonly b2bHoursMonth = signal<number>(100);
  readonly slaClientsCount = signal<number>(6);
  readonly slaAvgFeePln = signal<number>(1100);
  readonly auditsPerMonth = signal<number>(2);
  readonly auditAvgFeePln = signal<number>(4500);
  readonly taxMode = signal<'RYCZALT_12' | 'IP_BOX_5'>('IP_BOX_5');

  readonly financialBreakdown = computed(() =>
    calculateFinancialArchitecture({
      b2bRatePln: this.b2bRatePln(),
      b2bHoursMonth: this.b2bHoursMonth(),
      slaClientsCount: this.slaClientsCount(),
      slaAvgFeePln: this.slaAvgFeePln(),
      auditsPerMonth: this.auditsPerMonth(),
      auditAvgFeePln: this.auditAvgFeePln(),
      taxMode: this.taxMode(),
    }),
  );

  readonly pfronItems = signal(PFRON_BUDGET_ITEMS);
  readonly pfronTotalPln = computed(() =>
    this.pfronItems().reduce((sum, item) => sum + item.costPln, 0),
  );
  readonly pfronLimitPln = 143400;

  // Section 5: Master Code & Export Hub
  readonly activeCodeTab = signal<'html_completion' | 'python_generator' | 'master_markdown'>(
    'html_completion',
  );
  readonly complianceItems = signal<ChecklistItem[]>(COMPLIANCE_CHECKLIST);
  readonly completionHtmlSnippet = COMPLETION_HTML_SNIPPET;
  readonly pythonGeneratorScript = PYTHON_GENERATOR_SCRIPT;
  readonly masterDocMarkdown = MASTER_DOC_MARKDOWN;

  readonly completedComplianceCount = computed(
    () => this.complianceItems().filter((i) => i.checked).length,
  );

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1. Initialize Three.js 3D Scene
    const canvas = this.smartGridCanvasRef?.nativeElement;
    if (canvas) {
      try {
        const evalNow = this.activeZoneEval();
        this.threeController = initSmartGrid3DScene(canvas, {
          windShareMw: this.activeZoneInput().windShareMw,
          dCiScore: evalNow.dCiScore,
          fiberLatencyMs: evalNow.fiberLatencyMs,
          selectedZone: this.selectedZoneId(),
          wireframe: this.threeWireframe(),
          autoRotate: this.threeAutoRotate(),
        });
      } catch {
        // Fallback smoothly if WebGL context unavailable
      }
    }

    // 2. Initialize Firebase Auth listener in browser only
    import('../lib/firebase-client').then(({auth}) => {
      onAuthStateChanged(auth, async (user: User | null) => {
        if (user) {
          this.authIdToken = await user.getIdToken();
          this.currentUser.set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          });
          await this.loadCloudRecords();
        } else {
          this.authIdToken = null;
          this.currentUser.set(null);
          this.savedTelemetryList.set([]);
          this.savedAiSessionsList.set([]);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.threeController?.dispose();
    if (this.liveWs) {
      this.liveWs.close();
      this.liveWs = null;
    }
  }

  private syncThreeScene(): void {
    if (!this.threeController) return;
    const evalNow = this.activeZoneEval();
    this.threeController.updateState({
      windShareMw: this.activeZoneInput().windShareMw,
      dCiScore: evalNow.dCiScore,
      fiberLatencyMs: evalNow.fiberLatencyMs,
      selectedZone: this.selectedZoneId(),
      wireframe: this.threeWireframe(),
      autoRotate: this.threeAutoRotate(),
    });
  }

  // Actions — Three.js 3D Scene Controls
  setThreePreset(preset: 'overview' | 'turbine' | 'substation' | 'corridor'): void {
    this.threeCameraPreset.set(preset);
    this.threeAutoRotate.set(false);
    this.threeController?.setCameraPreset(preset);
  }

  toggleThreeWireframe(): void {
    this.threeWireframe.update((v) => !v);
    this.syncThreeScene();
  }

  toggleThreeAutoRotate(): void {
    this.threeAutoRotate.update((v) => !v);
    this.syncThreeScene();
  }

  // Actions — Firebase Authentication & Cloud SQL Persistence
  async signInWithGoogle(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.authStatusMessage.set(null);
    try {
      const {auth, googleAuthProvider} = await import('../lib/firebase-client');
      const cred = await signInWithPopup(auth, googleAuthProvider);
      this.authIdToken = await cred.user.getIdToken();
      this.currentUser.set({
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName,
      });
      this.authStatusMessage.set(`Zalogowano jako ${cred.user.email ?? cred.user.displayName}`);
      await this.loadCloudRecords();
    } catch {
      this.authStatusMessage.set(
        'Logowanie Google wymaga zatwierdzenia wyskakującego okna w przeglądarce.',
      );
    }
  }

  async signOutUser(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const {auth} = await import('../lib/firebase-client');
      await signOut(auth);
      this.authIdToken = null;
      this.currentUser.set(null);
      this.authStatusMessage.set('Wylogowano z sesji Architekta.');
    } catch {
      // Ignore signout error
    }
  }

  async loadCloudRecords(): Promise<void> {
    if (!this.authIdToken) return;
    try {
      const headers = new HttpHeaders({Authorization: `Bearer ${this.authIdToken}`});
      const res = await firstValueFrom(
        this.http.get<{
          snapshots: SavedTelemetryRecord[];
          sessions: SavedAiSessionRecord[];
        }>('/api/db/records', {headers}),
      );
      this.savedTelemetryList.set(res.snapshots ?? []);
      this.savedAiSessionsList.set(res.sessions ?? []);
    } catch {
      // Non-blocking if user has no records yet
    }
  }

  async saveActiveTelemetryToCloud(): Promise<void> {
    const zEval = this.activeZoneEval();
    const zIn = this.activeZoneInput();
    const localRecord: SavedTelemetryRecord = {
      id: Date.now(),
      zoneId: zEval.zoneId,
      zoneName: zEval.zoneName,
      dCiScore: zEval.dCiScore,
      correctedPm25: String(zEval.correctedPm25),
      humidityRh: zEval.humidityRh,
      fiberLatencyMs: String(zEval.fiberLatencyMs),
      windShareMw: zIn.windShareMw,
      createdAt: new Date().toISOString(),
    };

    if (!this.authIdToken) {
      this.savedTelemetryList.update((prev) => [localRecord, ...prev]);
      this.authStatusMessage.set(
        `Zapisano lokalną migawkę dCi (${zEval.zoneName}) na liście sesji (${this.savedTelemetryList().length}). Zaloguj się przez Google, aby zsynchronizować z Cloud SQL.`,
      );
      return;
    }
    this.savingToCloud.set(true);
    try {
      const headers = new HttpHeaders({Authorization: `Bearer ${this.authIdToken}`});
      await firstValueFrom(
        this.http.post(
          '/api/db/telemetry',
          {
            zoneId: zEval.zoneId,
            zoneName: zEval.zoneName,
            dCiScore: zEval.dCiScore,
            correctedPm25: String(zEval.correctedPm25),
            humidityRh: zEval.humidityRh,
            fiberLatencyMs: String(zEval.fiberLatencyMs),
            windShareMw: zIn.windShareMw,
          },
          {headers},
        ),
      );
      this.authStatusMessage.set(`Zapisano migawkę telemetrii (${zEval.zoneName}) na koncie.`);
      await this.loadCloudRecords();
    } catch {
      this.savedTelemetryList.update((prev) => [localRecord, ...prev]);
      this.authStatusMessage.set(
        `Zapisano migawkę telemetrii (${zEval.zoneName}) w pamięci lokalnej.`,
      );
    } finally {
      this.savingToCloud.set(false);
    }
  }

  // Actions — Section 1 (Smart Grid & dCi)
  selectZone(zoneId: 'ustka' | 'slupsk' | 'trojmiasto'): void {
    this.selectedZoneId.set(zoneId);
    this.syncThreeScene();
  }

  updateZoneParam(
    field: 'pm25' | 'pm10' | 'no2' | 'humidityRh' | 'iodineUgM3' | 'fiberLatencyMs',
    rawValue: string | number,
  ): void {
    const num = Number(rawValue);
    if (Number.isNaN(num)) return;
    const id = this.selectedZoneId();
    this.zones.update((prev) => {
      const current = prev[id];
      const updatedHistory =
        field === 'pm25'
          ? [...current.readingsHistory.slice(-2), num, num + 0.2]
          : current.readingsHistory;
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: num,
          readingsHistory: updatedHistory,
        },
      };
    });
    this.syncThreeScene();
  }

  simulateSensorFaultOrRecovery(injectFault: boolean): void {
    const id = this.selectedZoneId();
    this.zones.update((prev) => {
      const current = prev[id];
      return {
        ...prev,
        [id]: {
          ...current,
          readingsHistory: injectFault
            ? [15.0, 15.0, 15.0, 15.0]
            : [current.pm25 - 0.3, current.pm25 + 0.2, current.pm25],
        },
      };
    });
    this.syncThreeScene();
  }

  // Actions — Section 2A (AI Agent & Multi-turn Gemini Chatbot)
  setAgentMode(mode: 'smart_grid_baltica' | 'hotel_gdansk' | 'legal_govtech'): void {
    this.agentMode.set(mode);
    this.agentError.set(null);
    if (mode === 'hotel_gdansk') {
      this.agentForm.controls.prompt.setValue(
        'Jak agent RAG w Hotelu Gdańsk Śródmieście optymalizuje pompy ciepła i rezerwacje przy nadwyżce mocy z Baltica WindShare?',
      );
    } else if (mode === 'legal_govtech') {
      this.agentForm.controls.prompt.setValue(
        'Przedstaw specyfikację budżetu 11 000 PLN brutto dla 3 audiokiosków (OPS, Biblioteka, POZ) oraz sanitację EXIF w języku Rust.',
      );
    } else {
      this.agentForm.controls.prompt.setValue(
        'Jak wygląda korelacja generacji z morskiej farmy PGE Baltica 2 & 3 (WindShare) z indeksem dCi powietrza w Ustce oraz latencją światłowodu DWDM?',
      );
    }
  }

  applyPresetPrompt(promptText: string): void {
    this.agentForm.controls.prompt.setValue(promptText);
    this.agentError.set(null);
  }

  async submitAgentQuery(): Promise<void> {
    const promptVal = this.agentForm.controls.prompt.value.trim();
    if (!promptVal || promptVal.length < 4) {
      this.agentError.set(
        'Wprowadź pytanie techniczne (minimum 4 znaki), aby uruchomić analizę RAG i czat Gemini.',
      );
      return;
    }

    this.agentError.set(null);
    this.agentLoading.set(true);

    const mode = this.agentMode();
    const zoneEval = this.activeZoneEval();
    const chosenModel = this.selectedChatModel();
    const modeLabel =
      mode === 'hotel_gdansk'
        ? 'Hotel Gdańsk RAG (Praca Inż.)'
        : mode === 'legal_govtech'
          ? 'Legal Tech & GovTech Audiokiosk'
          : 'Smart Grid & Baltica (Prof. C. Orłowski)';

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} CET`;

    this.chatMessages.update((msgs) => [
      ...msgs,
      {
        id: `u-${Date.now()}`,
        role: 'user',
        text: promptVal,
        timestamp: timeStr,
      },
    ]);

    try {
      const telemetryContext = {
        zoneId: zoneEval.zoneId,
        zoneName: zoneEval.zoneName,
        dCiScore: zoneEval.dCiScore,
        correctedPm25: zoneEval.correctedPm25,
        humidityRh: zoneEval.humidityRh,
        fiberLatencyMs: zoneEval.fiberLatencyMs,
        tariffAction: zoneEval.tariffAction,
      };

      const [ragRes, chatRes] = await Promise.all([
        firstValueFrom(
          this.http.post<{
            reply: string;
            citations: string[];
            engine: string;
            metrics: AgentHistoryEntry['metrics'];
          }>('/api/agent', {
            mode,
            prompt: promptVal,
            telemetryContext,
          }),
        ),
        firstValueFrom(
          this.http.post<{reply: string; modelUsed: string}>('/api/gemini/chat', {
            model: chosenModel,
            messages: this.chatMessages().map((m) => ({role: m.role, text: m.text})),
            prompt: promptVal,
            telemetryContext,
          }),
        ),
      ]);

      const entry: AgentHistoryEntry = {
        id: `q-${Date.now()}`,
        timestamp: timeStr,
        mode,
        modeLabel,
        query: promptVal,
        reply: chatRes.reply || ragRes.reply,
        citations: ragRes.citations,
        engine: `${chatRes.modelUsed} + RAG Guardrails`,
        metrics: ragRes.metrics,
      };

      this.agentHistory.update((list) => [entry, ...list]);
      this.chatMessages.update((msgs) => [
        ...msgs,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: chatRes.reply || ragRes.reply,
          modelUsed: chatRes.modelUsed,
          timestamp: timeStr,
        },
      ]);

      if (this.authIdToken) {
        const headers = new HttpHeaders({Authorization: `Bearer ${this.authIdToken}`});
        await firstValueFrom(
          this.http.post(
            '/api/db/ai-session',
            {
              sessionType: mode,
              modelUsed: chatRes.modelUsed,
              prompt: promptVal,
              responseText: (chatRes.reply || ragRes.reply).slice(0, 600),
              groundingLinksJson: JSON.stringify(ragRes.citations),
            },
            {headers},
          ),
        );
        await this.loadCloudRecords();
      }
    } catch {
      this.agentError.set('Nie udało się połączyć z węzłem czatu Gemini. Spróbuj ponownie.');
    } finally {
      this.agentLoading.set(false);
    }
  }

  // Actions — Section 2B (Google Search & Google Maps Grounding)
  async runGroundingQuery(mode: 'search' | 'maps'): Promise<void> {
    this.groundingMode.set(mode);
    const q = this.groundingForm.controls.query.value.trim();
    if (!q) return;

    this.groundingLoading.set(true);
    try {
      if (mode === 'search') {
        const res = await firstValueFrom(
          this.http.post<{
            text: string;
            links: {title: string; uri: string}[];
          }>('/api/gemini/search-grounding', {query: q}),
        );
        this.groundingResultText.set(res.text);
        this.groundingLinks.set(res.links ?? []);
      } else {
        const coords =
          this.selectedZoneId() === 'ustka'
            ? {latitude: 54.5805, longitude: 16.8619}
            : this.selectedZoneId() === 'slupsk'
              ? {latitude: 54.4641, longitude: 17.0285}
              : {latitude: 54.352, longitude: 18.658};
        const res = await firstValueFrom(
          this.http.post<{
            text: string;
            places: {title: string; uri: string; snippet?: string}[];
          }>('/api/gemini/maps-grounding', {
            query: q,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
        );
        this.groundingResultText.set(res.text);
        this.groundingLinks.set(res.places ?? []);
      }
    } catch {
      this.groundingResultText.set('Błąd połączenia z usługą Grounding.');
    } finally {
      this.groundingLoading.set(false);
    }
  }

  // Actions — Section 2C (Image Creation & Editing Studio)
  onEditImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadedEditImageName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.uploadedEditImageBase64.set(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async generateOrEditStudioImage(): Promise<void> {
    const prompt = this.imageForm.controls.prompt.value.trim();
    if (!prompt) return;
    this.imageLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<{imageUrl: string; caption: string; modelUsed: string}>(
          '/api/gemini/image',
          {
            prompt,
            aspectRatio: this.imageAspectRatio(),
            model: this.imageModel(),
            base64Image: this.uploadedEditImageBase64(),
          },
        ),
      );
      this.generatedImageUrl.set(res.imageUrl);
      this.generatedImageCaption.set(res.caption);
    } catch {
      this.generatedImageCaption.set('Nie udało się wygenerować obrazu.');
    } finally {
      this.imageLoading.set(false);
    }
  }

  // Actions — Section 2D (Gemini 3.8 Live Voice & Gemini 3.5 Audio Transcription)
  toggleLiveVoiceSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.liveConnected()) {
      this.liveWs?.close();
      this.liveWs = null;
      this.liveConnected.set(false);
      this.liveStatusLabel.set('Rozłączony (Kliknij, aby połączyć z Gemini 3.8 Live)');
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/api/live`;
    const ws = new WebSocket(wsUrl);
    this.liveWs = ws;
    this.liveStatusLabel.set('Łączenie z mostem WebSocket /api/live (gemini-3.8-live)...');

    ws.onopen = () => {
      this.liveConnected.set(true);
      this.liveStatusLabel.set('Połączono: Sesja Głosowa Gemini 3.8 Live Aktywna');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.inputTranscript) {
          this.liveTranscriptFeed.update((list) => [
            `[Ty]: ${msg.inputTranscript}`,
            ...list.slice(0, 7),
          ]);
        }
        if (msg.outputTranscript) {
          this.liveTranscriptFeed.update((list) => [
            `[Gemini 3.8 Live]: ${msg.outputTranscript}`,
            ...list.slice(0, 7),
          ]);
        }
      } catch {
        // Ignore non-JSON frame
      }
    };

    ws.onclose = () => {
      this.liveConnected.set(false);
      this.liveStatusLabel.set('Sesja zakończona (Kliknij, aby połączyć ponownie)');
    };
  }

  sendLiveVoicePrompt(textPrompt: string): void {
    if (!this.liveConnected() || !this.liveWs) {
      this.toggleLiveVoiceSession();
      setTimeout(() => {
        this.liveWs?.send(JSON.stringify({textPrompt}));
      }, 350);
      return;
    }
    this.liveTranscriptFeed.update((list) => [`[Ty]: ${textPrompt}`, ...list.slice(0, 7)]);
    this.liveWs.send(JSON.stringify({textPrompt}));
  }

  async toggleMicrophoneRecording(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.isRecordingAudio()) {
      this.mediaRecorder?.stop();
      this.isRecordingAudio.set(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      this.recordedChunks = [];
      const recorder = new MediaRecorder(stream);
      this.mediaRecorder = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(this.recordedChunks, {type: 'audio/webm'});
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            this.submitAudioForTranscription(reader.result, 'audio/webm');
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      this.isRecordingAudio.set(true);
      this.audioTranscriptionResult.set('Nagrywanie z mikrofonu w toku... Kliknij ponownie, aby zakończyć i transkrybować.');
    } catch {
      // If headless browser or microphone permission denied, run sample transcription
      await this.submitAudioForTranscription('', 'audio/webm');
    }
  }

  async submitAudioForTranscription(base64Audio: string, mimeType: string): Promise<void> {
    this.transcribingAudio.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<{transcript: string; modelUsed: string}>('/api/gemini/transcribe', {
          base64Audio,
          mimeType,
          hintText:
            'Meldunek głosowy z węzła Ustka Port O&M: generacja morska PGE Baltica 2 i 3 wynosi 1420 MW, latencja światłowodu DWDM 3.84 ms, indeks jakości powietrza dCi 96/100 po korekcie wilgotności RH 88%.',
        }),
      );
      this.audioTranscriptionResult.set(`[${res.modelUsed}]: ${res.transcript}`);
    } catch {
      this.audioTranscriptionResult.set('Nie udało się wykonać transkrypcji audio.');
    } finally {
      this.transcribingAudio.set(false);
    }
  }

  speakKioskAnnouncement(location: 'ops' | 'biblioteka' | 'poz'): void {
    this.selectedKioskPoint.set(location);
    const messages: Record<'ops' | 'biblioteka' | 'poz', string> = {
      ops: 'Terminal Ośrodka Pomocy Społecznej. Tryb Zero-PII aktywny. Aby złożyć wniosek o dodatek energetyczny lub wsparcie asystenta z sieci dziesięciu lokalnych wolontariuszy, naciśnij żółty przycisk potwierdzenia.',
      biblioteka:
        'Terminal Biblioteki Publicznej. Dostępność cyfrowa WCAG dwa jeden trzy A. Możesz odsłuchać komunikaty gminne, sprawdzić jakość powietrza dCi w Ustce i Słupsku lub połączyć się z dyżurnym wolontariuszem.',
      poz: 'Terminal Przychodni Podstawowej Opieki Zdrowotnej. Gniazdo słuchawkowe aktywne na wysokości dziewięćdziesięciu centymetrów. Rejestracja głosowa dla seniorów i osób ze szczególnymi potrzebami bez zapisu danych osobowych.',
    };

    const msg = messages[location];
    this.ttsStatus.set(`Odczyt TTS (${location.toUpperCase()}): "${msg.slice(0, 68)}..."`);

    if (isPlatformBrowser(this.platformId) && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.lang = 'pl-PL';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Fallback status already updated in UI
      }
    }
  }

  toggleHeadphoneJack(): void {
    this.kioskHeadphonePlugged.update((v) => !v);
  }

  simulateRustExifSanitize(): void {
    const samples = [
      'skan_umowy_b2b_gdansk_exif.pdf -> CZYSTY (Usunięto autora, metadane XMP, SHA-256 zweryfikowany)',
      'zdjecie_awarii_gpz_slupsk.jpg -> CZYSTY (Usunięto koordynaty GPS EXIF, IP=0.0.0.0)',
      'sygnalista_zamowienia_publiczne.docx -> CZYSTY (Wyczyszczono nagłówki OLE/PII w 1.4 ms w Rust)',
    ];
    const next = samples[Math.floor(Math.random() * samples.length)];
    this.rustSanitizerLastFile.set(next);
  }

  // Actions — Section 3 (Hardware & Off-Grid)
  setSolarPanelWatts(watts: 22.5 | 60 | 100): void {
    this.solarPanelWatts.set(watts);
  }

  setMobileLoadWatts(watts: number): void {
    this.mobileLoadWatts.set(watts);
  }

  toggleTravelItem(id: string): void {
    this.travelChecklist.update((list) =>
      list.map((item) => (item.id === id ? {...item, ready: !item.ready} : item)),
    );
  }

  // Actions — Section 4 (Financials)
  updateFinancialSlider(
    field: 'b2bRatePln' | 'b2bHoursMonth' | 'slaClientsCount' | 'slaAvgFeePln' | 'auditsPerMonth',
    value: string | number,
  ): void {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    if (field === 'b2bRatePln') this.b2bRatePln.set(num);
    if (field === 'b2bHoursMonth') this.b2bHoursMonth.set(num);
    if (field === 'slaClientsCount') this.slaClientsCount.set(num);
    if (field === 'slaAvgFeePln') this.slaAvgFeePln.set(num);
    if (field === 'auditsPerMonth') this.auditsPerMonth.set(num);
  }

  // Actions — Section 5 (Compliance & Direct Browser Exports)
  toggleComplianceItem(id: string): void {
    this.complianceItems.update((items) =>
      items.map((item) => (item.id === id ? {...item, checked: !item.checked} : item)),
    );
  }

  downloadDocument(format: 'md' | 'txt' | 'pdf' | 'html' | 'py'): void {
    if (!isPlatformBrowser(this.platformId)) return;

    let blob: Blob;
    let filename: string;

    if (format === 'md') {
      blob = new Blob([this.masterDocMarkdown], {type: 'text/markdown;charset=utf-8'});
      filename = 'Dokumentacja_Architekta_Master.md';
    } else if (format === 'txt') {
      blob = new Blob([this.masterDocMarkdown], {type: 'text/plain;charset=utf-8'});
      filename = 'Dokumentacja_Architekta_Master.txt';
    } else if (format === 'pdf') {
      const pdfBytes = generateNativePdf14Bytes(this.masterDocMarkdown);
      blob = new Blob([pdfBytes.buffer as ArrayBuffer], {type: 'application/pdf'});
      filename = 'Dokumentacja_Architekta_Master.pdf';
    } else if (format === 'html') {
      const fullHtml = buildMasterHtmlPresentation(this.masterDocMarkdown);
      blob = new Blob([fullHtml], {type: 'text/html;charset=utf-8'});
      filename = 'Prezentacja_Multimedialna_Master.html';
    } else {
      blob = new Blob([this.pythonGeneratorScript], {type: 'text/x-python;charset=utf-8'});
      filename = 'generator_pdf_md_txt.py';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.exportFeedback.set(
      `Wygenerowano i pobrano plik: ${filename} (${(blob.size / 1024).toFixed(1)} KB)`,
    );
  }

  exportSavedTelemetryCsv(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const saved = this.savedTelemetryList();
    const nowIso = new Date().toISOString();
    const rowsToExport: SavedTelemetryRecord[] =
      saved.length > 0
        ? saved
        : this.allZonesEvals().map((zEval, idx) => {
            const zIn = this.zones()[zEval.zoneId];
            return {
              id: idx + 1,
              zoneId: zEval.zoneId,
              zoneName: zEval.zoneName,
              dCiScore: zEval.dCiScore,
              correctedPm25: String(zEval.correctedPm25),
              humidityRh: zEval.humidityRh,
              fiberLatencyMs: String(zEval.fiberLatencyMs),
              windShareMw: zIn?.windShareMw ?? 1420,
              createdAt: nowIso,
            };
          });

    const csvContent = formatTelemetrySnapshotsCsv(rowsToExport);
    const filename = 'Telemetria_Smart_Grid_Snapshots.csv';
    const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const statusMsg = `Wyeksportowano ${rowsToExport.length} rekordów telemetrii dCi do pliku ${filename} (${(blob.size / 1024).toFixed(1)} KB)`;
    this.authStatusMessage.set(statusMsg);
    this.exportFeedback.set(statusMsg);
  }

  async copyCodeToClipboard(content: string, label: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      await navigator.clipboard.writeText(content);
      this.exportFeedback.set(`Skopiowano do schowka: ${label}`);
    } catch {
      this.exportFeedback.set(`Gotowe do pobrania: ${label}`);
    }
  }
}
