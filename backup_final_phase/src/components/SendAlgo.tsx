import React, { useState } from 'react';
import { useWallet } from '@txnlab/use-wallet-ui-react';
import { useWalletContext } from '../contexts/WalletContext';
import { getAlgorandConfig } from '../config/algorand';
import { Send, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { SendAlgoForm, TransactionResult } from '../types/algorand';

const SendAlgo: React.FC = () => {
  const { signTransactions, sendTransactions } = useWallet();
  const { isConnected, address, network, refreshBalance } = useWalletContext();
  const [form, setForm] = useState<SendAlgoForm>({
    recipient: '',
    amount: 0,
    note: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleInputChange = (field: keyof SendAlgoForm, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
    setResult(null);
  };

  const validateForm = (): boolean => {
    if (!form.recipient.trim()) {
      setError('Recipient address is required');
      return false;
    }
    
    if (form.recipient.length !== 58) {
      setError('Invalid Algorand address format');
      return false;
    }
    
    if (form.amount <= 0) {
      setError('Amount must be greater than 0');
      return false;
    }
    
    if (form.amount < 0.001) {
      setError('Minimum amount is 0.001 ALGO');
      return false;
    }

    return true;
  };

  const handleSendAlgo = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const config = getAlgorandConfig();
      
      // Get suggested transaction parameters
      const suggestedParamsResponse = await fetch(
        `${config.algodServer}/v2/transactions/params`,
        {
          headers: config.algodToken ? { 'X-Algo-API-Token': config.algodToken } : {},
        }
      );

      if (!suggestedParamsResponse.ok) {
        throw new Error('Failed to get transaction parameters');
      }

      const suggestedParams = await suggestedParamsResponse.json();

      // Create transaction
      const txn = {
        type: 'pay',
        from: address,
        to: form.recipient,
        amount: Math.round(form.amount * 1000000), // Convert ALGO to microAlgos
        note: form.note ? new TextEncoder().encode(form.note) : undefined,
        fee: suggestedParams['min-fee'],
        firstRound: suggestedParams['last-round'],
        lastRound: suggestedParams['last-round'] + 1000,
        genesisHash: suggestedParams['genesis-hash'],
        genesisID: suggestedParams['genesis-id'],
      };

      // Sign transaction
      const signedTxns = await signTransactions([txn]);
      
      // Send transaction
      const { txId } = await sendTransactions(signedTxns);

      // Wait for confirmation
      let confirmedRound: number | undefined;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(
          `${config.algodServer}/v2/transactions/pending/${txId}`,
          {
            headers: config.algodToken ? { 'X-Algo-API-Token': config.algodToken } : {},
          }
        );

        if (statusResponse.ok) {
          const status = await statusResponse.json();
          if (status['confirmed-round']) {
            confirmedRound = status['confirmed-round'];
            break;
          }
        }
      }

      setResult({ txId, confirmedRound });
      
      // Reset form
      setForm({ recipient: '', amount: 0, note: '' });
      
      // Refresh balance
      setTimeout(() => refreshBalance(), 2000);

    } catch (err: any) {
      console.error('Transaction failed:', err);
      setError(err.message || 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getExplorerUrl = (txId: string) => {
    const baseUrl = network === 'testnet' 
      ? 'https://testnet.algoexplorer.io/tx' 
      : 'https://algoexplorer.io/tx';
    return `${baseUrl}/${txId}`;
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20">
      <div className="flex items-center mb-6">
        <Send className="w-6 h-6 text-green-400 mr-3" />
        <h2 className="text-2xl font-semibold text-white">Send ALGO</h2>
      </div>

      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-slate-300 mb-4">Please connect your wallet to send transactions</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Network Display */}
          <div className="bg-white/5 rounded-lg p-3">
            <span className="text-sm text-slate-300">Network: </span>
            <span className="text-white font-semibold capitalize">{network}</span>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={form.recipient}
                onChange={(e) => handleInputChange('recipient', e.target.value)}
                placeholder="Enter Algorand address..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Amount (ALGO)
              </label>
              <input
                type="number"
                value={form.amount || ''}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                placeholder="0.000000"
                step="0.000001"
                min="0.001"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Note (Optional)
              </label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => handleInputChange('note', e.target.value)}
                placeholder="Transaction note..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Success Display */}
          {result && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center mb-3">
                <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                <p className="text-green-300 font-semibold">Transaction Successful!</p>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-300">Transaction ID:</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-white font-mono text-sm break-all bg-white/10 px-3 py-2 rounded-lg flex-1">
                      {result.txId}
                    </p>
                    <a
                      href={getExplorerUrl(result.txId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200"
                      title="View on Explorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                
                {result.confirmedRound && (
                  <div>
                    <span className="text-sm text-slate-300">Confirmed in round:</span>
                    <p className="text-white font-semibold">{result.confirmedRound}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSendAlgo}
            disabled={isLoading || !form.recipient || !form.amount}
            className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span>{isLoading ? 'Sending...' : 'Send Transaction'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SendAlgo;