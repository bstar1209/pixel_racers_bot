import { Client, MessageEmbed } from 'discord.js'
import { programs } from '@metaplex/js'
import axios from 'axios'
// import fs from "fs";

import {
  COMMAND_PREFIX,
  PIXEL_RACERS_CARS_DISCORD_TOKEN,
  GUILD_ID,
  CHANNEL_ID,
  NETWORK,
  PIXEL_RACERS_CARS_ID,
} from './config/index.js'

import {
  Connection,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

// Create a new discord client instance
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"], partials: ["CHANNEL"] });
let guild = undefined;

const { metadata: { Metadata } } = programs;

let dangerColor = '#d93f71';
let infoColor = '#0099ff';

let guildId = "";
let channelId = "";

let totalTokens = [];
let totalOwners = [];
let totalMetadatas = [];
let totalTransactions = [];
let curBlockTime = 0;

// const engineMints = JSON.parse(fs.readFileSync('token_list/Pixel_Racers_Engine_List.json'));
// console.log(engineMints)

// When the client is ready, run this code
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await initBot();
});

client.on('disconnected', function () {
  console.log('Disconnected!');
  process.exit(1); //exit node.js with an error
});

client.on('messageCreate', async (message) => {
  // Ignore the message if the prefix does not fit and if the client authored it.
  if (!message.content.startsWith(COMMAND_PREFIX) || message.author.bot) return;

  let args = message.content.slice(COMMAND_PREFIX.length).trim().split(/ +/);
  let command = args[0];
  args = args.slice(1);

  if (command == "test") {
  }
});

const initBot = async () => {
  const guild = await client.guilds.fetch(GUILD_ID);
  const channel = await guild.channels.fetch(CHANNEL_ID);

  let signatures;
  const connection = new Connection(clusterApiUrl(NETWORK), 'confirmed');
  const options = {};

  const marketplaceMap = {
    "MEisE1HzehtrDpAAT8PnLHjpSSkRYakotTuJRPjTpo8": "Magic Eden",
    "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K": "Magic Eden",
    "HZaWndaNWHFDd9Dhk5pqUUtsmoBCqzb1MLu3NAh1VX6B": "Alpha Art",
    "617jbWo616ggkDxvW1Le8pV38XLbVSyWY8ae6QUmGBAU": "Solsea",
    "CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz": "Solanart",
    "A7p8451ktDCHq5yYaHczeLMYsjRsAkzc3hCXcSrwYHU7": "Digital Eyes",
    "AmK5g2XcyptVLCFESBCJqoSfwV3znGoVYQnqEnaAZKWn": "Exchange Art",
  };

  signatures = await connection.getSignaturesForAddress(new PublicKey(PIXEL_RACERS_CARS_ID), {});
  if (signatures[0].signature) options.until = signatures[0].signature

  while (true) {
    try {
      signatures = await connection.getSignaturesForAddress(new PublicKey(PIXEL_RACERS_CARS_ID), options);
      console.log(signatures.length)
      if (signatures.length == 0) {
        continue;
      }

      for (let i = signatures.length - 1; i >= 0; i--) {
        try {
          let { signature } = signatures[i];
          const txn = await connection.getTransaction(signature);
          if (txn.meta && txn.meta.err != null) { continue; }

          const dateString = new Date(txn.blockTime * 1000).toLocaleString();
          const price = Math.abs((txn.meta.preBalances[0] - txn.meta.postBalances[0])) / LAMPORTS_PER_SOL;
          const accounts = txn.transaction.message.accountKeys;
          const marketplaceAccount = accounts[accounts.length - 1].toString();

          console.log(marketplaceAccount)
          if (marketplaceMap[marketplaceAccount]) {
            const metadata = await getMetadata(txn.meta.postTokenBalances[0].mint);
            if (!metadata) {
              console.log("couldn't get metadata");
              continue;
            }

            console.log([metadata.name, price, dateString, signature, metadata.image, marketplaceMap[marketplaceAccount]])

            const txn_embed = new MessageEmbed()
              .setColor(infoColor)
              .setTitle('Sale');

            txn_embed.setImage(metadata.image); //txn_metadata.metadata.data.url
            txn_embed.addField('Name', `${metadata.name}`, true);
            txn_embed.addField('Price', `${price} SOL`, true);
            txn_embed.addField('Date', `${dateString}`, true);
            txn_embed.addField('Explorer', `https://explorer.solana.com/tx/${signature}`, true);

            channel.send({
              embeds: [txn_embed]
            }).catch(error => {
              console.log(`Cannot send messages to this user`);
            });
          } else {
            console.log("not a supported marketplace sale");
          }
        } catch (err) {
          console.log("error while going through signatures: ", err);
          continue;
        }
      }

      if (signatures[0].signature) options.until = signatures[0].signature;
    } catch (err) {
      console.log("error fetching signatures: ", err);
    }
  }
}

const getMetadata = async (tokenPubKey) => {
  const connection = new Connection(clusterApiUrl(NETWORK), 'confirmed');

  try {
    const addr = await Metadata.getPDA(tokenPubKey)
    const resp = await Metadata.load(connection, addr);
    const { data } = await axios.get(resp.data.data.uri);

    return data;
  } catch (error) {
    console.log("error fetching metadata: ", error)
  }
}

try {
  // Login to Discord with your client's token
  client.login(PIXEL_RACERS_CARS_DISCORD_TOKEN);
} catch (e) {
  console.error('Client has failed to connect to discord.');
  process.exit(1);
}