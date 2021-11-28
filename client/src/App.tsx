import "./App.css";
import { useEffect, useMemo, useState } from "react";

import Home from "./components/home";
import Header from "./components/header";

import * as anchor from "@project-serum/anchor";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  getPhantomWallet,
  getSlopeWallet,
  getSolflareWallet,
  getSolletWallet,
  getSolletExtensionWallet,
} from "@solana/wallet-adapter-wallets";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";

import { WalletDialogProvider } from "@solana/wallet-adapter-material-ui";
import {
  Avatar,
  createTheme,
  ThemeProvider,
  Typography,
  Toolbar,
} from "@material-ui/core";
import { AppBar, Box, Button } from "@material-ui/core";
const treasury = new anchor.web3.PublicKey(
  process.env.REACT_APP_TREASURY_ADDRESS!
);


const config = new anchor.web3.PublicKey(
  process.env.REACT_APP_CANDY_MACHINE_CONFIG!
);

const candyMachineId = new anchor.web3.PublicKey(
  process.env.REACT_APP_CANDY_MACHINE_ID!
);

const startDateSeed = parseInt(process.env.REACT_APP_CANDY_START_DATE!, 10);
const txTimeout = 30000; // milliseconds (confirm this works for your project)


const theme = createTheme({
  palette: {
    type: "dark",
  },
  overrides: {
    MuiButtonBase: {
      root: {
        justifyContent: "flex-start",
      },
    },
    MuiButton: {
      root: {
        textTransform: undefined,
        padding: "12px 16px",
      },
      startIcon: {
        marginRight: 8,
      },
      endIcon: {
        marginLeft: 8,
      },
    },
  },
});

const App = () => {
  const [endpoint,setEndpoint] = useState<string>("https://api.devnet.solana.com");
  const [connection, setConnection] = useState<anchor.web3.Connection >(new anchor.web3.Connection("https://explorer-api.devnet.solana.com"));
  const [network, setNetwork] = useState<WalletAdapterNetwork>(WalletAdapterNetwork.Mainnet);
  const [devnet, setDevNet] = useState<boolean>(false);
  const wallets = useMemo(
    () => [
      getPhantomWallet(),
      getSlopeWallet(),
      getSolflareWallet(),
      getSolletWallet({ network }),
      getSolletExtensionWallet({ network }),
    ],
    []
  );
  useEffect(() => {
    const network = devnet
      ? WalletAdapterNetwork.Devnet
      : WalletAdapterNetwork.Mainnet;
    const rpcHost = devnet
      ? "https://explorer-api.devnet.solana.com"
      : "https://explorer-api.mainnet-beta.solana.com";
    setConnection (new anchor.web3.Connection(rpcHost) );
    const endpoint = clusterApiUrl(network);
    setEndpoint (endpoint);
    console.log('endpoint', endpoint);

  }, [devnet]);

  return (
    <ThemeProvider theme={theme}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={true}>
          <WalletDialogProvider>
            <>
              <Header setDevNet={setDevNet} devnet={devnet} />
              <Home
                candyMachineId={candyMachineId}
                config={config}
                connection={connection}
                startDate={startDateSeed}
                treasury={treasury}
                txTimeout={txTimeout}
                devnet={devnet}
              />
            </>
          </WalletDialogProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  );
};

export default App;
