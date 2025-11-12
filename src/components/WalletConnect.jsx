import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';

export default function WalletConnect() {
  const {
    walletAddress,
    balance,
    walletType,
    connectPeraWallet,
    connectAlgoSigner,
    disconnectWallet,
    updateBalance
  } = useWallet();

  const [message, setMessage] = useState({ type: '', text: '' });

  const handlePeraConnect = async () => {
    try {
      await connectPeraWallet();
      setMessage({ type: 'success', text: 'Pera Wallet connected!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleAlgoSignerConnect = async () => {
    try {
      await connectAlgoSigner();
      setMessage({ type: 'success', text: 'AlgoSigner connected!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="card">
      {!walletAddress ? (
        <div className="wallet-section">
          <h2>Connect Your Wallet</h2>
          <p style={{ margin: '15px 0', color: '#666' }}>
            Choose your preferred wallet to get started
          </p>
          <div className="wallet-options">
            <button className="btn btn-pera" onClick={handlePeraConnect}>
              🟡 Pera Wallet
            </button>
            <button className="btn btn-algosigner" onClick={handleAlgoSignerConnect}>
              🔷 AlgoSigner
            </button>
          </div>
        </div>
      ) : (
        <div className="wallet-info">
          <h3>✅ Connected ({walletType})</h3>
          <div className="wallet-address">{walletAddress}</div>
          <div className="balance">{balance} ALGO</div>
          <button className="btn btn-secondary" onClick={() => updateBalance(walletAddress)}>
            🔄 Refresh
          </button>
          <button className="btn btn-secondary" onClick={disconnectWallet}>
            🔌 Disconnect
          </button>
        </div>
      )}

      {message.text && (
        <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
          {message.text}
        </div>
      )}
    </div>
  );
}