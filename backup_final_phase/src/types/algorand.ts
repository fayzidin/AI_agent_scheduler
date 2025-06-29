export interface AlgorandConfig {
  algodToken: string;
  algodServer: string;
  algodPort: number;
  indexerToken: string;
  indexerServer: string;
  indexerPort: number;
  network: 'testnet' | 'mainnet';
}

export interface TransactionResult {
  txId: string;
  confirmedRound?: number;
}

export interface SendAlgoForm {
  recipient: string;
  amount: number;
  note?: string;
}