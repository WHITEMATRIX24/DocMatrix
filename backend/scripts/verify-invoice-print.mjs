// Runs the exact current print-template function with synthetic values in an offline browser.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const source = (await readFile('../src/pages/billing/BillingShared.tsx', 'utf8')).replaceAll('\r\n','\n');
const start = source.indexOf('const escapeHtml =');
const end = source.indexOf('\n}',source.indexOf('export const printInvoice')) + 2;
if (start < 0 || end < start) throw new Error('Print template could not be located.');
const code = ts.transpileModule(source.slice(start,end), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
let html = '';
const popup = { document: { open(){}, write(value){html=value;}, close(){} }, print(){}, opener: null };
const context = { exports: {}, CLINIC_CONFIG: { clinicName:'Synthetic clinic', clinicAddress:'Synthetic address', clinicPhone:'000' }, sessionStorage:{getItem:()=>null}, localStorage:{getItem:()=>null}, lineItemTotals:()=>({total:1}), inr:x=>String(x), invoicePaidAmount:()=>0, invoiceBalance:()=>1, prettyDate:()=> '2026-11-20', window:{open:()=>popup} };
vm.runInNewContext(code,context);
const payload = '<img src="data:invalid" onerror="window.__invoiceInjected=true">';
context.exports.printInvoice({id:payload,description:'Synthetic service',amount:1,createdAt:'2026-11-20',status:'Issued',payments:[{amount:1,mode:payload,receivedAt:'2026-11-20'}]}, {id:payload,firstName:'Synthetic',lastName:'Patient'});
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'msedge', headless: true });
try {
  const page = await browser.newPage(); await page.route('**/*',route=>route.abort());
  await page.setContent(html);
  await page.waitForTimeout(250);
  assert.equal(await page.locator('img,script,[onerror]').count(),0);
  assert.equal(await page.evaluate(()=>window.__invoiceInjected===true),false);
  assert((await page.locator('body').innerText()).includes(payload));
  await mkdir('.verification/browser',{recursive:true});
  await writeFile('.verification/browser/invoice-print-safety.json',JSON.stringify({verifiedAt:new Date().toISOString(),syntheticPayloadRenderedAsText:true,injectedScriptExecuted:false,networkBlocked:true},null,2));
  console.log('Invoice print safety: synthetic identifiers rendered as text; no injected script executed.');
} finally { await browser.close(); }
