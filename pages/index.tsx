import Head from "next/head";
import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { getAccount, getNetwork } from "@wagmi/core";
import { useContractWrite, usePrepareContractWrite } from "wagmi";
import { NFTStorage } from "nft.storage";
import styles from "@/styles/Home.module.css";

import DatePicker from "react-datepicker";

import zoraNFTCreatorABI from "../contracts/zoraNFTCreatorABI.json";

const client = new NFTStorage({
  token: process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN || "",
});

const zoraContractAddress =
  getNetwork().chain?.name == "Ethereum"
    ? "0xF74B146ce44CC162b601deC3BE331784DB111DC1"
    : "0xb9583d05ba9ba8f7f14ccee3da10d2bc0a72f519";

console.log("CONTRACT ADDRESS", zoraContractAddress);

const convertEthtoWei = (eth: number): string =>
  String(eth * 1000000000000000000);

export default function Home() {
  const [iframeSrc, setIframeSrc] = useState("");

  const [url, setUrl] = useState<string | null>(null);
  const [cid, setCID] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [imageURI, setImageURI] = useState("");

  const [price, setPrice] = useState("0.01");
  const [editionSize, setEditionSize] = useState<string | undefined>(undefined);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date("Sunday, July 21, 2554 11:34:33.709 PM")
  );

  const [royaltyPercentage, setroyaltyPercentage] = useState("5");
  const [maxSalePurchasePerAddress, setMaxSalePurchasePerAddress] =
    useState("Unlimited");

  const [recipientAddress, setRecipientAddress] = useState<string | null>(null);
  const adminAddress = getAccount().address || null;

  const { config, error } = usePrepareContractWrite({
    address: zoraContractAddress,
    abi: zoraNFTCreatorABI,
    functionName: "createEdition",
    enabled: true,
    args: [
      name,
      symbol,
      editionSize ? String(parseInt(editionSize)) : "18446744073709551615",
      String(parseInt(royaltyPercentage) * 100),
      recipientAddress || adminAddress,
      adminAddress,
      [
        convertEthtoWei(parseFloat(price)),
        "4294967295",
        Math.trunc(startDate.getTime() / 1000),
        Math.trunc(endDate.getTime() / 1000),
        0,
        0,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      ],
      description.replace(/\r\n|\r|\n/g, "\\n"),
      `ipfs://${cid}/`,
      imageURI,
    ],
    onSettled(data, error) {
      console.log("Settled", { data, error });
    },
  });

  const { data, isLoading, isSuccess, write } = useContractWrite(config);

  const create = async () => {
    try {
      const account = await getAccount();
      console.log("Connected to account", account.address);

      if (write !== undefined) {
        // Pass the function inputs as an object to the write function
        const tx = await write();
        console.log(tx);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const createHTML = async () => {
    setUploading(true);

    console.log("Creating HTML");

    const res = await fetch(`/api/createHTML`, {
      method: "POST",
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    console.log("HTML created", data);
    const { cid } = data;

    console.log("Uploading to IPFS", cid);

    if (cid !== null) {
      setCID(cid);
      setUrl(null);
      setIframeSrc(`https://ipfs.io/ipfs/${cid}`);
    }

    setUploading(false);
  };

  const fileUpload = async (e: any) => {
    const file = e.target.files[0];
    try {
      const cid = await client.storeBlob(file);
      const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
      setImageURI(ipfsUrl);
      console.log("IPFS URI: ", ipfsUrl);
    } catch (error) {
      console.log("Error uploading file: ", error);
    }
  };

  const uploadButtonDisabled =
    !cid ||
    !adminAddress ||
    isSuccess ||
    isLoading ||
    !name ||
    !symbol ||
    !description;

  return (
    <>
      <Head>
        <title>SUBSTACK CONTRACT DEPLOYER</title>
        <meta name="description" content="Substack Contract Deployer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div
        style={{ display: "flex", justifyContent: "end", margin: "20px 30px" }}
      >
        <ConnectButton />
      </div>
      <main className={styles.main}>
        <div className={styles.articlePreview}>
          <h1>NFT Preview </h1>
          <iframe
            title="Preview"
            src={iframeSrc}
            width="100%"
            height="500px"
            style={{
              border: "1px solid #fcfcfc",
              marginBottom: "10px",
              borderRadius: "5px",
            }}
          ></iframe>
          <span className={styles.ipfsAddress}>{iframeSrc || ""}</span>
          &nbsp;
          <h2>Cover Image</h2>
          <div
            style={{
              border: "1px solid #fcfcfc",
              borderRadius: "10px",
              marginBottom: "10px",
              width: "250px",
              height: "250px",
            }}
          >
            {imageURI && <img src={imageURI} width="250px" />}
          </div>
          <span className={styles.ipfsAddress}>{imageURI || ""}</span>
        </div>
        <div className={styles.formContainer}>
          <label>Article URL</label>
          <div className={styles.inlineContainer}>
            <input
              className={styles.inlineInput}
              type="text"
              placeholder="https://you.substack.com/p/article-title"
              onChange={(event) => setUrl(event.target.value)}
            />
            <button
              className={styles.inlineButton}
              onClick={createHTML}
              disabled={!url || uploading}
            >
              {uploading ? "UPLOADING..." : cid ? "UPLOADED" : "UPLOAD TO IPFS"}
            </button>
          </div>
          <label>
            Token Name
            <input
              className={styles.input}
              type="text"
              placeholder="This Article NFT"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Token Symbol
            <input
              className={styles.input}
              type="text"
              placeholder="SYMBL"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </label>
          <label>
            Token Description
            <textarea
              placeholder="This is a description of the NFT."
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label style={{ padding: "5px 0" }}>Cover Image</label>
          <p>
            <input type="file" onChange={fileUpload} />
          </p>
          &nbsp;
          <label>
            Edition Mint Price
            <input
              className={styles.input}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <label>
            Edition Size
            <input
              className={styles.input}
              type="string"
              title="Edition Size"
              placeholder="Unlimited"
              value={editionSize}
              onChange={(e) => setEditionSize(e.target.value)}
            />
          </label>
          <label>Royalty Percentage</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Royalty BPS"
            value={royaltyPercentage}
            onChange={(e) => setroyaltyPercentage(e.target.value)}
          />
          <label>Payout Address</label>
          <input
            className={styles.input}
            type="text"
            placeholder={adminAddress || "0x00"}
            value={recipientAddress || adminAddress || ""}
            onChange={(e) => setRecipientAddress(e.target.value)}
          />
          <div className={styles.input}>
            <label>Start Date</label>
            <DatePicker
              value={startDate.toDateString()}
              selected={startDate}
              showTimeSelect
              onChange={(date) => {
                if (date) setStartDate(date);
              }}
            />
          </div>
          <div className={styles.input}>
            <label>End Date </label>
            <br />
            <label>Forever - </label>
            <input
              title="Forever"
              type="checkbox"
              checked={endDate.getTime() == 18446758473709}
              onChange={(e) => {
                if (e.target.checked) {
                  setEndDate(new Date(18446758473709));
                } else {
                  setEndDate(new Date());
                }
              }}
            />
            <DatePicker
              value={
                endDate.getTime() == 18446758473709
                  ? "Forever"
                  : endDate.toDateString()
              }
              selected={endDate}
              showTimeSelect
              onSelect={(date) => {
                if (date) setEndDate(date);
              }}
              // onInputClick={(e) => {
              //   setEndDate(new Date(18446758473709));
              // }}
              onChange={(date) => {
                if (date) setEndDate(date);
              }}
            />
          </div>
          {/* <label>
            Mint limit per address
            <input
              className={styles.input}
              type="text"
              placeholder="Mint Limit Per Address"
              value={maxSalePurchasePerAddress}
              onChange={(e) => setMaxSalePurchasePerAddress(e.target.value)}
            />
          </label> */}
          {/* <input
            className={styles.input}
            type="text"
            placeholder="Image URI"
            value={imageURI}
            onChange={(e) => setImageURI(e.target.value)}
          /> */}
          {/* <input
            className={styles.input}
            type="number"
            placeholder="Initial Reserve"
            value={initialReserve}
            onChange={(e) => setInitialReserve(e.target.value)}
          /> */}
          {/* {!cid && <button
            className={styles.button}
            onClick={createHTML}
            disabled={!url || uploading}
          >
            UPLOAD TO IPFS
          </button>} */}
          {/* <div> */}
          <button
            className={styles.button}
            onClick={create}
            disabled={uploadButtonDisabled}
          >
            {isLoading ? "Loading..." : `DEPLOY${isSuccess ? "ED" : ""}`}
          </button>
          {/* </div> */}
        </div>
        {/* <div>
          {isLoading && <h4>Loading...</h4>}
          {isSuccess && <h4>Success!</h4>}
          {data && <h4>{JSON.stringify(data)}</h4>}
        </div> */}
      </main>
    </>
  );
}
