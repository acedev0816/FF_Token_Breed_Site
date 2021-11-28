import { AnchorHTMLAttributes, useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import {
  Avatar,
  Button,
  CircularProgress,
  Container,
  Grid,
  MenuItem,
  Select,
  Snackbar,
  Typography,
} from "@material-ui/core";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import Alert from "@material-ui/lab/Alert";
import * as anchor from "@project-serum/anchor";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import "./index.css";
import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
} from "../../candy-machine";
import axios from "axios";
const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here
const MintButton = styled(Button)``; // add your styles here
//load from env
const TOKEN_SYMBOL = process.env.REACT_APP_TOKEN_SYMBOL!;
const BONE_TOKEN = process.env.REACT_APP_BONE_TOKEN!;

//home component
export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
  devnet: boolean;
}
const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [boneBalance, setBoneBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });
  const [startDate, setStartDate] = useState(new Date(props.startDate));
  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  //acer
  const [candyMachineValid, setCandyMachineValid] = useState<boolean>(true);
  const [fancyfrenchies, setFancyFrenchies] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const [curFrenchy, setCurFrenchy] = useState<number>(-1);
  const [curBone, setCurBone] = useState<number>(-1);
  const [mutant, setMutant] = useState<any>(null); //metadata of breed nft

  const refreshTokenItems = async () => {
    console.log("refreshTokenItems start");
    if (!wallet) return;

    let url_prefix = "https://api.solscan.io";
    if (props.devnet) url_prefix = "https://api-devnet.solscan.io";
    let url = `${url_prefix}/account/tokens?address=${wallet.publicKey.toString()}`;
    console.log("refreshTokenItems", url);
    let resp = await axios.get(url);

    if (!resp.data.succcess) {
      return;
    }
    let token_list = resp.data.data;
    token_list = token_list.filter(
      (data: { tokenAmount: { uiAmount: number } }) =>
        data.tokenAmount.uiAmount !== 0
    );
    let f_array = [];
    //get token information
    for (const item of token_list) {
      const { tokenAddress, tokenAccount } = item;
      const metadata = await getMetaData(tokenAddress);
      if (metadata) {
        const symbol = metadata.symbol;
        if (symbol === TOKEN_SYMBOL) {
          f_array.push({
            tokenAddress,
            tokenAccount,
            name: metadata.name,
            image: metadata.image,
          });
        }
      }
    }
    //update state
    console.log("refreshTokenItems", f_array);
    setFancyFrenchies(f_array);
    setCurFrenchy(-1);
    setLoading(false);
  };

  //get metadata for one token
  const getMetaData = async (
    token: anchor.web3.PublicKey,
    filter: boolean = true
  ) => {
    let url_prefix = "https://api.solscan.io";
    if (props.devnet) url_prefix = "https://api-devnet.solscan.io";

    let token_url = `${url_prefix}/account?address=${token.toString()}`;
    let resp = await axios.get(token_url);
    if (!resp.data.succcess) return null;
    try {
      const symbol = resp.data.data.metadata.data.symbol;
      if (!filter || symbol === TOKEN_SYMBOL) {
        const uri = resp.data.data.metadata.data.uri;
        resp = await axios.get(uri);
        return resp.data;
      }
    } catch (error) {
      return null;
    }
  };

  const handleFFChange = (event: any) => {
    setCurFrenchy(event.target.value);
    setMutant(null);
  };
  const handleBoneChange = (event: any) => {
    setCurBone(event.target.value);
    setMutant(null);
  };
  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet || !props.connection) return;

      try {
        const {
          candyMachine,
          goLiveDate,
          itemsAvailable,
          itemsRemaining,
          itemsRedeemed,
        } = await getCandyMachineState(
          wallet as anchor.Wallet,
          props.candyMachineId,
          props.connection
        );

        setItemsAvailable(itemsAvailable);
        setItemsRemaining(itemsRemaining);
        setItemsRedeemed(itemsRedeemed);

        setIsSoldOut(itemsRemaining === 0);
        setStartDate(goLiveDate);
        setCandyMachine(candyMachine);

        setCandyMachineValid(true);
      } catch (error) {
        setCandyMachineValid(false);
      }
    })();
  };

  const onMint = async () => {
    const mint = anchor.web3.Keypair.generate();
    try {
      setIsMinting(true);
      let puppyToken = new anchor.web3.PublicKey(BONE_TOKEN);

      if (wallet && candyMachine?.program) {
        console.log("before mint one token");
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury,
          puppyToken,
          mint
        );
        console.log("after mint one token");

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          //update mutant image
          const meta = await getMetaData(mint.publicKey, false);
          console.log("mutant", meta);
          setMutant(meta);
          setAlertState({
            open: true,
            message: "Congratulations! Breed succeeded!",
            severity: "success",
          });
          //refresh token
        } else {
          setAlertState({
            open: true,
            message: "Breed failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Breed failed! Please try again!";
      console.log("error", error);
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to breed. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Breed period hasn't started yet.`;
        }
      }
      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setIsMinting(false);
      refreshCandyMachineState();
      refreshPuppyBalance();
    }
  };
  const refreshPuppyBalance = async () => {
    if (wallet) {
      try {
        setLoadingBalance(true);
        let tokenMint = new anchor.web3.PublicKey(BONE_TOKEN);
        let tokenAccount: anchor.web3.PublicKey = (
          await anchor.web3.PublicKey.findProgramAddress(
            [
              wallet.publicKey.toBuffer(),
              TOKEN_PROGRAM_ID.toBuffer(),
              tokenMint.toBuffer(),
            ],
            SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
          )
        )[0];
        let balance = await props.connection.getTokenAccountBalance(
          tokenAccount
        );
        console.log("puppy balance", balance);
        let amount: number = balance.value.uiAmount!;
        amount = Math.ceil(amount);
        setBoneBalance(amount);
      } catch (e) {
        setBoneBalance(0);
      }
      setLoadingBalance(false);
    }
  };
  useEffect(() => {
    (async () => {
      if (wallet) {
        //set loading state
        setLoading(true);
        //get balance
        //const balance = await props.connection.getBalance(wallet.publicKey);
        //setBalance(balance / LAMPORTS_PER_SOL);
        //init values
        setCurFrenchy(-1);
        //get token list
        refreshTokenItems();
        //refresh puppy token balance
        refreshPuppyBalance();
      }
    })();
  }, [wallet, props.connection, props.devnet]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
    props.devnet,
  ]);

  return (
    <main>
      {/* {wallet && (
        <p>Wallet {shortenAddress(wallet.publicKey.toBase58() || "")}</p>
      )}
      {wallet && <p>Total Available: {itemsAvailable}</p>}
      {wallet && <p>Redeemed: {itemsRedeemed}</p>}
      {wallet && <p>Remaining: {itemsRemaining}</p>} */}
      <Container>
        <Grid container spacing={1}>
          <Grid item md={12} className="logo-container">
            <img alt="ff back" src="img/logo.png" className="logo" />
          </Grid>
          <Grid item md={12}>
            {!candyMachineValid && (
              <Typography variant="h4" className="candy-machine-error red">
                CANDY MACHINE IS NOT VALID
              </Typography>
            )}
          </Grid>
          <Grid container item md={12} spacing={3}>
            <Grid item md={4} xs={12} className="row">
              <Typography variant="h5" className="subtitle">
                Fancy Frenchies{" "}
                {wallet && !loading && `(${fancyfrenchies.length})`}
              </Typography>
              <div className="card">
                <img
                  alt="ff back"
                  src="img/ff_back.png"
                  className="card-back"
                />
                <img
                  alt="Fancy Frenchy"
                  src={
                    curFrenchy === -1
                      ? "img/ff.png"
                      : fancyfrenchies[curFrenchy].image
                  }
                  className="card-image"
                />
                <Typography variant="h6" className="connect-wallet black">
                  {wallet
                    ? "Select a Fancy Frenchies"
                    : "Connect wallet and select"}
                </Typography>
                {loading ? (
                  <CircularProgress />
                ) : (
                  wallet && (
                    <Select
                      label="Age"
                      className="item-select"
                      onChange={handleFFChange}
                      value={curFrenchy}
                    >
                      <MenuItem value={-1}> Not selected</MenuItem>
                      {fancyfrenchies.map((item, index) => (
                        <MenuItem
                          value={index}
                          key={index}
                          className="menu-item"
                        >
                          <Avatar src={item.image} />
                          {item.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )
                )}
              </div>
            </Grid>
            <Grid item md={4} xs={12} className="row">
              <Typography variant="h5" className="subtitle">
                Breeding Chamber
              </Typography>
              <div className="card">
                <img
                  alt="mutant back"
                  src="img/mutant_back.png"
                  className="card-back"
                />
                <img
                  alt="Mutant"
                  src={!mutant ? "img/mutant.png" : mutant.image}
                  className="card-image"
                />
                {/* {mutant && <Typography variant="h6">{mutant.name}</Typography>} */}
                <MintButton
                  disabled={
                    isSoldOut ||
                    isMinting ||
                    !isActive ||
                    curFrenchy === -1 ||
                    curBone === -1 ||
                    !candyMachineValid
                  }
                  onClick={onMint}
                  className="mint-button"
                >
                  {isSoldOut ? (
                    "Breed Period Finished"
                  ) : isActive ? (
                    isMinting ? (
                      <CircularProgress />
                    ) : (
                      "Mint Baby"
                    )
                  ) : (
                    <Countdown
                      date={startDate}
                      onMount={({ completed }) =>
                        completed && setIsActive(true)
                      }
                      onComplete={() => setIsActive(true)}
                      renderer={renderCounter}
                    />
                  )}
                </MintButton>
              </div>
            </Grid>
            <Grid item md={4} xs={12} className="row">
              <Typography variant="h5" className="subtitle">
                Bones{" "}
                {boneBalance !== undefined && !loadingBalance
                  ? `(${boneBalance})`
                  : ""}
              </Typography>
              <div className="card">
                <img
                  alt="bone back"
                  src="img/bone_back.png"
                  className="card-back"
                />
                <img
                  alt="bone"
                  src={curBone === -1 ? "img/bone_ano.png" : "img/bone.png"}
                  className="card-image"
                />
                <Typography variant="h6" className="connect-wallet black">
                  {wallet ? "Select a bone" : "Connect wallet and select"}
                </Typography>
                {loadingBalance ? (
                  <CircularProgress />
                ) : (
                  wallet && (
                    <Select
                      label="Age"
                      className="item-select"
                      onChange={handleBoneChange}
                      value={curBone}
                    >
                      <MenuItem value={-1}> Not selected</MenuItem>
                      {new Array(boneBalance!).fill("4").map((item, index) => (
                        <MenuItem
                          value={index}
                          key={index}
                          className="menu-item"
                        >
                          <Avatar src="img/bone.png" />
                          Bone
                        </MenuItem>
                      ))}
                    </Select>
                  )
                )}
              </div>
            </Grid>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
