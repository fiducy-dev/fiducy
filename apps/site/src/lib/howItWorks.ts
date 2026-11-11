import type { FlowColumn } from '@/types';

export const FLOW_STEP_MS = 1500;

export const FLOW_COLUMNS: FlowColumn[] = [
  {
    status: 'in the key box, on its way to the enclave',
    cards: [{ label: 'Your user', text: 'Pastes sk-proj-a81f… into the key box.' }]
  },
  {
    status: 'in enclave memory, nowhere else',
    cards: [{ label: 'Fiducy enclave', text: 'Encrypts the key and splits it into two halves.' }]
  },
  {
    status: 'nowhere. Only two sealed halves exist.',
    cards: [
      { label: 'Your database', text: 'Keeps kh_9f2c…, half a key. It opens nothing.' },
      { label: 'Key store', text: 'Keeps the other half, sealed to the enclave.' }
    ]
  },
  {
    status: 'in enclave memory, for one request',
    cards: [
      {
        label: 'Each AI call',
        text: 'The halves meet in the enclave, call OpenAI, then get wiped.'
      }
    ]
  },
  {
    status: 'nowhere. There is nothing to steal.',
    cards: [
      {
        label: 'App breach',
        text: 'Attackers get handles that open nothing.',
        isVerdict: true
      },
      {
        label: 'Fiducy breach',
        text: 'Sealed halves only the enclave can open.'
      }
    ]
  }
];
