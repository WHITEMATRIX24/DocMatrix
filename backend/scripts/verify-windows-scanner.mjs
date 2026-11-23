// Uses only generated scratch uploads. Never changes antivirus settings.
import 'reflect-metadata';
import { MalwareScannerService, WindowsDefenderScannerAdapter } from '../dist/storage/malware-scanner.service.js';
import { writeFile, mkdir } from 'node:fs/promises';
if (process.platform !== 'win32') throw new Error('This verification requires Windows Defender.');
process.env.MALWARE_SCANNER = 'windows-defender';
process.env.SCANNER_REQUIRED = 'true';
const scanner = new MalwareScannerService();
const clean = Buffer.from('%PDF-1.4\nSynthetic antivirus verification only.\n%%EOF');
const result = await scanner.scanBuffer(clean, 'synthetic.pdf');
if (!result.isClean || result.engine !== 'windows-defender') throw new Error('The live scanner did not confirm the clean upload.');
// EICAR is a harmless standard antivirus test, not executable malware.
const eicar = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
let externalRejected = false;
try { await new WindowsDefenderScannerAdapter().scanStream(eicar); }
catch { externalRejected = true; }
if (!externalRejected) throw new Error('The external scanner unexpectedly accepted the antivirus test payload.');
let builtinRejected = false;
try { await scanner.scanBuffer(eicar, 'synthetic-eicar.txt'); }
catch (error) { builtinRejected = error.getStatus?.() === 400; }
scanner.setAdapter({ async scanStream() { throw new Error('Synthetic scanner outage'); } });
let failClosed = false;
try { await scanner.scanBuffer(clean, 'synthetic.pdf'); }
catch (error) { failClosed = error.getStatus?.() === 503; }
if (!builtinRejected || !failClosed) throw new Error('Upload rejection verification failed.');
const proof = { verifiedAt: new Date().toISOString(), host: 'Windows', liveCleanScan: true, externalTestPayloadRejected: true, externalRejectionMayIncludeRealtimeProtection: true, builtinTestPayloadRejected: true, outageFailsClosed: true };
await mkdir('.verification', { recursive: true });
await writeFile('.verification/windows-scanner-proof.json', JSON.stringify(proof, null, 2));
console.log('Windows upload scanning verified: clean upload accepted, antivirus test rejected, engine outage rejected.');
