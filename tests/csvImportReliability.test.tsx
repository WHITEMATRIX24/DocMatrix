import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DataExchangePage from '@/pages/settings/DataExchangePage';
import { apiClient } from '@/services/apiClient';
beforeEach(() => { browserLocalStorage.clear(); browserSessionStorage.clear(); });
afterEach(() => vi.restoreAllMocks());
async function upload(csv: string) {
  const {container}=render(<MemoryRouter><DataExchangePage /></MemoryRouter>);
  fireEvent.change(container.querySelector('input[type=file]')!,{target:{files:[new File([csv],'synthetic.csv',{type:'text/csv'})]}});
}
it('stops before writing when duplicate checking fails and preserves the preview',async()=>{
  vi.spyOn(apiClient,'get').mockRejectedValue(new Error('Synthetic duplicate lookup outage'));
  const post=vi.spyOn(apiClient,'post');
  await upload('First Name,Last Name,Mobile,Date of Birth\nSynthetic,Patient,0123456789,2000-01-02');
  fireEvent.click(await screen.findByRole('button',{name:'Import 1 Patients'}));
  await screen.findByText('Synthetic duplicate lookup outage');
  expect(post).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Import 1 Patients'})).toBeInTheDocument();
});
it('rejects an age-only file rather than manufacturing birth dates',async()=>{
  const post=vi.spyOn(apiClient,'post');
  await upload('First Name,Last Name,Mobile,Age\nSynthetic,Patient,0123456789,32');
  await screen.findByText(/Date of Birth columns are required/);
  expect(post).not.toHaveBeenCalled();
});
it('imports a reviewed verified DOB unchanged',async()=>{
  vi.spyOn(apiClient,'get').mockResolvedValue([]);
  const post=vi.spyOn(apiClient,'post').mockResolvedValue({id:'synthetic-id'});
  await upload('First Name,Last Name,Mobile,Date of Birth\nSynthetic,Patient,0123456789,2000-01-02');
  fireEvent.click(await screen.findByRole('button',{name:'Import 1 Patients'}));
  await waitFor(()=>expect(post).toHaveBeenCalledWith('/patients',expect.objectContaining({dateOfBirth:'2000-01-02'})));
});
