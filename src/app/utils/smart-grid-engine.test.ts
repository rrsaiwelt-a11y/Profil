import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDciIndex,
  calculateFinancialArchitecture,
  calculateOffGridRuntime,
  detectSensorFlatline,
  formatTelemetrySnapshotsCsv,
  generateNativePdf14Bytes,
  MASTER_DOC_MARKDOWN,
} from './smart-grid-engine';

test('detectSensorFlatline identifies identical consecutive readings', () => {
  assert.equal(detectSensorFlatline([12.4, 12.4, 12.4, 12.4]), true);
  assert.equal(detectSensorFlatline([12.4, 12.8, 12.1]), false);
  assert.equal(detectSensorFlatline([10.0, 10.0]), false);
});

test('calculateDciIndex applies RH > 85% hygroscopic correction and checks fiber < 5ms', () => {
  const ustkaResult = calculateDciIndex({
    zoneId: 'ustka',
    zoneName: 'Ustka Port — Baza Offshore O&M',
    pm25: 10.0,
    pm10: 18.0,
    no2: 11.0,
    humidityRh: 90,
    iodineUgM3: 8.5,
    fiberLatencyMs: 3.84,
    windShareMw: 1420,
    readingsHistory: [9.8, 10.2, 10.0],
  });

  assert.equal(ustkaResult.humidityCorrectionApplied, true);
  assert.equal(ustkaResult.correctedPm25 < ustkaResult.rawPm25, true);
  assert.equal(ustkaResult.fiberSlaPassed, true);
  assert.equal(ustkaResult.isFlatline, false);
  assert.equal(ustkaResult.dCiScore >= 85, true);
  assert.equal(ustkaResult.tariffAction, 'COASTAL_VENTILATION_BOOST');
});

test('calculateOffGridRuntime computes mobile studio hours accurately for 22.5W vs 60W solar', () => {
  const base22 = calculateOffGridRuntime({
    loadWatts: 45,
    solarPanelWatts: 22.5,
    sunHours: 5,
    includePowerbanks: true,
    ecoMode: false,
  });

  const opt60 = calculateOffGridRuntime({
    loadWatts: 45,
    solarPanelWatts: 60,
    sunHours: 5,
    includePowerbanks: true,
    ecoMode: false,
  });

  assert.equal(base22.stationHours, 4.3);
  assert.equal(base22.powerbankHours, 3.0);
  assert.equal(base22.solarGeneratedWh, 112.5);
  assert.equal(opt60.solarGeneratedWh, 300);
  assert.equal(opt60.totalHours > base22.totalHours, true);
  assert.equal(opt60.stationChargeTimeHours, 3.2);
});

test('calculateFinancialArchitecture computes 60/30/10 cashflows and 4 monthly payout dates', () => {
  const fin = calculateFinancialArchitecture({
    b2bRatePln: 180,
    b2bHoursMonth: 100,
    slaClientsCount: 6,
    slaAvgFeePln: 1100,
    auditsPerMonth: 2,
    auditAvgFeePln: 4500,
    taxMode: 'IP_BOX_5',
  });

  assert.equal(fin.b2bGrossPln, 18000);
  assert.equal(fin.slaMrrPln, 6600);
  assert.equal(fin.auditsTotalPln, 9000);
  assert.equal(fin.payoutSchedule.day5SlaPln, 6600);
  assert.equal(fin.payoutSchedule.day10B2bPln, 18000);
  assert.equal(fin.payoutSchedule.day18AuditAdvancePln, 3600);
  assert.equal(fin.payoutSchedule.day25MunicipalCompletionPln, 5400);
  assert.equal(fin.totalGrossMonthlyPln, 33600);
});

test('generateNativePdf14Bytes produces valid PDF-1.4 header, objects, xref, and EOF', () => {
  const bytes = generateNativePdf14Bytes(MASTER_DOC_MARKDOWN);
  const text = new TextDecoder('latin1').decode(bytes);
  assert.equal(text.startsWith('%PDF-1.4\n'), true);
  assert.equal(text.includes('/Type /Catalog'), true);
  assert.equal(text.includes('/BaseFont /Courier'), true);
  assert.equal(text.includes('xref\n'), true);
  assert.equal(text.trimEnd().endsWith('%%EOF'), true);
});

test('formatTelemetrySnapshotsCsv generates UTF-8 BOM, headers, and escaped rows', () => {
  const csv = formatTelemetrySnapshotsCsv([
    {
      id: 1,
      zoneId: 'ustka',
      zoneName: 'Ustka Port, Baza "Offshore" O&M',
      dCiScore: 96,
      correctedPm25: '6.8',
      humidityRh: 88,
      fiberLatencyMs: '3.84',
      windShareMw: 1420,
      createdAt: '2026-11-11T21:00:00.000Z',
    },
  ]);

  assert.equal(csv.startsWith('\uFEFFid,zoneId,zoneName,dCiScore,correctedPm25,humidityRh,fiberLatencyMs,windShareMw,createdAt\r\n'), true);
  assert.equal(csv.includes('1,ustka,"Ustka Port, Baza ""Offshore"" O&M",96,6.8,88,3.84,1420,2026-11-11T21:00:00.000Z\r\n'), true);
});

