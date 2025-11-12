import { useState } from 'react';
import algosdk from 'algosdk';
import { useWallet } from '../hooks/useWallet';
import { ALGORAND_CONFIG } from '../config/algorand';

export default function PaymentSplitter() {
  const { walletAddress, algodClient, signTransaction, updateBalance } = useWallet();
  
  const [appId, setAppId] = useState('');
  const [recipient1, setRecipient1] = useState('');
  const [percentage1, setPercentage1] = useState(60);
  const [recipient2, setRecipient2] = useState('');
  const [percentage2, setPercentage2] = useState(40);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [appStats, setAppStats] = useState(null);

  const loadAppInfo = async () => {
    if (!appId) return;
    try {
      setLoading(true);
      const app = await algodClient.getApplicationByID(parseInt(appId)).do();
      const globalState = {};
      app.params['global-state'].forEach(item => {
        globalState[atob(item.key)] = item.value;
      });
      setAppStats({
        totalReceived: globalState.total_received?.uint || 0,
        numRecipients: globalState.num_recipients?.uint || 0,
      });
      setMessage({ type: 'success', text: 'App info loaded!' });
    } catch (error) {
      setMessage({ type: 'error', text: `Failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const setupSplit = async () => {
    if (!walletAddress || !appId || percentage1 + percentage2 !== 100) {
      setMessage({ type: 'error', text: 'Check inputs! Percentages must equal 100' });
      return;
    }
    try {
      setLoading(true);
      const params = await algodClient.getTransactionParams().do();
      const txn = algosdk.makeApplicationNoOpTxn(walletAddress, params, parseInt(appId), [
        new Uint8Array(Buffer.from('setup')),
        algosdk.decodeAddress(recipient1).publicKey,
        algosdk.encodeUint64(percentage1),
        algosdk.decodeAddress(recipient2).publicKey,
        algosdk.encodeUint64(percentage2),
      ]);
      const txId = await signTransaction([txn]);
      setMessage({ type: 'success', text: `Setup complete! TX: ${txId}` });
    } catch (error) {
      setMessage({ type: 'error', text: `Failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const sendPayment = async () => {
    if (!walletAddress || !appId || !paymentAmount) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }
    
    const appAddress = algosdk.getApplicationAddress(parseInt(appId));
    
    try {
      setLoading(true);
      const params = await algodClient.getTransactionParams().do();
      const amount = Math.floor(parseFloat(paymentAmount) * 1000000);

      const payment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: walletAddress,
        to: appAddress,
        amount,
        suggestedParams: params
      });

      const appCall = algosdk.makeApplicationNoOpTxnFromObject({
        from: walletAddress,
        appIndex: parseInt(appId),
        appArgs: [new Uint8Array(Buffer.from('split'))],
        suggestedParams: params
      });

      algosdk.assignGroupID([payment, appCall]);
      const txId = await signTransaction([payment, appCall]);
      
      setMessage({
        type: 'success',
        text: (
          <div>
            Payment split successfully!
            <a
              href={`${ALGORAND_CONFIG.EXPLORER_URL}/tx/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              View on AlgoExplorer →
            </a>
          </div>
        )
      });
      
      await updateBalance(walletAddress);
      setPaymentAmount('');
    } catch (error) {
      setMessage({ type: 'error', text: `Failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="card">
        <h2>⚙️ App Configuration</h2>
        <div className="form-group">
          <label>App ID</label>
          <input
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder="Enter deployed app ID"
          />
          <button className="btn" onClick={loadAppInfo} disabled={!appId || loading}>
            Load App Info
          </button>
        </div>

        {appStats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Processed</div>
              <div className="stat-value">{(appStats.totalReceived / 1000000).toFixed(2)} ALGO</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Recipients</div>
              <div className="stat-value">{appStats.numRecipients}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>🎯 Setup Split Configuration</h2>
        <div className="form-group">
          <label>Recipient 1 Address</label>
          <input
            value={recipient1}
            onChange={(e) => setRecipient1(e.target.value)}
            placeholder="Algorand address"
          />
        </div>
        <div className="form-group">
          <label>Recipient 1 Percentage</label>
          <input
            type="number"
            value={percentage1}
            onChange={(e) => setPercentage1(parseInt(e.target.value))}
            min="0"
            max="100"
          />
        </div>
        <div className="form-group">
          <label>Recipient 2 Address</label>
          <input
            value={recipient2}
            onChange={(e) => setRecipient2(e.target.value)}
            placeholder="Algorand address"
          />
        </div>
        <div className="form-group">
          <label>Recipient 2 Percentage</label>
          <input
            type="number"
            value={percentage2}
            onChange={(e) => setPercentage2(parseInt(e.target.value))}
            min="0"
            max="100"
          />
        </div>
        <button className="btn" onClick={setupSplit} disabled={loading || !appId}>
          {loading ? 'Processing...' : 'Setup Split'}
        </button>
      </div>

      <div className="card">
        <h2>💸 Send Payment</h2>
        <div className="form-group">
          <label>Amount (ALGO)</label>
          <input
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="Amount to split"
            step="0.1"
            min="0"
          />
        </div>
        <button className="btn" onClick={sendPayment} disabled={loading || !appId || !paymentAmount}>
          {loading ? 'Processing...' : 'Split Payment'}
        </button>

        {recipient1 && recipient2 && paymentAmount && (
          <div style={{ marginTop: '20px' }}>
            <h3>Payment Preview:</h3>
            <div className="recipient-card">
              <h4>Recipient 1</h4>
              <div className="recipient-address">{recipient1}</div>
              <div className="percentage">
                {(parseFloat(paymentAmount) * percentage1 / 100).toFixed(2)} ALGO ({percentage1}%)
              </div>
            </div>
            <div className="recipient-card">
              <h4>Recipient 2</h4>
              <div className="recipient-address">{recipient2}</div>
              <div className="percentage">
                {(parseFloat(paymentAmount) * percentage2 / 100).toFixed(2)} ALGO ({percentage2}%)
              </div>
            </div>
          </div>
        )}
      </div>

      {message.text && (
        <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
          {message.text}
        </div>
      )}
    </>
  );
}