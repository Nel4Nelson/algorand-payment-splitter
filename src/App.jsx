import { WalletProvider, useWallet } from './hooks/useWallet';
import WalletConnect from './components/WalletConnect';
import PaymentSplitter from './components/PaymentSplitter';
import './App.css';

function AppContent() {
  const { walletAddress } = useWallet();

  return (
    <div className="container">
      <div className="header">
        <h1>💰 Algorand Payment Splitter</h1>
        <p>Multi-wallet support: Pera & AlgoSigner</p>
      </div>

      <WalletConnect />

      {walletAddress && <PaymentSplitter />}

      <div className="card" style={{ textAlign: 'center', background: 'rgba(255,255,255,0.95)' }}>
        <p style={{ color: '#666', marginBottom: '10px' }}>
          📚 <strong>Note:</strong> Deploy the smart contract using <code>deploy.py</code> first
        </p>
        <p style={{ color: '#999', fontSize: '0.9rem' }}>
          Get testnet ALGO at{' '}
          <a href="https://bank.testnet.algorand.network/" target="_blank" rel="noopener noreferrer">
            Algorand Testnet Dispenser
          </a>
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;