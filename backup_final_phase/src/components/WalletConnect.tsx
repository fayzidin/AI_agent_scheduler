import React from 'react';
import { useWallet } from '@txnlab/use-wallet-ui-react';
import { useWalletContext } from '../contexts/WalletContext';
import { Wallet, LogOut, RefreshCw, Globe } from 'lucide-react';

const WalletConnect: React.FC = () => {
  const { providers, activeAccount, isActive } = useWallet();
  const { address, balance, network, setNetwork, refreshBalance } = useWalletContext();

  const handleNetworkChange = (newNetwork: 'testnet' | 'mainnet') => {
    setNetwork(newNetwork);
    // Refresh balance after network change
    setTimeout(() => refreshBalance(), 1000);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: number | null) => {
    if (bal === null) return 'Loading...';
    return `${bal.toFixed(6)} ALGO`;
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Wallet className="w-6 h-6 text-blue-400 mr-3" />
          <h2 className="text-2xl font-semibold text-white">Wallet</h2>
        </div>
        
        {/* Network Selector */}
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-slate-300" />
          <select
            value={network}
            onChange={(e) => handleNetworkChange(e.target.value as 'testnet' | 'mainnet')}
            className="bg-white/10 text-white text-sm rounded-lg px-3 py-1 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="testnet" className="bg-slate-800">TestNet</option>
            <option value="mainnet" className="bg-slate-800">MainNet</option>
          </select>
        </div>
      </div>

      {!isActive ? (
        <div className="space-y-4">
          <p className="text-slate-300 mb-4">Connect your wallet to get started</p>
          <div className="grid gap-3">
            {providers?.map((provider) => (
              <button
                key={provider.metadata.id}
                onClick={provider.connect}
                className="flex items-center justify-center space-x-3 w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <span>Connect {provider.metadata.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Address</span>
              <button
                onClick={refreshBalance}
                className="p-1 text-slate-300 hover:text-white transition-colors"
                title="Refresh Balance"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-white font-mono text-sm break-all">
              {address ? formatAddress(address) : 'Not connected'}
            </p>
          </div>

          <div className="bg-white/10 rounded-lg p-4">
            <span className="text-sm text-slate-300 block mb-2">Balance</span>
            <p className="text-white font-semibold text-lg">
              {formatBalance(balance)}
            </p>
          </div>

          <div className="bg-white/10 rounded-lg p-4">
            <span className="text-sm text-slate-300 block mb-2">Network</span>
            <p className="text-white font-semibold capitalize">
              {network}
            </p>
          </div>

          <div className="flex space-x-2">
            {providers?.map((provider) => (
              provider.isActive && (
                <button
                  key={provider.metadata.id}
                  onClick={provider.disconnect}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all duration-200 border border-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Disconnect</span>
                </button>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;