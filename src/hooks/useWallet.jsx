import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import algosdk from 'algosdk';
import { ALGORAND_CONFIG } from '../config/algorand';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};

export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState(0);
  const [walletType, setWalletType] = useState(null);
  const [peraWallet, setPeraWallet] = useState(null);
  const [loading, setLoading] = useState(false);

  const algodClient = useMemo(() => new algosdk.Algodv2(
    ALGORAND_CONFIG.ALGOD_TOKEN,
    ALGORAND_CONFIG.ALGOD_SERVER,
    ALGORAND_CONFIG.ALGOD_PORT
  ), []);

  const updateBalance = useCallback(async (address) => {
    try {
      const info = await algodClient.accountInformation(address).do();
      setBalance((info.amount / 1000000).toFixed(2));
    } catch (error) {
      console.error('Balance fetch error:', error);
    }
  }, [algodClient]);

  useEffect(() => {
    const initPera = async () => {
      try {
        const pera = new PeraWalletConnect();
        setPeraWallet(pera);

        const accounts = await pera.reconnectSession();
        if (accounts && accounts.length) {
          setWalletAddress(accounts[0]);
          setWalletType('pera');
          await updateBalance(accounts[0]);
        }
      } catch (e) {
        console.log('No previous Pera session');
      }
    };
    initPera();
  }, [updateBalance]);

  const connectPeraWallet = async () => {
    try {
      setLoading(true);
      if (!peraWallet) {
        const pera = new PeraWalletConnect();
        setPeraWallet(pera);
        const accounts = await pera.connect();
        setWalletAddress(accounts[0]);
        setWalletType('pera');
        await updateBalance(accounts[0]);
      } else {
        const accounts = await peraWallet.connect();
        setWalletAddress(accounts[0]);
        setWalletType('pera');
        await updateBalance(accounts[0]);
      }
    } catch (error) {
      console.error('Pera connection error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const connectAlgoSigner = async () => {
    try {
      setLoading(true);
      if (typeof AlgoSigner === 'undefined') {
        throw new Error('AlgoSigner not installed');
      }
      await AlgoSigner.connect();
      const accounts = await AlgoSigner.accounts({ ledger: ALGORAND_CONFIG.NETWORK });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0].address);
        setWalletType('algosigner');
        await updateBalance(accounts[0].address);
      }
    } catch (error) {
      console.error('AlgoSigner connection error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    if (walletType === 'pera' && peraWallet) {
      peraWallet.disconnect();
    }
    setWalletAddress('');
    setWalletType(null);
    setBalance(0);
  };

  const signTransaction = async (txns) => {
    if (walletType === 'pera') {
      const signedTxns = await peraWallet.signTransaction([
        txns.map(txn => ({ txn }))
      ]);
      const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
      return txId;
    } else if (walletType === 'algosigner') {
      const txnsB64 = txns.map(txn => ({
        txn: AlgoSigner.encoding.msgpackToBase64(txn.toByte())
      }));
      const signedTxns = await AlgoSigner.signTxn(txnsB64);
      const sent = await AlgoSigner.send({
        ledger: ALGORAND_CONFIG.NETWORK,
        tx: signedTxns.map(s => s.blob).join(',')
      });
      return sent.txId;
    }
  };

  const value = {
    walletAddress,
    balance,
    walletType,
    loading,
    algodClient,
    connectPeraWallet,
    connectAlgoSigner,
    disconnectWallet,
    signTransaction,
    updateBalance
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};